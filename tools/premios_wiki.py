"""Completa la historia de los premios con las listas de Wikipedia (inglés) y añade fotos.

    python tools/premios_wiki.py            -> completa data/premios/*.json
    python tools/premios_wiki.py goya cesar -> solo esos premios

Wikidata tiene casi siempre los ganadores pero le faltan muchos nominados. Cada categoría
tiene en Wikipedia un artículo con tablas «año · ganador (resaltado) · nominados»: se leen
todas, se identifica cada película y persona (su id de Wikidata), se ajusta el año al de la
gala que usa Wikidata y se añade lo que faltaba. Además pone la foto de cada persona (P18).
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "premios"
UA = "Filora/1.0 (https://github.com/MCIFU/Filora; historia de premios)"
sys.path.insert(0, str(ROOT / "tools"))
from premios import compactar, es_de_pelicula  # noqa: E402


# tipos de Wikidata que cuentan como película o serie (como WD_FILM y WD_TV en app.js)
OBRAS = {"Q11424", "Q202866", "Q24869", "Q229390", "Q506240", "Q17517379", "Q93204", "Q20650540", "Q226730", "Q1261214", "Q336144",
         "Q110956863", "Q24862", "Q5398426", "Q1259759", "Q15416", "Q526877", "Q63952888", "Q117467246", "Q3464665", "Q21191270",
         "Q1366112", "Q581714", "Q7725310", "Q2431196", "Q18011172", "Q130232", "Q645928", "Q1257444", "Q319221", "Q157394"}


def api(host, **params):
    params.update(format="json")
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            time.sleep(5 * (i + 1))
    return {}


# ---------------------------------------------------------------- tablas de Wikipedia
def rejilla(tabla):
    """Filas de la tabla con las celdas que ocupan varias filas (rowspan) ya repartidas."""
    pend = {}  # columna -> [celda, filas que quedan]
    filas = []
    for tr in tabla.find_all("tr"):
        celdas = tr.find_all(["td", "th"], recursive=False)
        fila, col, i = [], 0, 0
        while i < len(celdas) or col in pend:
            if col in pend:
                c, n = pend[col]
                fila.append(c)
                pend[col][1] -= 1
                if pend[col][1] <= 0:
                    del pend[col]
                col += 1
                continue
            c = celdas[i]
            i += 1
            span = int(re.sub(r"\D", "", c.get("colspan", "1")) or 1)
            rs = int(re.sub(r"\D", "", c.get("rowspan", "1")) or 1)
            for _ in range(span):
                fila.append(c)
                if rs > 1:
                    pend[col] = [c, rs - 1]
                col += 1
        filas.append((tr, fila))
    return filas


def enlace(celda):
    for a in celda.find_all("a", href=True):
        h = a["href"]
        if h.startswith("/wiki/") and ":" not in h[6:] and not a.find_parent("sup"):
            return urllib.parse.unquote(h[6:].split("#")[0]).replace("_", " ")
    return None


def texto(celda):
    for s in celda.find_all("sup"):
        s.decompose()
    return re.sub(r"\s+", " ", celda.get_text(" ", strip=True)).strip(" ‡*†§¶")


def gana(tr, celda):
    estilo = (celda.get("style", "") + tr.get("style", "")).lower()
    return "background" in estilo or celda.find("b") is not None or "‡" in celda.get_text()


COL_PELI = re.compile(r"\b(film|title|motion picture|picture|series|program|programme|nominee film|work)\b", re.I)
COL_PERSONA = re.compile(r"\b(actor|actress|director|nominee|recipient|winner|writer|screenwriter|composer|cinematographer|name|performer|editor|designer|artist|laureate)s?\b", re.I)


def leer_articulo(titulo, persona):
    d = api("en.wikipedia.org", action="parse", page=titulo, prop="text", redirects=1)
    html = (d.get("parse") or {}).get("text", {}).get("*")
    if not html:
        return []
    sopa = BeautifulSoup(html, "html.parser")
    out = []
    for tabla in sopa.select("table.wikitable"):
        filas = rejilla(tabla)
        if not filas:
            continue
        cab = [texto(c).lower() for c in filas[0][1]]
        c_anio = next((i for i, h in enumerate(cab) if re.search(r"year|ceremony|edition|award", h)), 0)
        c_peli = next((i for i, h in enumerate(cab) if COL_PELI.search(h) and "original" not in h), None)
        c_pers = next((i for i, h in enumerate(cab) if COL_PERSONA.search(h)), None)
        objetivo = c_pers if persona else (c_peli if c_peli is not None else c_pers)
        if objetivo is None:
            continue
        anio_actual = None
        for tr, fila in filas[1:]:
            if len(fila) <= objetivo:
                continue
            m = re.search(r"\b(19[2-9]\d|20[0-4]\d)\b", texto(fila[c_anio])) if len(fila) > c_anio else None
            if m:
                anio_actual = int(m.group(1))
            if not anio_actual:
                continue
            cel = fila[objetivo]
            nombre = texto(cel)
            if not nombre or len(nombre) > 120 or re.match(r"^\d{4}", nombre):
                continue
            e = {"anio": anio_actual, "n": nombre, "w": enlace(cel), "g": gana(tr, cel)}
            if persona and c_peli is not None and len(fila) > c_peli and fila[c_peli] is not cel:
                e["obra"] = {"n": texto(fila[c_peli]), "w": enlace(fila[c_peli])}
            out.append(e)
    return out


# ---------------------------------------------------------------- identificar en Wikidata
def qids_de(titulos):
    out = {}
    titulos = sorted({t for t in titulos if t})
    for i in range(0, len(titulos), 50):
        d = api("en.wikipedia.org", action="query", titles="|".join(titulos[i:i + 50]), prop="pageprops", ppprop="wikibase_item", redirects=1).get("query", {})
        atras = {}
        for x in d.get("normalized", []) + d.get("redirects", []):
            atras[x["to"]] = atras.get(x["from"], x["from"])
        for pg in d.get("pages", {}).values():
            q = (pg.get("pageprops") or {}).get("wikibase_item")
            if q:
                out[atras.get(pg["title"], pg["title"])] = q
                out[pg["title"]] = q
        time.sleep(0.2)
    return out


def entidades(qids):
    out = {}
    qids = sorted(set(qids))
    for i in range(0, len(qids), 50):
        d = api("www.wikidata.org", action="wbgetentities", ids="|".join(qids[i:i + 50]), props="labels|claims|sitelinks", languages="es|en", sitefilter="enwiki")
        for q, e in (d.get("entities") or {}).items():
            cl = e.get("claims") or {}
            val = lambda p: [c["mainsnak"].get("datavalue", {}).get("value") for c in cl.get(p, []) if c.get("rank") != "deprecated" and c["mainsnak"].get("datavalue")]
            lab = (e.get("labels") or {})
            out[q] = {
                "n": (lab.get("es") or lab.get("en") or {}).get("value"),
                "h": any(isinstance(v, dict) and v.get("id") == "Q5" for v in val("P31")),
                "i": next((v for v in val("P345")), None),
                "f": next((v for v in val("P18")), None),
                "w": ((e.get("sitelinks") or {}).get("enwiki") or {}).get("title"),
                "obra": any(isinstance(v, dict) and v.get("id") in OBRAS for v in val("P31")),
            }
        time.sleep(0.2)
    return out


def carteles(titulos):
    out = {}
    titulos = sorted({t for t in titulos if t})
    for i in range(0, len(titulos), 50):
        d = api("en.wikipedia.org", action="query", titles="|".join(titulos[i:i + 50]), prop="pageimages", piprop="thumbnail", pithumbsize="300", pilicense="any", redirects=1).get("query", {})
        atras = {}
        for x in d.get("normalized", []) + d.get("redirects", []):
            atras[x["to"]] = atras.get(x["from"], x["from"])
        for pg in d.get("pages", {}).values():
            if "thumbnail" in pg:
                out[atras.get(pg["title"], pg["title"])] = pg["thumbnail"]["source"].split("?")[0]
        time.sleep(0.2)
    return out


# ---------------------------------------------------------------- completar un premio
def completar(clave, solo_fotos=False):
    ruta = DIR / f"{clave}.json"
    D = json.loads(ruta.read_text(encoding="utf-8"))
    print(f"{D['nombre']}…", flush=True)
    cats = D["categorias"]
    ent = entidades([c["id"] for c in cats])
    leidos = {}
    # artículos compartidos por varias categorías (p. ej. vestuario en blanco y negro / en color):
    # mezclarían ganadores de unas y otras, así que esas categorías se quedan con Wikidata
    arts = {c["id"]: (ent.get(c["id"]) or {}).get("w") for c in cats}
    final = {}
    titulos = [t for t in arts.values() if t]
    for i in range(0, len(titulos), 50):
        d = api("en.wikipedia.org", action="query", titles="|".join(titulos[i:i + 50]), redirects=1).get("query", {})
        r = {x["from"]: x["to"] for x in d.get("normalized", [])}
        r2 = {x["from"]: x["to"] for x in d.get("redirects", [])}
        for t in titulos[i:i + 50]:
            final[t] = r2.get(r.get(t, t), r.get(t, t))
    usos = Counter(final.get(t) for t in arts.values() if t)
    for c in ([] if solo_fotos else cats):
        art = arts.get(c["id"])
        if not art:
            continue
        if usos[final.get(art)] > 1:
            print(f"  {c['n']}: artículo compartido «{final.get(art)}», se mantiene Wikidata")
            continue
        persona = c["persona"] and not es_de_pelicula(c["n"])
        filas = leer_articulo(art, persona)
        if filas:
            leidos[c["id"]] = (persona, filas)
        print(f"  {c['n']}: {len(filas)} filas de «{art}»")
        time.sleep(0.4)
    # identificar todo lo enlazado
    print("  identificando películas y personas…", flush=True)
    tit = [f["w"] for _, F in leidos.values() for f in F] + [f["obra"]["w"] for _, F in leidos.values() for f in F if f.get("obra")]
    q_de = qids_de(tit)
    info = entidades(q_de.values())
    # desfase entre el año de la tabla y el de la gala en Wikidata (por categoría; si no, el del premio)
    def desfase(cid, filas):
        wd = Counter()
        for anio, cats_a in D["ediciones"].items():
            for e in cats_a.get(cid, []):
                if e.get("g"):
                    wd[e["q"]] = int(anio)
        dif = Counter(wd[q_de.get(f["w"])] - f["anio"] for f in filas if f["g"] and q_de.get(f["w"]) in wd)
        return dif.most_common(1)[0][0] if dif else None
    offs = {cid: desfase(cid, F) for cid, (_, F) in leidos.items()}
    general = Counter(o for o in offs.values() if o is not None).most_common(1)
    general = general[0][0] if general else 0
    añadidos = 0
    for cid, (persona, filas) in leidos.items():
        off = offs[cid] if offs[cid] is not None else general
        por_anio = {}
        for f in filas:
            q = q_de.get(f["w"])
            x = info.get(q, {}) if q else {}
            e = {"n": x.get("n") or f["n"], "q": q or ("w:" + f["n"])}
            if f["g"]:
                e["g"] = 1
            if x.get("h"):
                e["h"] = 1
            if x.get("i"):
                e["i"] = x["i"]
            if x.get("f"):
                e["f"] = x["f"]
            if persona and not x.get("h") and q:
                continue  # en categorías de personas, solo personas
            if not persona and q and not x.get("obra"):
                continue  # en categorías de películas, solo películas o series (fuera «One-Reel», géneros…)
            if not persona and not q:
                continue  # sin identificar no se puede enlazar ni comprobar
            if f.get("obra"):
                qo = q_de.get(f["obra"]["w"])
                xo = info.get(qo, {}) if qo else {}
                e["o"] = {"t": xo.get("n") or f["obra"]["n"], "q": qo or ("w:" + f["obra"]["n"])}
                if xo.get("i"):
                    e["o"]["i"] = xo["i"]
                e["o"]["_w"] = xo.get("w")
            if not persona:
                e["_w"] = x.get("w")
            por_anio.setdefault(str(f["anio"] + off), []).append(e)
        for anio, L in por_anio.items():
            # varias filas de la misma entrada (p. ej. un actor con dos películas): una sola
            unicas = {}
            for e in L:
                k = e["q"]
                unicas[k] = {**unicas.get(k, {}), **e, **({"g": 1} if e.get("g") or unicas.get(k, {}).get("g") else {})}
            nuevas = list(unicas.values())
            if not any(e.get("g") for e in nuevas):
                continue
            previas = D["ediciones"].setdefault(anio, {}).get(cid, [])
            if len(nuevas) >= len(previas):
                previo = {p["q"]: p for p in previas}
                for e in nuevas:  # conserva carteles ya conocidos
                    p = previo.get(e["q"]) or {}
                    if p.get("p") and not e.get("p"):
                        e["p"] = p["p"]
                añadidos += len(nuevas) - len(previas)
                D["ediciones"][anio][cid] = nuevas
    # carteles de las películas nuevas y fotos de todas las personas que falten
    falta_w = [e.get("_w") for cats_a in D["ediciones"].values() for L in cats_a.values() for e in L if e.get("_w")]
    falta_w += [e["o"].get("_w") for cats_a in D["ediciones"].values() for L in cats_a.values() for e in L if e.get("o") and e["o"].get("_w")]
    print("  carteles y fotos…", flush=True)
    cart = carteles(falta_w)
    sin_foto = [e["q"] for cats_a in D["ediciones"].values() for L in cats_a.values() for e in L if e.get("h") and not e.get("f") and str(e["q"]).startswith("Q")]
    fotos = entidades(sin_foto) if sin_foto else {}
    for cats_a in D["ediciones"].values():
        for L in cats_a.values():
            for e in L:
                for x in (e, e.get("o")):
                    if x and "_w" in x:
                        w = x.pop("_w")
                        if w and cart.get(w) and not x.get("p"):
                            x["p"] = cart[w]
                if e.get("h") and not e.get("f") and fotos.get(e["q"], {}).get("f"):
                    e["f"] = fotos[e["q"]]["f"]
                e["q"] = e["q"] if not str(e["q"]).startswith("w:") else e["q"][:60]
    anios = sorted(int(a) for a in D["ediciones"] if D["ediciones"][a])
    D["desde"], D["hasta"] = anios[0], anios[-1]
    D = compactar(D)
    ruta.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(len(L) for c in D["ediciones"].values() for L in c.values())
    print(f"  {D['nombre']}: +{añadidos} candidaturas · total {total} · desfase de años {general}")


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for clave in (args or ["oscar", "globo", "emmy", "bafta", "cannes", "cesar", "europeo", "feroz", "goya"]):
        completar(clave, solo_fotos="--solo-fotos" in sys.argv)


if __name__ == "__main__":
    main()

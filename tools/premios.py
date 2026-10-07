"""Historia completa de los grandes premios del cine (y los Emmy) desde Wikidata.

    python tools/premios.py            -> data/premios/<premio>.json (los 9)
    python tools/premios.py oscar goya -> solo esos

Por cada premio: sus categorías y, año a año, ganadores y nominados (película o persona,
y para las personas la película por la que fueron candidatas), con id de IMDb y cartel.
Se guarda en el repositorio (datos públicos) y la web lo publica en app/data/premios/.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "premios"
UA = "Filora/1.0 (https://github.com/MCIFU/Filora; historia de premios)"

PREMIOS = {  # orden de la página
    "oscar": ("Q19020", "Óscar"),
    "globo": ("Q1011547", "Globo de Oro"),
    "emmy": ("Q1044427", "Emmy"),
    "bafta": ("Q732997", "BAFTA"),
    "cannes": ("Q28444913", "Cannes"),
    "cesar": ("Q174389", "César"),
    "europeo": ("Q223740", "Cine Europeo"),
    "feroz": ("Q15728786", "Feroz"),
    "goya": ("Q212828", "Goya"),
}


def sparql(q, intentos=4):
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q)
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))["results"]["bindings"]
        except Exception as e:
            print("    reintento", i + 1, e)
            time.sleep(8 * (i + 1))
    return []


def limpio(nombre):
    return re.sub(r"^(Anexo|Annex)\s*:\s*", "", nombre).strip()


def categorias(raiz):
    q = f"""SELECT ?cat ?catLabel (COUNT(DISTINCT ?x) AS ?n) WHERE {{
      {{ ?cat wdt:P31 wd:{raiz} }} UNION {{ ?cat wdt:P279 wd:{raiz} }} UNION {{ ?cat wdt:P361 wd:{raiz} }}
      ?x p:P1411|p:P166 ?s . ?s ps:P1411|ps:P166 ?cat .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }} }} GROUP BY ?cat ?catLabel ORDER BY DESC(?n)"""
    return [(b["cat"]["value"].split("/")[-1], limpio(b["catLabel"]["value"]), int(b["n"]["value"])) for b in sparql(q)]


def candidaturas(cat):
    q = f"""SELECT ?x ?xLabel ?tipo ?fecha ?fc ?obra ?obraLabel ?humano ?imdb ?imdbObra ?enwiki ?enwikiObra WHERE {{
      {{ ?x p:P1411 ?s . ?s ps:P1411 wd:{cat} . BIND("n" AS ?tipo) }} UNION {{ ?x p:P166 ?s . ?s ps:P166 wd:{cat} . BIND("g" AS ?tipo) }}
      OPTIONAL {{ ?s pq:P585 ?fecha }}
      OPTIONAL {{ ?s pq:P805 ?cer . ?cer wdt:P585 ?fc }}
      OPTIONAL {{ ?s pq:P1686 ?obra . OPTIONAL {{ ?obra wdt:P345 ?imdbObra }} OPTIONAL {{ ?enwikiObra schema:about ?obra; schema:isPartOf <https://en.wikipedia.org/> }} }}
      OPTIONAL {{ ?x wdt:P31 wd:Q5 . BIND(1 AS ?humano) }}
      OPTIONAL {{ ?x wdt:P345 ?imdb }}
      OPTIONAL {{ ?enwiki schema:about ?x; schema:isPartOf <https://en.wikipedia.org/> }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }} }}"""
    return sparql(q)


def carteles(titulos):
    out = {}
    titulos = sorted(set(t for t in titulos if t))
    for i in range(0, len(titulos), 50):
        q = urllib.parse.urlencode({"action": "query", "titles": "|".join(titulos[i:i + 50]), "prop": "pageimages", "piprop": "thumbnail",
                                    "pithumbsize": "300", "pilicense": "any", "format": "json", "redirects": 1})
        try:
            with urllib.request.urlopen(urllib.request.Request(f"https://en.wikipedia.org/w/api.php?{q}", headers={"User-Agent": UA}), timeout=60) as r:
                d = json.loads(r.read().decode("utf-8"))["query"]
        except Exception:
            continue
        atras = {}
        for x in d.get("normalized", []) + d.get("redirects", []):
            atras[x["to"]] = atras.get(x["from"], x["from"])
        for pg in d.get("pages", {}).values():
            if "thumbnail" in pg:
                out[atras.get(pg["title"], pg["title"])] = pg["thumbnail"]["source"].split("?")[0]
        time.sleep(0.3)
    return out


def wiki_titulo(url):
    return urllib.parse.unquote(url.split("/wiki/")[-1]).replace("_", " ") if url else None


def premio(clave):
    raiz, nombre = PREMIOS[clave]
    print(f"{nombre}…")
    cats = [c for c in categorias(raiz) if c[2] >= 2]
    categorias_out, ediciones, titulos = [], {}, []
    for cid, cnombre, n in cats:
        filas = candidaturas(cid)
        vistos = {}
        humanos = 0
        for b in filas:
            v = lambda k: b[k]["value"] if k in b else None
            fecha = v("fecha") or v("fc")
            if not fecha:
                continue
            anio = int(fecha[:4])
            xq = v("x").split("/")[-1]
            nom = v("xLabel")
            if re.match(r"^Q\d+$", nom or ""):
                continue
            k = (xq, anio, v("obra"))
            e = vistos.get(k) or {"n": nom, "q": xq}
            if v("tipo") == "g":
                e["g"] = 1
            if v("humano"):
                e["h"] = 1
            if v("imdb"):
                e["i"] = v("imdb")
            if v("obra"):
                e["o"] = {"t": v("obraLabel"), "q": v("obra").split("/")[-1]}
                if v("imdbObra"):
                    e["o"]["i"] = v("imdbObra")
                e["o"]["_w"] = wiki_titulo(v("enwikiObra"))
                titulos.append(e["o"]["_w"])
            if not v("humano"):
                e["_w"] = wiki_titulo(v("enwiki"))
                titulos.append(e["_w"])
            vistos[k] = e
        for (xq, anio, _), e in vistos.items():
            humanos += 1 if e.get("h") else 0
            ediciones.setdefault(str(anio), {}).setdefault(cid, []).append(e)
        if vistos:
            categorias_out.append({"id": cid, "n": cnombre, "persona": humanos > len(vistos) / 2, "total": len(vistos)})
        print(f"  {cnombre}: {len(vistos)} candidaturas")
        time.sleep(1)
    print(f"  carteles de {len(set(titulos))} películas…")
    cart = carteles(titulos)
    for cats_anio in ediciones.values():
        for L in cats_anio.values():
            for e in L:
                for x in (e, e.get("o")):
                    if x and "_w" in x:
                        w = x.pop("_w")
                        if cart.get(w):
                            x["p"] = cart[w]
                L.sort(key=lambda e: (not e.get("g"), e["n"]))
    # orden de categorías: la de mejor película primero, luego por volumen
    principal = lambda c: 0 if re.search(r"mejor película|palma de oro|best film|best picture|mejor programa|mejor serie", c["n"], re.I) else 1
    categorias_out.sort(key=lambda c: (principal(c), -c["total"]))
    anios = sorted(int(a) for a in ediciones)
    datos = compactar({"id": clave, "nombre": nombre, "wikidata": raiz, "desde": anios[0] if anios else None, "hasta": anios[-1] if anios else None,
             "categorias": categorias_out, "ediciones": ediciones})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{clave}.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(len(L) for c in ediciones.values() for L in c.values())
    print(f"  {nombre}: {len(categorias_out)} categorías, {len(anios)} años ({datos['desde']}–{datos['hasta']}), {total} candidaturas")


def es_de_pelicula(nombre):
    return bool(re.search(r"pel[ií]cula|palma|film|documental|programa|serie|cortometraje|largometraje|corto|animaci", nombre, re.I)) and         not re.search(r"actor|actriz|direc|interpret|gui[oó]n|m[uú]sica|fotograf|montaje|canci", nombre, re.I)


def compactar(datos):
    """Una entrada por película en las categorías de películas (Wikidata añade a los productores)
    y solo personas en las de personas. Reduce mucho el tamaño (el Óscar, de 4,4 a ~1 MB)."""
    titulo = lambda t: re.sub(r"\s*\((?:película|film|serie)[^)]*\)$", "", t or "", flags=re.I)
    for c in datos["categorias"]:
        if es_de_pelicula(c["n"]):
            c["persona"] = False
    tipo = {c["id"]: c["persona"] for c in datos["categorias"]}
    for cats in datos["ediciones"].values():
        for cid, L in list(cats.items()):
            for e in L:
                e["n"] = titulo(e["n"])
                if e.get("o"):
                    e["o"]["t"] = titulo(e["o"].get("t"))
            if tipo[cid]:
                h = [e for e in L if e.get("h")]
                cats[cid] = h or L
                continue
            pelis = {}
            for e in L:
                f = e.get("o") if e.get("h") else e
                if not f or not f.get("q") or not (f.get("t") if e.get("h") else f.get("n")):
                    continue
                x = {"n": f.get("t") if e.get("h") else f["n"], "q": f["q"]}
                for k in ("i", "p"):
                    if f.get(k):
                        x[k] = f[k]
                k = re.sub(r"\W", "", x["n"].lower())
                y = pelis.get(k, {})
                pelis[k] = {**x, **{kk: vv for kk, vv in y.items() if vv}, **({"g": 1} if e.get("g") or y.get("g") else {})}
            cats[cid] = sorted(pelis.values(), key=lambda x: (not x.get("g"), x["n"]))
    return datos


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if sys.argv[1:2] == ["--compactar"]:  # recompacta los ya descargados sin volver a Wikidata
        for f in OUT.glob("*.json"):
            d = compactar(json.loads(f.read_text(encoding="utf-8")))
            f.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            print(f.name, f.stat().st_size)
        return
    for clave in (sys.argv[1:] or list(PREMIOS)):
        premio(clave)


if __name__ == "__main__":
    main()

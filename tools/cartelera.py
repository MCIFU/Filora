"""Actualiza sesiones de tus cines y próximos estrenos en España desde FilmAffinity.

    python tools/cartelera.py            -> data/cartelera.json + data/estrenos.json

Se ejecuta a diario en GitHub Actions (.github/workflows/cartelera.yml) y
también desde la app local (botón «Actualizar» en Estrenos). Solo usa la
biblioteca estándar. Si FilmAffinity falla, conserva los datos anteriores.
"""
import html
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EST_PATH = ROOT / "data" / "estrenos.json"
CART_PATH = ROOT / "data" / "cartelera.json"
CACHE_PATH = ROOT / "data" / "fa_cache.json"   # fichas de FilmAffinity ya consultadas (evita repetir peticiones)
FA = "https://www.filmaffinity.com/es/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"

MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8,
         "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12}
GEN_FA = {"Acción": "Acción", "Animación": "Animación", "Aventuras": "Aventura", "Bélico": "Bélico",
          "Ciencia ficción": "Ciencia ficción", "Comedia": "Comedia", "Documental": "Documental",
          "Drama": "Drama", "Fantástico": "Fantasía", "Intriga": "Misterio", "Romance": "Romance",
          "Terror": "Terror", "Thriller": "Thriller", "Western": "Western", "Musical": "Musical",
          "Cine negro": "Crimen", "Infantil": "Familiar", "Cine familiar": "Familiar"}


def get(url, retries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 429 or i == retries - 1:
                raise
            time.sleep(3 * (i + 1))
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(3 * (i + 1))


def txt(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def poster(block):
    m = re.search(r'(https://pics\.filmaffinity\.com/[^" ]+-mmed\.jpg)', block)
    return m.group(1) if m else None


def credits(block, cls):
    m = re.search(r'class="(?:[^"]* )?' + cls + r'">(.*?)</div></div>', block, re.S)
    return [txt(x) for x in re.findall(r'title="([^"]+)"', m.group(1))] if m else []


# ------------------------------------------------------------------ sesiones
def cine_sesiones(fa_id):
    """Películas y sesiones de un cine (página de horarios de FilmAffinity)."""
    h = get(f"{FA}theater-showtimes.php?id={fa_id}")
    cards = re.split(r'<div class="row movie-card movie-card-\d+" data-movie-id="', h)[1:]
    out = []
    for c in cards:
        mid = c.split('"', 1)[0]
        titulo = txt((re.search(r'class="d-none d-md-inline-block"[^>]*>(.*?)</a>', c, re.S) or [None, ""])[1])
        anio = re.search(r'mc-year[^>]*>(\d{4})', c)
        pais = re.search(r'class="nflag"[^>]*alt="([^"]+)"', c)
        versiones = []
        for v in re.split(r'<div class="movie-showtimes-n', c)[1:]:
            nombre = txt((re.search(r'<span class="fs-5">(.*?)</span>', v, re.S) or [None, ""])[1])
            dias = {}
            for d, body in re.findall(r'data-sess-date="([\d-]+)"(.*?)(?=data-sess-date=|$)', v, re.S):
                for sala, url, hora in re.findall(r'<a class="btn[^"]*"[^>]*title="([^"]*)"[^>]*href="([^"]*)"[^>]*>\s*(\d{1,2}:\d{2})', body):
                    dias.setdefault(d, []).append({"hora": hora, "sala": html.unescape(sala), "url": html.unescape(url)})
            if dias:
                versiones.append({"nombre": nombre, "dias": dias})
        if versiones:
            f = ficha(mid)
            out.append({"generos": f.get("generos") or [], "fa": mid, "titulo": titulo, "anio": int(anio.group(1)) if anio else None,
                        "pais": pais.group(1) if pais else None, "director": " / ".join(credits(c, "mc-director")[:2]),
                        "reparto": ", ".join(credits(c, "mc-cast")[:3]), "poster": poster(c) or f.get("poster"),
                        "sinopsis": f.get("sinopsis"), "versiones": versiones})
    return out


def actualizar_cartelera(cines):
    res = {"actualizado": datetime.now().isoformat(timespec="minutes"), "fuente": "FilmAffinity", "cines": []}
    for c in cines:
        if not c.get("fa_id"):
            continue
        try:
            pelis = cine_sesiones(c["fa_id"])
            res["cines"].append({"id": c["id"], "nombre": c["nombre"], "peliculas": pelis})
            print(f"  {c['nombre']}: {len(pelis)} películas en cartelera")
        except Exception as e:
            print(f"  {c['nombre']}: error {e}")
        time.sleep(2)
    return res


# ------------------------------------------------------------------ estrenos
def generos_fa():
    h = get(f"{FA}catbygenre.php?id=upc_th_es")
    gm = {}
    for s in re.split(r'<a name="[A-Z0-9]+"></a>', h)[1:]:
        name = txt(re.search(r"<div>([^<]+)</div>", s).group(1))
        g = GEN_FA.get(name)
        for mid in set(re.findall(r'data-movie-id="(\d+)"', s)):
            if g and g not in gm.setdefault(mid, []):
                gm[mid].append(g)
    return gm


def detalles_fa():
    """Director, país, sinopsis y fecha exacta de la vista «por fecha de lanzamiento»."""
    h = get(f"{FA}rdcat.php?id=upc_th_es")
    det = {}
    for fecha, body in re.findall(r'id="date-([\d-]+)"(.*?)(?=id="date-|$)', h, re.S):
        for c in re.split(r'<div class="row movie-card movie-card-\d+" data-movie-id="', body)[1:]:
            mid = c.split('"', 1)[0]
            pais = re.search(r'class="nflag"[^>]*alt="([^"]+)"', c)
            syn = re.search(r'class="text-secondary synop"[^>]*>(.*?)(?:&nbsp;|<span)', c, re.S)
            dur = re.search(r"(\d+) min\.", c)
            det[mid] = {"fecha": fecha, "director": " / ".join(credits(c, "mc-director")[:2]) or None,
                        "reparto": ", ".join(credits(c, "mc-cast")[:3]) or None, "pais": pais.group(1) if pais else None,
                        "sinopsis": txt(syn.group(1)).rstrip(". ") + "…" if syn else None,
                        "duracion": int(dur.group(1)) if dur else None}
    return det


_cache = None


def cache():
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            _cache = {}
    return _cache


def ficha(mid, limite=[80]):
    """Ficha de FilmAffinity con caché en disco (máx. 80 descargas nuevas por ejecución)."""
    c = cache()
    if mid in c:
        return c[mid]
    if limite[0] <= 0:
        return {}
    limite[0] -= 1
    try:
        d = ficha_fa(mid)
    except urllib.error.HTTPError as e:
        if e.code == 429:  # FilmAffinity pide calma: no seguimos pidiendo fichas en esta ejecución
            limite[0] = 0
        return {}
    except Exception:
        return {}
    c[mid] = d
    time.sleep(1.5)
    return d


def ficha_fa(mid):
    """Datos básicos de la ficha de una película."""
    h = get(f"{FA}film{mid}.html")
    dd = lambda k: (re.search(rf"<dt>{k}</dt>\s*<dd[^>]*>(.*?)</dd>", h, re.S) or [None, ""])[1]
    syn = txt(re.sub(r"\(FILMAFFINITY\)", "", dd("Sinopsis")))
    return {"director": " / ".join(txt(x) for x in re.findall(r'itemprop="name">([^<]+)', dd("Dirección"))[:2]) or None,
            "pais": txt(re.sub(r"<img[^>]*>", "", dd("País"))) or None,
            "sinopsis": (syn[:260].rsplit(" ", 1)[0] + "…") if len(syn) > 260 else (syn or None),
            "original": txt(dd("Título original")) or None,
            "generos": [g for g in dict.fromkeys(GEN_FA.get(txt(x)) for x in re.findall(r'moviegenre\.php[^>]*>(.*?)</a>', dd("Género"))) if g][:3],
            "poster": (re.search(r'<meta property="og:image" content="([^"]+)"', h) or [None, None])[1]}


def lista_fa():
    h = get(f"{FA}cat_upc_th_es.html")
    hoy = date.today()
    out = []
    for mid, dia, mes, titulo in re.findall(
            r'data-movie-id="(\d+)"[\s\S]*?release-text">(\d+)<br>([^<]*)</small>[\s\S]*?movie-title[^>]*>\s*([^<]+?)\s*</a>', h):
        m = MESES.get(mes.strip(". ").lower()[:4].rstrip("."), MESES.get(mes.strip(". ").lower()[:3]))
        if not m:
            continue
        y = hoy.year + (1 if m < hoy.month - 1 else 0)
        blk = h[h.find(f'data-movie-id="{mid}"'):][:1500]
        out.append({"fa": mid, "titulo": html.unescape(titulo), "fecha": f"{y}-{m:02d}-{int(dia):02d}", "poster": poster(blk)})
    return out


def actualizar_estrenos(est):
    lista = lista_fa()
    if len(lista) < 10:
        raise RuntimeError("FilmAffinity devolvió muy pocos estrenos")
    gen, det = generos_fa(), detalles_fa()
    viejos = {norm(e["titulo"]): e for e in est.get("estrenos", [])}
    nuevos, fichas = [], 0
    for x in lista:
        d = det.get(x["fa"], {})
        if not d:  # los que no están en la vista por fecha: ficha individual (con caché)
            d = ficha(x["fa"])
        prev = viejos.get(norm(x["titulo"]), {})
        e = {"fecha": d.get("fecha") or x["fecha"], "titulo": x["titulo"],
             "original": d.get("original") or prev.get("original"),
             "director": d.get("director") or prev.get("director"),
             "generos": gen.get(x["fa"]) or prev.get("generos") or [],
             "pais": d.get("pais") or prev.get("pais"), "reparto": d.get("reparto") or prev.get("reparto"),
             "sinopsis": d.get("sinopsis") or prev.get("sinopsis"), "duracion": d.get("duracion"),
             "poster": x.get("poster") or prev.get("poster"), "fa": x["fa"],
             "saga": prev.get("saga"), "destacado": prev.get("destacado", False)}
        if prev.get("ids"):
            e["ids"] = prev["ids"]
        nuevos.append({k: v for k, v in e.items() if v not in (None, "", [])})
    # los que FA aún no lista (más de ~2 meses vista) se conservan del calendario anterior
    limite = max(e["fecha"] for e in nuevos)
    vistos = {norm(e["titulo"]) for e in nuevos}
    lejanos = [e for e in est.get("estrenos", []) if e["fecha"] > limite and norm(e["titulo"]) not in vistos]
    est["estrenos"] = sorted(nuevos + lejanos, key=lambda e: (e["fecha"], e["titulo"]))
    est["actualizado"] = date.today().isoformat()
    est["fuentes"] = ["FilmAffinity (próximos estrenos en España)"]
    print(f"  Estrenos: {len(nuevos)} de FilmAffinity + {len(lejanos)} más adelante")
    return est


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    est = json.loads(EST_PATH.read_text(encoding="utf-8"))
    print("Cartelera de tus cines…")
    cart = actualizar_cartelera(est.get("cines", []))
    if any(c["peliculas"] for c in cart["cines"]):
        CART_PATH.write_text(json.dumps(cart, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Próximos estrenos…")
    try:
        est = actualizar_estrenos(est)
        EST_PATH.write_text(json.dumps(est, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception as e:
        print("  No se pudieron actualizar los estrenos:", e)
    CACHE_PATH.write_text(json.dumps(cache(), ensure_ascii=False, indent=0), encoding="utf-8")


if __name__ == "__main__":
    main()

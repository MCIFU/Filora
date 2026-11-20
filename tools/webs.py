"""Consultas a otras webs desde el PC, sin pasar por Vercel (mismo criterio que lib/notas.mjs y lib/plataformas.mjs).

- IMDb: buscador público de sugerencias (películas, personas y carteles), sin clave.
- Notas: FilmAffinity, Letterboxd y SensaCine leídas de sus fichas públicas.
- Taquilla: Box Office Mojo (tools/taquilla.py).
- Plataformas en España: JustWatch (GraphQL público, sin clave).

server.py las sirve en /api/imdb, /api/poster, /api/notas, /api/taquilla y /api/plataformas,
con una caché en memoria para no repetir consultas.
"""
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import taquilla

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"


def _get(url, timeout=10, intentos=2, cabeceras=None):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9,en;q=0.8", **(cabeceras or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i + 1 >= intentos:
                raise
            time.sleep(1.2)


def _num(s):
    return None if s is None else float(str(s).replace(",", "."))


# ---------------------------------------------------------------- caché en memoria
_cache = {}


def cacheado(clave, horas, fn):
    t = _cache.get(clave)
    if t and time.time() - t[0] < horas * 3600:
        return t[1]
    v = fn()
    _cache[clave] = (time.time(), v)
    if len(_cache) > 3000:  # que no crezca sin fin
        for k in sorted(_cache, key=lambda k: _cache[k][0])[:1000]:
            _cache.pop(k, None)
    return v


# ---------------------------------------------------------------- IMDb
def _cartel(url, tam="SX342"):
    return re.sub(r"\._V1_.*\.jpg$", f"._V1_{tam}.jpg", url) if url else None


def sugerencias_imdb(q):
    q = str(q or "").strip().lower()[:80]
    if len(q) < 2:
        return []
    try:
        d = json.loads(_get(f"https://v3.sg.media-imdb.com/suggestion/x/{urllib.parse.quote(q)}.json", timeout=6, intentos=1))
    except Exception:
        return []
    return d.get("d") or []


def _es_peli(x):
    return str(x.get("id", "")).startswith("tt") and (not x.get("qid") or re.search(r"movie|tvMovie|short|video", x["qid"], re.I))


def limpiar_imdb(d):
    return [{"imdb": x["id"], "titulo": x.get("l"), "anio": x.get("y"), "reparto": x.get("s") or "",
             "poster": _cartel((x.get("i") or {}).get("imageUrl"))} for x in d if _es_peli(x)][:8]


OFICIOS = {"Director": "Dirección", "Actor": "Actor", "Actress": "Actriz", "Writer": "Guion", "Producer": "Producción",
           "Composer": "Música", "Cinematographer": "Fotografía", "Editor": "Montaje"}


def personas_imdb(d):
    out = []
    for x in d:
        if not str(x.get("id", "")).startswith("nm"):
            continue
        oficio, *obra = str(x.get("s") or "").split(", ")
        out.append({"imdb": x["id"], "nombre": x.get("l"), "desc": " · ".join(v for v in [OFICIOS.get(oficio, oficio), ", ".join(obra)] if v),
                    "foto": _cartel((x.get("i") or {}).get("imageUrl"), "UX240")})
    return out[:8]


def buscar_imdb(q, todo=False):
    d = cacheado(f"imdb|{str(q).lower()}", 24, lambda: sugerencias_imdb(q))
    return {"pelis": limpiar_imdb(d), "personas": personas_imdb(d)} if todo else limpiar_imdb(d)


def poster_imdb(imdb=None, titulo=None, anio=None):
    exacto = imdb if imdb and re.fullmatch(r"tt\d+", imdb) else None
    q = exacto or str(titulo or "").strip().lower()[:80]
    if not q:
        return {}
    d = cacheado(f"imdb|{q}", 24, lambda: sugerencias_imdb(q))
    anio = int(anio) if str(anio or "").isdigit() else None
    pelis = [x for x in d if _es_peli(x) and (x.get("i") or {}).get("imageUrl")]
    m = next((x for x in pelis if x["id"] == exacto), None) if exacto else next((x for x in pelis if not anio or not x.get("y") or abs(x["y"] - anio) <= 1), None)
    return {"poster": _cartel(m["i"]["imageUrl"]), "imdb": m["id"]} if m else {}


# ---------------------------------------------------------------- notas en otras webs
def leer_fa(h):
    v = re.search(r'itemprop="ratingValue" content="([\d.,]+)"', h) or re.search(r'id="movie-rat-avg"[^>]*>\s*([\d.,]+)', h)
    n = re.search(r'itemprop="ratingCount" content="(\d+)"', h) or re.search(r'id="movie-count-rat"[^>]*>[^\d]*([\d.]+)', h)
    return {"v": _num(v.group(1)), "n": int(n.group(1).replace(".", "")) if n else None} if v else None


def leer_lb(h):
    v = re.search(r'"ratingValue":([\d.]+)', h)
    n = re.search(r'"ratingCount":(\d+)', h)
    return {"v": round(_num(v.group(1)), 2), "n": int(n.group(1)) if n else None} if v else None


def leer_sc(h):
    t = re.sub(r"<style[\s\S]*?</style>|<script[\s\S]*?</script>", " ", h[:400000])
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))
    m, u = re.search(r"\bMedios (\d,\d)\b", t), re.search(r"\bUsuarios (\d,\d)\b", t)
    return {"prensa": _num(m.group(1)) if m else None, "usuarios": _num(u.group(1)) if u else None} if m or u else None


def notas_externas(fa=None, lb=None, ac=None):
    """{fa:{v,n}, lb:{v,n}, sc:{prensa,usuarios}} con lo que responda; las webs que fallan se omiten."""
    fa = fa if fa and re.fullmatch(r"\d{3,7}", str(fa)) else None
    lb = lb if lb and re.fullmatch(r"[a-z0-9-]{1,120}", str(lb)) else None
    ac = ac if ac and re.fullmatch(r"\d{2,10}", str(ac)) else None
    tareas = {k: v for k, v in {
        "fa": fa and (f"https://www.filmaffinity.com/es/film{fa}.html", leer_fa),
        "lb": lb and (f"https://letterboxd.com/film/{lb}/", leer_lb),
        "sc": ac and (f"https://www.sensacine.com/peliculas/pelicula-{ac}/", leer_sc),
    }.items() if v}

    def una(par):
        url, leer = par
        try:
            return leer(_get(url, timeout=10))
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=3) as ex:
        res = dict(zip(tareas, ex.map(una, tareas.values())))
    return {k: v for k, v in res.items() if v}


def notas(fa=None, lb=None, ac=None):
    clave = f"notas|{fa}|{lb}|{ac}"
    out = cacheado(clave, 24, lambda: notas_externas(fa, lb, ac))
    if len(out) < len([x for x in (fa, lb, ac) if x]):  # incompleta: se reintenta pronto
        _cache[clave] = (time.time() - 24 * 3600 + 300, out)
    return out


# ---------------------------------------------------------------- taquilla
def taquilla_imdb(imdb):
    if not re.fullmatch(r"tt\d+", str(imdb or "")):
        return {}
    return cacheado(f"taq|{imdb}", 24 * 7, lambda: {k: v for k, v in (taquilla.consultar(imdb) or {}).items() if v})


# ---------------------------------------------------------------- plataformas (JustWatch)
TIPOS = {"FLATRATE": "suscripcion", "FREE": "gratis", "ADS": "gratis", "RENT": "alquiler", "BUY": "compra"}
ORDEN = ["suscripcion", "gratis", "alquiler", "compra"]


def _sin_acentos(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def elegir_ofertas(edges, titulo=None, anio=None):
    nodos = [e.get("node") for e in edges or [] if (e.get("node") or {}).get("content")]
    t = _sin_acentos(titulo)
    cerca = lambda x: not anio or not x["content"].get("originalReleaseYear") or abs(x["content"]["originalReleaseYear"] - anio) <= 1
    n = next((x for x in nodos if cerca(x) and (not t or _sin_acentos(x["content"].get("title")) == t)), None) or next((x for x in nodos if cerca(x)), None)
    if not n:
        return []
    vistas = {}
    for o in n.get("offers") or []:
        tipo = TIPOS.get(o.get("monetizationType"))
        nombre = re.sub(r" (Standard with Ads|with Ads|Amazon Channel|Apple TV Channel)$", "", str((o.get("package") or {}).get("clearName") or ""), flags=re.I).strip()
        if tipo and nombre:
            vistas.setdefault(f"{nombre}|{tipo}", {"plataforma": nombre, "tipo": tipo})
    return sorted(vistas.values(), key=lambda x: ORDEN.index(x["tipo"]))


def plataformas(titulo, anio=None):
    if not titulo:
        return []
    anio = int(anio) if str(anio or "").isdigit() else None

    def pedir():
        query = ('query($q:String!){popularTitles(country:ES,first:5,filter:{searchQuery:$q,objectTypes:[MOVIE]}){edges{node{... on MovieOrShow{'
                 'content(country:ES,language:"es"){title originalReleaseYear} offers(country:ES,platform:WEB){monetizationType package{clearName}}}}}}}')
        req = urllib.request.Request("https://apis.justwatch.com/graphql", method="POST",
                                     data=json.dumps({"query": query, "variables": {"q": str(titulo)[:100]}}).encode(),
                                     headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read().decode("utf-8"))
        return elegir_ofertas((((d.get("data") or {}).get("popularTitles")) or {}).get("edges"), titulo, anio)
    return cacheado(f"plat|{titulo}|{anio}", 24, pedir)

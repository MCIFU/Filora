"""Cliente mínimo de Wikipedia + Wikidata (sin claves de API).

Sirve para:
  - enriquecer películas/series con póster e IDs de IMDb, FilmAffinity, Rotten
    Tomatoes, Letterboxd, TMDb y AlloCiné/SensaCine
  - buscar películas nuevas y autocompletar sus datos al añadirlas
"""
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Filora/1.0 (https://github.com/MCIFU/filora; uso personal) Python-urllib/3.12"

FILM_TYPES = {"Q11424", "Q202866", "Q24869", "Q229390", "Q506240", "Q17517379", "Q93204",
              "Q20650540", "Q226730", "Q1261214", "Q336144", "Q110956863", "Q24862"}
TV_TYPES = {"Q5398426", "Q1259759", "Q15416", "Q526877", "Q63952888", "Q117467246",
            "Q3464665", "Q21191270", "Q1366112", "Q581714"}

PROPS = {"imdb": "P345", "filmaffinity": "P480", "rt": "P1258", "letterboxd": "P6127",
         "tmdb": "P4947", "allocine": "P1265", "tmdbTv": "P4983", "allocineSerie": "P1267"}

GENRE_RULES = [
    (r"superh[ée]ro|superhero", "Superhéroes"), (r"terror|horror|slasher", "Terror"),
    (r"ciencia ficci|science fiction|sci-fi|ciberpunk|cyberpunk", "Ciencia ficción"),
    (r"animaci|animad|animated|anime", "Animación"), (r"document", "Documental"),
    (r"comedia|comedy|parodia|parody|sátira|satire", "Comedia"),
    (r"suspense|thriller|suspenso", "Thriller"), (r"acci[óo]n|action|artes marciales|martial", "Acción"),
    (r"aventura|adventure", "Aventura"), (r"fant[áa]s", "Fantasía"),
    (r"rom[áa]n|romance|romantic", "Romance"), (r"musical", "Musical"),
    (r"b[ée]lic|guerra|war film", "Bélico"), (r"western|w[ée]stern|del oeste", "Western"),
    (r"misterio|mystery|detectiv", "Misterio"), (r"biogr", "Biográfico"),
    (r"hist[óo]ric|period", "Histórico"), (r"famil|infantil|children", "Familiar"),
    (r"crim|polic|g[áa]ngster|gangster|negro|noir|heist|atracos", "Crimen"),
    (r"drama", "Drama"),
]


_lock = threading.Lock()
_last = [0.0]
MIN_INTERVAL = 0.5  # Wikimedia pide no martillear su API


def _get(url, params, retries=6):
    q = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(f"{url}?{q}", headers={"User-Agent": UA})
    for i in range(retries):
        with _lock:
            wait = _last[0] + MIN_INTERVAL - time.time()
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if i == retries - 1:
                raise
            ra = e.headers.get("Retry-After") if e.headers else None
            time.sleep(min(float(ra) if ra and ra.isdigit() else 20 * (i + 1), 90))
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(2 * (i + 1))


def wp_search(lang, query, limit=5):
    d = _get(f"https://{lang}.wikipedia.org/w/api.php", {
        "action": "query", "generator": "search", "gsrsearch": query, "gsrlimit": limit,
        "prop": "pageprops", "ppprop": "wikibase_item"})
    pages = sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    return [p["pageprops"]["wikibase_item"] for p in pages if p.get("pageprops", {}).get("wikibase_item")]


def wd_search(query, lang="es", limit=8):
    d = _get("https://www.wikidata.org/w/api.php", {
        "action": "wbsearchentities", "search": query, "language": lang, "uselang": lang,
        "type": "item", "limit": limit})
    return [x["id"] for x in d.get("search", [])]


def wd_entities(qids, props="claims|labels|sitelinks", langs="es|en"):
    out = {}
    qids = list(dict.fromkeys(qids))
    for i in range(0, len(qids), 50):
        d = _get("https://www.wikidata.org/w/api.php", {
            "action": "wbgetentities", "ids": "|".join(qids[i:i + 50]), "props": props,
            "languages": langs, "sitefilter": "enwiki|eswiki"})
        out.update(d.get("entities", {}))
    return out


def posters_for(enwiki_titles, size=342):
    """{titulo_enwiki: url_poster} usando pageimages (incluye carteles no libres)."""
    out = {}
    titles = [t for t in dict.fromkeys(enwiki_titles) if t]
    for i in range(0, len(titles), 40):
        d = _get("https://en.wikipedia.org/w/api.php", {
            "action": "query", "titles": "|".join(titles[i:i + 40]), "prop": "pageimages",
            "piprop": "thumbnail", "pithumbsize": size, "pilicense": "any", "redirects": 1})
        q = d.get("query", {})
        back = {r["to"]: r["from"] for r in q.get("redirects", [])}
        norm = {n["to"]: n["from"] for n in q.get("normalized", [])}
        for p in q.get("pages", {}).values():
            src = p.get("thumbnail", {}).get("source")
            if src:
                t = p["title"]
                t = back.get(t, t)
                t = norm.get(t, t)
                out[t] = src.split("?")[0]
    return out


def claim_values(ent, prop):
    vals = []
    for c in ent.get("claims", {}).get(prop, []):
        if c.get("rank") == "deprecated":
            continue
        dv = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if dv is None:
            continue
        if isinstance(dv, dict) and "id" in dv:
            vals.append(dv["id"])
        elif isinstance(dv, dict) and "time" in dv:
            vals.append(dv["time"])
        elif isinstance(dv, dict) and "amount" in dv:
            vals.append(dv["amount"])
        elif isinstance(dv, dict) and "text" in dv:
            vals.append(dv["text"])
        else:
            vals.append(dv)
    return vals


def years(ent, props=("P577", "P580")):
    ys = set()
    for p in props:
        for t in claim_values(ent, p):
            m = re.match(r"[+-](\d{4})", str(t))
            if m:
                ys.add(int(m.group(1)))
    return ys


def label(ent, lang="es"):
    return ent.get("labels", {}).get(lang, {}).get("value") or ent.get("labels", {}).get("en", {}).get("value")


def extract_ids(ent):
    ids = {"wikidata": ent.get("id")}
    for k, p in PROPS.items():
        v = claim_values(ent, p)
        if v:
            ids[k] = str(v[0])
    return ids


def is_film(ent):
    types = set(claim_values(ent, "P31"))
    return bool(types & FILM_TYPES) or (any(str(x).startswith("tt") for x in claim_values(ent, "P345")) and not types & TV_TYPES and bool(claim_values(ent, "P57")))


def is_tv(ent):
    return bool(set(claim_values(ent, "P31")) & TV_TYPES)


def pick(ents, qids, year, kind="film", tol=1):
    for q in qids:
        e = ents.get(q)
        if not e or "missing" in e:
            continue
        ok = is_film(e) if kind == "film" else is_tv(e)
        if not ok:
            continue
        ys = years(e)
        if year and ys and not any(abs(y - year) <= tol for y in ys):
            continue
        return e
    return None


def find_movie(titulo, original, anio):
    """Devuelve la entidad Wikidata más probable para una película."""
    tries = []
    if original:
        tries.append(lambda: wd_search(original, "en", 12))
    tries.append(lambda: wd_search(titulo, "es", 12))
    if original:
        tries.append(lambda: wd_search(f"{original} {anio or ''}".strip(), "en", 12))
        tries.append(lambda: wp_search("en", f'{original} {anio or ""} film'))
    tries.append(lambda: wp_search("es", f'{titulo} película {anio or ""}'))
    for t in tries:
        try:
            qids = t()
        except Exception:
            continue
        if not qids:
            continue
        ents = wd_entities(qids, props="claims|sitelinks|labels")
        e = pick(ents, qids, anio)
        if e:
            return e
    return None


def find_series(titulo, anio):
    for fn in (lambda: wd_search(titulo, "es"), lambda: wd_search(titulo, "en"),
               lambda: wp_search("es", f"{titulo} serie")):
        try:
            qids = fn()
        except Exception:
            continue
        if not qids:
            continue
        ents = wd_entities(qids, props="claims|sitelinks|labels")
        e = pick(ents, qids, anio, kind="tv", tol=2)
        if e:
            return e
    return None


def enwiki_title(ent):
    return ent.get("sitelinks", {}).get("enwiki", {}).get("title")


def map_genres(labels):
    out = []
    for lab in labels:
        l = lab.lower()
        for rx, g in GENRE_RULES:
            if re.search(rx, l) and g not in out:
                out.append(g)
    return out[:3]


def search_films(query, limit=8):
    """Búsqueda para autocompletar al añadir una película nueva."""
    qids = wd_search(query, "es", 12)
    try:
        qids += wp_search("es", f"{query} película", 5)
    except Exception:
        pass
    if not qids:
        return []
    ents = wd_entities(qids, props="claims|labels|sitelinks")
    films = [ents[q] for q in dict.fromkeys(qids) if q in ents and is_film(ents[q])][:limit]
    if not films:
        return []
    ref = set()
    for e in films:
        for p in ("P57", "P495", "P136"):
            ref.update(claim_values(e, p))
    labels = wd_entities(list(ref), props="labels") if ref else {}
    posters = posters_for([enwiki_title(e) for e in films])
    res = []
    for e in films:
        from collections import Counter
        yc = Counter()
        for t in claim_values(e, "P577"):
            m = re.match(r"[+-](\d{4})", str(t))
            if m:
                yc[int(m.group(1))] += 1
        ys = [max(yc, key=lambda y: (yc[y], -y))] if yc else []
        dur = claim_values(e, "P2047")
        orig = claim_values(e, "P1476")
        genres_lab = []
        for g in claim_values(e, "P136"):
            le = labels.get(g, {})
            genres_lab += [le.get("labels", {}).get(l, {}).get("value", "") for l in ("es", "en")]
        res.append({
            "wikidata": e["id"],
            "titulo": label(e, "es"),
            "tituloOriginal": orig[0] if orig else label(e, "en"),
            "anio": ys[0] if ys else None,
            "duracion": int(float(dur[0])) if dur else None,
            "director": " / ".join(label(labels.get(d, {}), "es") or "" for d in claim_values(e, "P57")[:3]),
            "pais": label(labels.get((claim_values(e, "P495") or [""])[0], {}), "es") or "",
            "generos": map_genres(genres_lab),
            "ids": extract_ids(e),
            "poster": posters.get(enwiki_title(e)),
        })
    return res

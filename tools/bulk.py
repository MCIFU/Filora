"""Identificación masiva en Wikidata mediante SPARQL (pocas peticiones, sin claves)."""
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request

import wiki

SPARQL = "https://query.wikidata.org/sparql"
TV = " ".join(f"wd:{q}" for q in sorted(wiki.TV_TYPES))


def n(x):
    x = unicodedata.normalize("NFKD", str(x or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]", "", x.upper())


def lit(s, lang):
    s = str(s).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{s}"@{lang}'


def variants(s):
    if not s:
        return []
    s = str(s).strip()
    out = {s, s[:1].upper() + s[1:].lower()}
    return [v for v in out if v]


def run(query, retries=5):
    data = urllib.parse.urlencode({"query": query}).encode()
    req = urllib.request.Request(SPARQL, data=data, headers={
        "User-Agent": wiki.UA, "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))["results"]["bindings"]
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(10 * (i + 1))


def query_labels(labels, kind):
    vals = " ".join(labels)
    if kind == "film":
        typ = f"FILTER NOT EXISTS {{ ?item wdt:P31 ?tt . VALUES ?tt {{ {TV} }} }}"
        dates = "?item wdt:P577 ?d ."
    else:
        typ = f"?item wdt:P31 ?tt . VALUES ?tt {{ {TV} }}"
        dates = "OPTIONAL { ?item wdt:P580 ?d } OPTIONAL { ?item wdt:P577 ?d2 }"
    q = f"""SELECT ?item ?lab ?d ?d2 ?imdb ?fa ?rt ?lb ?tmdb ?tmdbtv ?allo ?enwiki ?es WHERE {{
      VALUES ?lab {{ {vals} }}
      ?item rdfs:label ?lab ; wdt:P345 ?imdb .
      {typ}
      {dates}
      OPTIONAL {{ ?item wdt:P480 ?fa }} OPTIONAL {{ ?item wdt:P1258 ?rt }} OPTIONAL {{ ?item wdt:P6127 ?lb }}
      OPTIONAL {{ ?item wdt:P4947 ?tmdb }} OPTIONAL {{ ?item wdt:P4983 ?tmdbtv }} OPTIONAL {{ ?item wdt:P1265 ?allo }}
      OPTIONAL {{ ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }}
      OPTIONAL {{ ?item rdfs:label ?es FILTER(LANG(?es) = "es") }}
    }}"""
    rows = run(q)
    items = {}
    for r in rows:
        g = lambda k: r.get(k, {}).get("value")
        qid = g("item").rsplit("/", 1)[-1]
        it = items.setdefault(qid, {"qid": qid, "labels": set(), "years": set(), "ids": {"wikidata": qid}})
        it["labels"].add(n(g("lab")))
        for k in ("d", "d2"):
            if g(k):
                m = re.match(r"(\d{4})", g(k))
                if m:
                    it["years"].add(int(m.group(1)))
        for key, var in (("imdb", "imdb"), ("filmaffinity", "fa"), ("rt", "rt"), ("letterboxd", "lb"),
                         ("tmdb", "tmdb"), ("tmdbTv", "tmdbtv"), ("allocine", "allo")):
            if g(var) and key not in it["ids"]:
                it["ids"][key] = g(var)
        if g("enwiki"):
            it["enwiki"] = urllib.parse.unquote(g("enwiki").rsplit("/wiki/", 1)[-1]).replace("_", " ")
        if g("es"):
            it["es"] = g("es")
    return list(items.values())


def match(items, kind="film", batch=35, log=print):
    """items: dicts con titulo, tituloOriginal/original, anio. Devuelve {índice: candidato}."""
    res = {}
    for b in range(0, len(items), batch):
        chunk = list(enumerate(items))[b:b + batch]
        labels = set()
        for _, it in chunk:
            for t in variants(it.get("tituloOriginal") or it.get("original")):
                labels.add(lit(t, "en"))
            for t in variants(it.get("titulo")):
                labels.add(lit(t, "es"))
                labels.add(lit(t, "en"))
        try:
            cands = query_labels(sorted(labels), kind)
        except Exception as e:
            log(f"  lote {b // batch + 1}: error {e}")
            continue
        for i, it in chunk:
            keys = {n(it.get("titulo")), n(it.get("tituloOriginal") or it.get("original"))} - {""}
            y = it.get("anio")
            best, score = None, -1
            for c in cands:
                if not (c["labels"] & keys):
                    continue
                if y and c["years"]:
                    dy = min(abs(yy - y) for yy in c["years"])
                    if dy > (1 if kind == "film" else 3):
                        continue
                    sc = 10 - dy
                else:
                    sc = 1 if kind == "film" and y else 5
                sc += 2 if "enwiki" in c else 0
                if sc > score:
                    best, score = c, sc
            if best:
                res[i] = best
        log(f"  lote {b // batch + 1}/{(len(items) + batch - 1) // batch}: {sum(1 for i, _ in chunk if i in res)}/{len(chunk)}")
        time.sleep(1)
    return res

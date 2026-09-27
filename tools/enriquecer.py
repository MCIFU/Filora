"""Añade póster e IDs externos (IMDb, FilmAffinity, RT, Letterboxd, TMDb, SensaCine)
a películas, series, catálogo de recomendaciones y estrenos.

Uso:  python tools/enriquecer.py            (solo lo que falta)
      python tools/enriquecer.py --todo     (vuelve a buscarlo todo)

Primero identifica en bloque con SPARQL (pocas peticiones); lo que no encuentre
lo busca una a una (más lento, Wikimedia limita las peticiones).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bulk  # noqa: E402
import wiki  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "db.json"
CAT_TXT = ROOT / "tools" / "catalogo_recomendaciones.txt"
CAT_EXTRA = ROOT / "data" / "catalogo_extra.json"
EST_PATH = ROOT / "data" / "estrenos.json"


def apply(items, found, fix_case=True):
    """Guarda ids/enwiki y corrige mayúsculas con la etiqueta oficial en español."""
    for i, c in found.items():
        it = items[i]
        it["ids"] = {**(it.get("ids") or {}), **c["ids"]}
        if c.get("enwiki"):
            it["_enwiki"] = c["enwiki"]
        es = c.get("es")
        if fix_case and es and bulk.n(es) == bulk.n(it.get("titulo")) and es != it.get("titulo"):
            it["titulo"] = es


def one_by_one(items, kind, limit=None, log=print):
    """Búsqueda individual para los que el lote no encontró."""
    todo = [it for it in items if not (it.get("ids") or {}).get("wikidata")][:limit]
    for k, it in enumerate(todo, 1):
        try:
            if kind == "film":
                e = wiki.find_movie(it["titulo"], it.get("tituloOriginal") or it.get("original"), it.get("anio"))
            else:
                a = str(it.get("anios") or "")[:4]
                e = wiki.find_series(it["titulo"], int(a) if a.isdigit() else None)
        except Exception:
            e = None
        if e:
            it["ids"] = {**(it.get("ids") or {}), **wiki.extract_ids(e)}
            t = wiki.enwiki_title(e)
            if t:
                it["_enwiki"] = t
        log(f"    [{k}/{len(todo)}] {'✓' if e else '✗'} {it['titulo']}")


def posters(items):
    todo = [it for it in items if it.get("_enwiki") and not it.get("poster")]
    got = wiki.posters_for([it["_enwiki"] for it in todo])
    for it in todo:
        if got.get(it["_enwiki"]):
            it["poster"] = got[it["_enwiki"]]
    for it in items:
        it.pop("_enwiki", None)
    return sum(1 for it in todo if it.get("poster"))


def enrich(items, kind, label, slow=True, fix_case=True):
    pend = [it for it in items if "--todo" in sys.argv or not (it.get("ids") or {}).get("wikidata") or not it.get("poster")]
    print(f"{label}: {len(pend)} por completar")
    if not pend:
        return
    found = bulk.match(pend, kind)
    apply(pend, found, fix_case)
    print(f"  identificadas en bloque: {len(found)}/{len(pend)}")
    if slow:
        one_by_one(pend, kind)
    # para los que ya tenían wikidata pero no póster, recupera su artículo en inglés
    need = [it for it in pend if (it.get("ids") or {}).get("wikidata") and not it.get("_enwiki") and not it.get("poster")]
    if need:
        ents = wiki.wd_entities([it["ids"]["wikidata"] for it in need], props="sitelinks")
        for it in need:
            t = wiki.enwiki_title(ents.get(it["ids"]["wikidata"], {}))
            if t:
                it["_enwiki"] = t
    print(f"  carátulas nuevas: {posters(pend)}")


def main():
    slow = "--rapido" not in sys.argv
    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    save = lambda: DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    enrich(db["peliculas"], "film", "Películas", slow)
    save()
    enrich(db["series"], "tv", "Series", slow)
    save()

    # catálogo de recomendaciones
    extra = json.loads(CAT_EXTRA.read_text(encoding="utf-8")) if CAT_EXTRA.exists() else {}
    cat = []
    for line in CAT_TXT.read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            es, orig, anio, *_ = [x.strip() for x in line.split("|")]
            k = f"{orig}|{anio}"
            cat.append({"_k": k, "titulo": es, "tituloOriginal": orig, "anio": int(anio), **extra.get(k, {})})
    enrich(cat, "film", "Catálogo de recomendaciones", slow=False, fix_case=False)
    CAT_EXTRA.write_text(json.dumps({c["_k"]: {k: c[k] for k in ("ids", "poster") if c.get(k)} for c in cat if c.get("ids")},
                                    ensure_ascii=False, indent=1), encoding="utf-8")

    # estrenos
    est = json.loads(EST_PATH.read_text(encoding="utf-8"))
    E = [e for e in est["estrenos"] if e.get("original")]
    for e in E:
        e["anio"] = int(e["fecha"][:4])
    enrich(E, "film", "Estrenos", slow=False, fix_case=False)
    for e in E:
        e.pop("anio", None)
    EST_PATH.write_text(json.dumps(est, ensure_ascii=False, indent=1), encoding="utf-8")

    sin = [f"{p['titulo']} ({p['anio']})" for p in db["peliculas"] if not (p.get("ids") or {}).get("wikidata")]
    print(f"\nPelículas sin identificar: {len(sin)} · sin póster: {sum(1 for p in db['peliculas'] if not p.get('poster'))}")
    print("\n".join(sin))


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    main()

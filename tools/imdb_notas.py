"""Notas de IMDb desde sus datos oficiales (datasets.imdbws.com, uso personal y no comercial).

    python tools/imdb_notas.py   ->  app/data/imdb/00.json … 99.json

IMDb no deja leer sus páginas, pero publica cada día un archivo con la nota media y
los votos de todos los títulos. Se reparte en 100 trozos por las dos últimas cifras del
id (tt0111161 -> 61.json) para que la web solo descargue el trozo que necesita.
Lo ejecuta tools/build_static.py en cada publicación de la web.
"""
import gzip
import io
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "data" / "imdb"
URL = "https://datasets.imdbws.com/title.ratings.tsv.gz"
MIN_VOTOS = 100


def main():
    try:
        with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Filora/1.0"}), timeout=90) as r:
            datos = r.read()
    except Exception as e:
        print("  Notas de IMDb no disponibles:", e)
        return 0
    trozos = [{} for _ in range(100)]
    n = 0
    with gzip.open(io.BytesIO(datos), "rt", encoding="utf-8") as f:
        next(f)
        for linea in f:
            tid, nota, votos = linea.rstrip("\n").split("\t")
            votos = int(votos)
            if votos < MIN_VOTOS:
                continue
            trozos[int(tid[-2:])][tid] = [float(nota), votos]
            n += 1
    OUT.mkdir(parents=True, exist_ok=True)
    for i, t in enumerate(trozos):
        (OUT / f"{i:02d}.json").write_text(json.dumps(t, separators=(",", ":")), encoding="utf-8")
    print(f"  Notas de IMDb: {n} títulos con {MIN_VOTOS}+ votos")
    return n


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()


# ---- consulta desde la app local (server.py)
_trozos = {}


def nota(tt):
    """[nota, votos] de IMDb para un id tt…, o None. Lee los trozos ya generados."""
    if not tt or not str(tt).startswith("tt"):
        return None
    k = str(tt)[-2:]
    if k not in _trozos:
        f = OUT / f"{k}.json"
        _trozos[k] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    return _trozos[k].get(tt)


def rellenar(db):
    """Pone imdbNota a las películas que aún no la tienen. Devuelve cuántas ha completado."""
    if not (OUT / "00.json").exists():
        main()
    n = 0
    for p in db.get("peliculas", []):
        if p.get("imdbNota"):
            continue
        r = nota((p.get("ids") or {}).get("imdb"))
        if r:
            p["imdbNota"] = r
            n += 1
    return n

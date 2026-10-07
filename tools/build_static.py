"""Genera la versión web de solo lectura (para Netlify u otro hosting estático).

    python tools/build_static.py   ->  app/data/{estrenos,catalogo,cartelera}.json

La colección (data/db.json) NO se publica: es privada y solo la sirve la API a su dueño.

Netlify lo ejecuta en cada despliegue (ver netlify.toml), así la web pública
siempre muestra lo último que hayas subido a GitHub. No necesita librerías.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from catalogo import load_catalog  # noqa: E402
import imdb_notas  # noqa: E402

OUT = ROOT / "app" / "data"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "db.json").unlink(missing_ok=True)
    est = json.loads((ROOT / "data" / "estrenos.json").read_text(encoding="utf-8"))
    cart_path = ROOT / "data" / "cartelera.json"
    cart = json.loads(cart_path.read_text(encoding="utf-8")) if cart_path.exists() else {"cines": []}
    cines_path = ROOT / "data" / "cines_es.json"
    cines = json.loads(cines_path.read_text(encoding="utf-8")) if cines_path.exists() else {"cines": []}
    files = {"cines_es.json": cines, "estrenos.json": est, "catalogo.json": load_catalog(), "cartelera.json": cart}
    for name, data in files.items():
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    imdb_notas.main()
    print(f"Web estática lista en app/data (sin colección, es privada): "
          f"{len(est.get('estrenos', []))} estrenos, {len(files['catalogo.json'])} recomendaciones")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()

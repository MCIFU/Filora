"""Genera la versión web de solo lectura (para Netlify u otro hosting estático).

    python tools/build_static.py   ->  app/data/{db,estrenos,catalogo}.json

Netlify lo ejecuta en cada despliegue (ver netlify.toml), así la web pública
siempre muestra lo último que hayas subido a GitHub. No necesita librerías.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from catalogo import load_catalog  # noqa: E402

OUT = ROOT / "app" / "data"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    db = json.loads((ROOT / "data" / "db.json").read_text(encoding="utf-8"))
    db.pop("estado", None)
    db.pop("config", None)
    est = json.loads((ROOT / "data" / "estrenos.json").read_text(encoding="utf-8"))
    files = {"db.json": db, "estrenos.json": est, "catalogo.json": load_catalog()}
    for name, data in files.items():
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Web estática lista en app/data: {len(db['peliculas'])} películas, "
          f"{len(est.get('estrenos', []))} estrenos, {len(files['catalogo.json'])} recomendaciones")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()

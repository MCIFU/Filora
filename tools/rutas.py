"""Rutas de datos compartidas por la app local y las herramientas.

- data/local/db.json   tu colección en el PC (privada: no va a git; se sincroniza con tu cuenta de la web)
- data/db.json         copia inicial opcional (tampoco va a git)
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LOCAL = DATA / "local"
DB_PATH = LOCAL / "db.json"
DB_SEMILLA = DATA / "db.json"
BACKUPS = LOCAL / "backups"
CFG_PATH = LOCAL / "config.json"
XLSX_PATH = ROOT / "Filora.xlsx"
if not XLSX_PATH.exists() and (ROOT / "Mi Cinemateca.xlsx").exists():
    (ROOT / "Mi Cinemateca.xlsx").rename(XLSX_PATH)  # nombre antiguo


def asegurar_db():
    """Crea la base de trabajo a partir de la copia publicada si aún no existe."""
    if not DB_PATH.exists():
        LOCAL.mkdir(parents=True, exist_ok=True)
        if DB_SEMILLA.exists():
            shutil.copy2(DB_SEMILLA, DB_PATH)
        else:  # colección nueva y vacía (al sincronizar se trae la de tu cuenta de la web)
            DB_PATH.write_text(json.dumps({"peliculas": [], "series": [], "pendientes": [], "borrados": {}}), encoding="utf-8")
        viejo = DATA / "config.json"
        if viejo.exists() and not CFG_PATH.exists():
            shutil.move(str(viejo), CFG_PATH)
        viejas = DATA / "backups"
        if viejas.exists() and not BACKUPS.exists():
            shutil.move(str(viejas), BACKUPS)
    return DB_PATH

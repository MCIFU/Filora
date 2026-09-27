"""Catálogo de recomendaciones (compartido por el servidor local y la versión web estática)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT_PATH = ROOT / "tools" / "catalogo_recomendaciones.txt"
EXTRA_PATH = ROOT / "data" / "catalogo_extra.json"

GEN = {"A": "Acción", "Av": "Aventura", "An": "Animación", "CF": "Ciencia ficción", "C": "Comedia",
       "Cr": "Crimen", "D": "Drama", "F": "Fantasía", "T": "Terror", "Th": "Thriller", "R": "Romance",
       "M": "Musical", "B": "Bélico", "W": "Western", "S": "Superhéroes", "Mi": "Misterio",
       "Bio": "Biográfico", "H": "Histórico", "Fa": "Familiar", "Doc": "Documental"}


def load_catalog():
    try:
        extra = json.loads(EXTRA_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        extra = {}
    out = []
    for line in CAT_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        es, orig, anio, director, pais, codes, prest = [x.strip() for x in line.split("|")]
        out.append({"titulo": es, "tituloOriginal": orig, "anio": int(anio), "director": director, "pais": pais,
                    "generos": [GEN[c] for c in codes.split(",")], "prestigio": float(prest),
                    **extra.get(f"{orig}|{anio}", {})})
    return out

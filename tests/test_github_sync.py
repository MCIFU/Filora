"""Pruebas de la sincronización sin Vercel (tools/github_sync.py) contra un GitHub simulado en memoria.

    python3 tests/test_github_sync.py
"""
import base64
import json
import sys
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import github_sync as gs  # noqa: E402

archivos = {}  # (repo, ruta) -> (texto, sha)
llamadas = []


def falso(token, url, metodo="GET", datos=None, accept=""):
    llamadas.append((metodo, url))
    repo, ruta = url.split("/repos/")[1].split("/contents/") if "/contents/" in url else (None, None)
    if "dispatches" in url:
        return b""
    if metodo == "GET":
        if (repo, ruta) not in archivos:
            raise urllib.error.HTTPError(url, 404, "no", {}, None)
        texto, sha = archivos[(repo, ruta)]
        return json.dumps({"content": base64.b64encode(texto.encode()).decode(), "sha": sha}).encode()
    if metodo == "PUT":
        actual = archivos.get((repo, ruta), (None, None))[1]
        if datos.get("sha") != actual:
            raise urllib.error.HTTPError(url, 409, "conflicto", {}, None)
        sha = f"s{len(llamadas)}"
        archivos[(repo, ruta)] = (base64.b64decode(datos["content"]).decode(), sha)
        return json.dumps({"content": {"sha": sha}}).encode()


gs._peticion = falso
R = "MCIFU/filora-datos"
pc = {"peliculas": [{"id": "p1", "titulo": "Del PC", "mod": "2026-11-01T10:00:00"}, {"id": "p2", "titulo": "Vieja", "mod": "2026-01-01T00:00:00"}],
      "series": [], "pendientes": [], "borrados": {}, "preferencias": {"cines": [{"id": 402}], "mod": "2026-11-01T00:00:00"}}

# 1) primera vez: el repositorio está vacío y se sube la colección del PC
f = gs.sincronizar("t", R, pc)
assert {p["id"] for p in f["peliculas"]} == {"p1", "p2"}
assert (R, "db.json") in archivos

# 2) el móvil añade una, cambia otra y borra la vieja: el PC lo recibe todo
movil = json.loads(archivos[(R, "db.json")][0])
movil["peliculas"].append({"id": "p3", "titulo": "Del móvil", "mod": "2026-11-20T09:00:00"})
movil["peliculas"][0] = {**movil["peliculas"][0], "nota": 9, "mod": "2026-11-20T09:01:00"}
movil["peliculas"] = [p for p in movil["peliculas"] if p["id"] != "p2"]
movil["borrados"] = {"p2": "2026-11-20T09:02:00"}
archivos[(R, "db.json")] = (json.dumps(movil), "s-movil")
f = gs.sincronizar("t", R, pc)
ids = {p["id"]: p for p in f["peliculas"]}
assert set(ids) == {"p1", "p3"}, ids
assert ids["p1"].get("nota") == 9, "gana el cambio más reciente"

# 3) si otro dispositivo guarda a la vez (sha distinto), se relee y se repite
n = len(llamadas)
orig = gs.escribir
veces = {"n": 0}


def escribir_con_choque(*a, **k):
    veces["n"] += 1
    if veces["n"] == 1:
        return None
    return orig(*a, **k)


gs.escribir = escribir_con_choque
pc2 = {**f, "peliculas": f["peliculas"] + [{"id": "p4", "titulo": "Nueva PC", "mod": "2026-11-20T10:00:00"}]}
f = gs.sincronizar("t", R, pc2)
gs.escribir = orig
assert veces["n"] == 2 and "p4" in {p["id"] for p in f["peliculas"]}

# 4) cines para el robot: se escriben en MCIFU/Filora y se lanza la descarga de los nuevos
gs.avisar_cines("t", [{"id": 402}, {"id": "1269"}])
d = json.loads(archivos[("MCIFU/Filora", "data/demanda.json")][0])
assert set(d["cines"]) == {402, 1269}
assert any("dispatches" in u for _, u in llamadas)
print("✓ Sincronización con GitHub (PC): fusión, borrados, choques y cines del robot")

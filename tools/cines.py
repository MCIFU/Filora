"""Catálogo de cines de España (FilmAffinity) con la ubicación de su ciudad.

    python tools/cines.py      -> data/cines_es.json

Recorre las 52 provincias de FilmAffinity, guarda cada cine abierto (id, nombre,
dirección, ciudad, provincia) y sitúa cada ciudad en el mapa con OpenStreetMap
(Nominatim, una consulta por segundo; las ya conocidas quedan en data/ciudades_geo.json).
Así la web puede ofrecer «cines cerca de ti» sin pedir nada a ningún servidor.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from cartelera import FA, get, txt  # noqa: E402

OUT = ROOT / "data" / "cines_es.json"
GEO = ROOT / "data" / "ciudades_geo.json"
UA_GEO = "Filora/1.0 (https://github.com/MCIFU/Filora; catálogo de cines)"


PROVINCIAS = {
    "ES-C": "A Coruña", "ES-VI": "Álava", "ES-AB": "Albacete", "ES-A": "Alicante", "ES-AL": "Almería", "ES-O": "Asturias",
    "ES-AV": "Ávila", "ES-BA": "Badajoz", "ES-PM": "Illes Balears", "ES-B": "Barcelona", "ES-BI": "Bizkaia", "ES-BU": "Burgos",
    "ES-CC": "Cáceres", "ES-CA": "Cádiz", "ES-S": "Cantabria", "ES-CS": "Castellón", "ES-CE": "Ceuta", "ES-CR": "Ciudad Real",
    "ES-CO": "Córdoba", "ES-CU": "Cuenca", "ES-SS": "Gipuzkoa", "ES-GI": "Girona", "ES-GR": "Granada", "ES-GU": "Guadalajara",
    "ES-H": "Huelva", "ES-HU": "Huesca", "ES-J": "Jaén", "ES-LO": "La Rioja", "ES-GC": "Las Palmas", "ES-LE": "León",
    "ES-L": "Lleida", "ES-LU": "Lugo", "ES-M": "Madrid", "ES-MA": "Málaga", "ES-ML": "Melilla", "ES-MU": "Murcia",
    "ES-NA": "Navarra", "ES-OR": "Ourense", "ES-P": "Palencia", "ES-PO": "Pontevedra", "ES-SA": "Salamanca",
    "ES-TF": "Santa Cruz de Tenerife", "ES-SG": "Segovia", "ES-SE": "Sevilla", "ES-SO": "Soria", "ES-T": "Tarragona",
    "ES-TE": "Teruel", "ES-TO": "Toledo", "ES-V": "Valencia", "ES-VA": "Valladolid", "ES-ZA": "Zamora", "ES-Z": "Zaragoza",
}


def provincias():
    h = get(f"{FA}theaters.php")
    return {code: PROVINCIAS.get(code, code) for code in sorted(set(re.findall(r"state=(ES-[A-Z]+)", h)))}


def cines_provincia(code):
    h = get(f"{FA}theaters.php?state={code}")
    out = []
    for grupo in h.split('class="fa-content-card city-group"')[1:]:
        ciudad = txt((re.search(r'<div class="card-header">(.*?)</div>', grupo, re.S) or [None, ""])[1])
        for li in grupo.split("<li>")[1:]:
            m = re.search(r'theater-showtimes\.php\?id=(\d+)" title="([^"]*)"', li)
            if not m or "closed" in li:
                continue
            direccion = txt((re.search(r"<em>(.*?)</em>", li, re.S) or [None, ""])[1])
            out.append({"id": int(m.group(1)), "nombre": txt(m.group(2)), "direccion": direccion, "ciudad": ciudad})
    return out


def geocodificar(ciudad, provincia, cache):
    clave = f"{ciudad}|{provincia}"
    if clave in cache:
        return cache[clave]
    q = urllib.parse.urlencode({"city": ciudad, "state": provincia, "country": "España", "format": "json", "limit": 1})
    res = None
    for intento in (q, urllib.parse.urlencode({"q": f"{ciudad}, {provincia}, España", "format": "json", "limit": 1})):
        req = urllib.request.Request(f"https://nominatim.openstreetmap.org/search?{intento}", headers={"User-Agent": UA_GEO})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.loads(r.read().decode("utf-8"))
        except Exception:
            d = []
        time.sleep(1.1)
        if d:
            res = [round(float(d[0]["lat"]), 4), round(float(d[0]["lon"]), 4)]
            break
    cache[clave] = res
    return res


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    cache = json.loads(GEO.read_text(encoding="utf-8")) if GEO.exists() else {}
    todos = []
    for code, prov in provincias().items():
        try:
            lista = cines_provincia(code)
        except Exception as e:
            print(f"  {prov}: error {e}")
            continue
        for c in lista:
            c["provincia"] = prov
        todos += lista
        print(f"  {prov}: {len(lista)} cines")
        time.sleep(1.5)
    ciudades = sorted({(c["ciudad"], c["provincia"]) for c in todos})
    print(f"Ubicando {len(ciudades)} ciudades…")
    for n, (ciudad, prov) in enumerate(ciudades, 1):
        geocodificar(ciudad, prov, cache)
        if n % 40 == 0:
            GEO.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
            print(f"  {n}/{len(ciudades)}")
    GEO.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
    for c in todos:
        c["geo"] = cache.get(f"{c['ciudad']}|{c['provincia']}")
    todos.sort(key=lambda c: (c["provincia"], c["ciudad"], c["nombre"]))
    OUT.write_text(json.dumps({"fuente": "FilmAffinity + OpenStreetMap", "cines": todos}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sin = sum(1 for c in todos if not c["geo"])
    print(f"Hecho: {len(todos)} cines en {len(ciudades)} ciudades ({sin} sin ubicar)")


if __name__ == "__main__":
    main()

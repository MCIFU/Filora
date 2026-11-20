"""Sincronización del PC sin Vercel: la colección se guarda también en un repositorio PRIVADO de GitHub
(p. ej. MCIFU/filora-datos, archivo db.json), el mismo que usa la web con app/nube.js.

Fusión igual que lib/filora.mjs: por elemento gana la modificación más reciente y los borrados mandan.
Tus cines se escriben además en MCIFU/Filora data/demanda.json para el robot de la cartelera.
"""
import base64
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

COLS = {"peliculas": "p", "series": "s", "pendientes": "w"}
FILORA_REPO = "MCIFU/Filora"


def ahora():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def fusionar(base, entrante):
    base = {k: v for k, v in (base or {}).items() if k not in ("estado", "config")}
    entrante = {k: v for k, v in (entrante or {}).items() if k not in ("estado", "config")}
    borrados = dict(base.get("borrados") or {})
    for i, t in (entrante.get("borrados") or {}).items():
        if not borrados.get(i) or t > borrados[i]:
            borrados[i] = t
    out = {**entrante, **base, "borrados": borrados}
    for col in COLS:
        mapa = {it["id"]: it for it in base.get(col) or []}
        for it in entrante.get(col) or []:
            a = mapa.get(it["id"])
            if not a or (it.get("mod") or "") > (a.get("mod") or ""):
                mapa[it["id"]] = it
        out[col] = [it for it in mapa.values() if not (borrados.get(it["id"]) and borrados[it["id"]] >= (it.get("mod") or ""))]
    pb, pe = base.get("preferencias"), entrante.get("preferencias")
    if pb or pe:
        out["preferencias"] = pe if not pb else pb if not pe else (pe if (pe.get("mod") or "") > (pb.get("mod") or "") else pb)
    out["actualizado"] = ahora()
    return out


class ErrorGitHub(Exception):
    pass


def _peticion(token, url, metodo="GET", datos=None, accept="application/vnd.github+json"):
    req = urllib.request.Request(url, method=metodo, data=json.dumps(datos).encode() if datos is not None else None, headers={
        "Authorization": f"Bearer {token}", "Accept": accept, "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Filora-PC/1.0", **({"Content-Type": "application/json"} if datos is not None else {})})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def leer(token, repo, ruta):
    """(datos, sha) del archivo, o (None, None) si aún no existe."""
    url = f"https://api.github.com/repos/{repo}/contents/{ruta}"
    try:
        j = json.loads(_peticion(token, url))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, None
        if e.code in (401, 403):
            raise ErrorGitHub("GitHub no acepta tu clave (¿caducada o sin acceso al repositorio?)")
        raise ErrorGitHub(f"GitHub respondió {e.code}")
    texto = base64.b64decode(j["content"]).decode("utf-8") if j.get("content") else _peticion(token, url, accept="application/vnd.github.raw+json").decode("utf-8")
    return json.loads(texto), j["sha"]


def escribir(token, repo, ruta, datos, sha, mensaje):
    """sha nuevo, o None si otro dispositivo guardó antes (hay que releer y repetir)."""
    cuerpo = {"message": mensaje, "content": base64.b64encode(json.dumps(datos, ensure_ascii=False).encode("utf-8")).decode()}
    if sha:
        cuerpo["sha"] = sha
    try:
        return json.loads(_peticion(token, f"https://api.github.com/repos/{repo}/contents/{ruta}", "PUT", cuerpo))["content"]["sha"]
    except urllib.error.HTTPError as e:
        if e.code in (409, 422):
            return None
        raise ErrorGitHub(f"GitHub no guardó el cambio ({e.code})")


def _comparable(db):
    return json.dumps({c: db.get(c) for c in ("peliculas", "series", "pendientes", "borrados", "preferencias")}, sort_keys=True, ensure_ascii=False)


def sincronizar(token, repo, local):
    """Fusiona la colección local con la de GitHub y sube el resultado si cambia. Devuelve la fusión."""
    for _ in range(4):
        remoto, sha = leer(token, repo, "db.json")
        fusion = fusionar(remoto or {}, local)
        if remoto is not None and _comparable(fusion) == _comparable(remoto):
            return fusion
        if escribir(token, repo, "db.json", fusion, sha, f"Filora PC: {len(fusion.get('peliculas') or [])} películas"):
            return fusion
    raise ErrorGitHub("Otro dispositivo estaba guardando a la vez; se reintentará")


def avisar_cines(token, cines):
    """Escribe tus cines en MCIFU/Filora data/demanda.json (para el robot) y lanza la descarga si hay alguno nuevo."""
    ids = [int(c["id"]) for c in cines or [] if str(c.get("id", "")).isdigit()]
    if not ids:
        return
    try:
        datos, sha = leer(token, FILORA_REPO, "data/demanda.json")
    except ErrorGitHub:
        return
    antes = [int(x) for x in (datos or {}).get("cines") or []]
    nuevos = [i for i in ids if i not in antes]
    if datos and not nuevos:
        return
    escribir(token, FILORA_REPO, "data/demanda.json", {"cines": list(dict.fromkeys(ids + antes))[:40], "actualizado": ahora()}, sha, "Cines elegidos para la cartelera")
    if nuevos:
        try:
            _peticion(token, f"https://api.github.com/repos/{FILORA_REPO}/actions/workflows/cartelera.yml/dispatches", "POST",
                      {"ref": "main", "inputs": {"cines": ",".join(map(str, nuevos))}})
        except Exception:
            pass  # sin permiso de Actions: el robot los recogerá en su siguiente turno

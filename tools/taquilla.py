"""Taquilla y presupuesto desde Box Office Mojo (por el id de IMDb de cada película).

    python tools/taquilla.py [ruta_db]        solo las que aún no se han consultado
    python tools/taquilla.py [ruta_db] --todo  vuelve a consultar todas (cifras actualizadas)

Guarda en cada película: taquilla.apertura, domestica, internacional, mundial,
presupuesto y taquilla.fuente = "boxofficemojo" con la fecha de consulta.
"""
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"


def _num(s):
    return int(re.sub(r"[^\d]", "", s)) if s else None


def consultar(imdb_id):
    """Devuelve {apertura, domestica, internacional, mundial, presupuesto} o None si no hay ficha."""
    req = urllib.request.Request(f"https://www.boxofficemojo.com/title/{imdb_id}/", headers={"User-Agent": UA, "Accept-Language": "en-US"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            h = r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))
    g = lambda rx: (re.search(rx, t) or [None, None])[1]
    out = {
        "domestica": _num(g(r"All Releases Domestic (?:\( ?[\d.<–-]+% ?\) )?(\$[\d,]+)")),
        "internacional": _num(g(r"International (?:\( ?[\d.<–-]+% ?\) )?(\$[\d,]+)")),
        "mundial": _num(g(r"Worldwide (\$[\d,]+)")),
        "apertura": _num(g(r"Domestic Opening (\$[\d,]+)")),
        "presupuesto": _num(g(r"Budget (\$[\d,]+)")),
    }
    return out if any(out.values()) else None


def aplicar(p, datos):
    t = p.setdefault("taquilla", {}) or {}
    p["taquilla"] = t
    if datos:
        for k in ("apertura", "domestica", "internacional", "mundial"):
            if datos.get(k):
                t[k] = datos[k]
        if datos.get("presupuesto"):
            p["presupuesto"] = datos["presupuesto"]
    t["fuente"] = "boxofficemojo"
    t["consultado"] = date.today().isoformat()


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ruta = Path(args[0]) if args else Path(__file__).resolve().parent.parent / "data" / "local" / "db.json"
    todo = "--todo" in sys.argv
    db = json.loads(ruta.read_text(encoding="utf-8"))
    pend = [p for p in db["peliculas"] if (p.get("ids") or {}).get("imdb") and (todo or (p.get("taquilla") or {}).get("fuente") != "boxofficemojo")]
    print(f"Películas a consultar en Box Office Mojo: {len(pend)}")
    ok = 0
    for n, p in enumerate(pend, 1):
        try:
            d = consultar(p["ids"]["imdb"])
        except urllib.error.HTTPError as e:
            print(f"  Box Office Mojo responde {e.code}: paro aquí y se puede reanudar más tarde")
            break
        except Exception as e:
            print(f"  ✗ {p['titulo']}: {e}")
            time.sleep(3)
            continue
        aplicar(p, d)
        p["mod"] = datetime.utcnow().isoformat(timespec="seconds")
        ok += bool(d)
        if n % 25 == 0:
            print(f"  [{n}/{len(pend)}] con datos: {ok}")
            db["actualizado"] = datetime.utcnow().isoformat(timespec="seconds")
            ruta.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
        time.sleep(1.1)
    db["actualizado"] = datetime.utcnow().isoformat(timespec="seconds")
    ruta.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Hecho: {ok} películas con taquilla de Box Office Mojo")


if __name__ == "__main__":
    main()

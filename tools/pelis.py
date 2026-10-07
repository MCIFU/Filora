"""Registro rápido desde la terminal (o pidiéndoselo a Claude en el chat).

  python tools/pelis.py vista "Dune: Parte Dos" 8.5 --lugar "Yelmo Cines Ocimax Gijón" --resena "..." [--fecha 2026-09-27] [--fav]
  python tools/pelis.py nota "Tenet" 7.8           cambia la nota de una que ya tienes
  python tools/pelis.py buscar "nolan"             busca en tu colección
  python tools/pelis.py pendiente "Sirāt" --motivo "Me la recomendó Ana"
  python tools/pelis.py excel                       regenera Filora.xlsx

Busca los datos (año, director, país, géneros, póster, IDs) en Wikidata
automáticamente. Funciona con la app abierta o cerrada.
"""
import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT))
import server  # noqa: E402  (reutiliza guardado, copias y Excel)
import wiki  # noqa: E402
from bulk import n as norm  # noqa: E402


def find(db, titulo):
    k = norm(titulo)
    exact = [p for p in db["peliculas"] if norm(p["titulo"]) == k or norm(p.get("tituloOriginal")) == k]
    return exact or [p for p in db["peliculas"] if k in norm(p["titulo"]) or k in norm(p.get("tituloOriginal"))]


def cmd_vista(a):
    with server.LOCK:
        db = server.load_db()
        ya = [p for p in find(db, a.titulo) if not a.anio or p.get("anio") == a.anio]
        if ya and not a.forzar:
            p = ya[0]
            print(f"Ya la tienes: {p['titulo']} ({p['anio']}) con un {p['nota']}. Usa 'nota' para cambiarla o --forzar.")
            return
        info = {}
        try:
            res = wiki.search_films(a.titulo)
            if a.anio:
                res = [r for r in res if r.get("anio") and abs(r["anio"] - a.anio) <= 1] or res
            if res:
                info = res[0]
        except Exception as e:
            print("(sin conexión con Wikidata, se guarda con los datos mínimos)", e)
        p = {
            "titulo": info.get("titulo") or a.titulo,
            "tituloOriginal": info.get("tituloOriginal"),
            "anio": a.anio or info.get("anio"),
            "duracion": info.get("duracion"),
            "nota": round(a.nota, 1),
            "director": info.get("director") or "",
            "pais": info.get("pais") or "",
            "generos": a.generos.split(",") if a.generos else info.get("generos") or [],
            "saga": a.saga,
            "fase": None, "presupuesto": None, "taquilla": {},
            "fechaVisto": a.fecha or date.today().isoformat(),
            "lugar": a.lugar, "resena": a.resena or "", "favorita": a.fav,
            "ids": info.get("ids") or {}, "poster": info.get("poster"),
            "origen": "app", "añadido": datetime.now().isoformat(timespec="seconds"),
        }
        p["id"] = server.next_id(db["peliculas"], "p")
        p["mod"] = server.ahora()
        db["pendientes"] = [w for w in db["pendientes"] if norm(w["titulo"]) != norm(p["titulo"])]
        db["peliculas"].append(p)
        server.save_db(db)
    print(f"✓ Añadida: {p['titulo']} ({p['anio']}) · {p['director']} · {', '.join(p['generos'])} · nota {p['nota']}")
    if server.STATE["excel_error"]:
        print("⚠", server.STATE["excel_error"])


def cmd_nota(a):
    with server.LOCK:
        db = server.load_db()
        L = find(db, a.titulo)
        if not L:
            return print("No la encuentro en tu colección.")
        p = L[0]
        old = p.get("nota")
        p["nota"] = round(a.nota, 1)
        p["mod"] = server.ahora()
        if a.resena:
            p["resena"] = a.resena
        server.save_db(db)
    print(f"✓ {p['titulo']}: {old} → {p['nota']}")


def cmd_buscar(a):
    db = server.load_db()
    k = norm(a.texto)
    for p in db["peliculas"]:
        if k in norm(p["titulo"]) or k in norm(p.get("tituloOriginal")) or k in norm(p.get("director")):
            print(f"{p['nota']:>4}  {p['titulo']} ({p['anio']}) · {p['director']}")


def cmd_pendiente(a):
    with server.LOCK:
        db = server.load_db()
        db["pendientes"].append({"id": server.next_id(db["pendientes"], "w"), "titulo": a.titulo, "anio": a.anio,
                                 "motivo": a.motivo or "", "añadido": datetime.now().isoformat(timespec="seconds")})
        server.save_db(db)
    print(f"✓ A pendientes: {a.titulo}")


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Filora desde la terminal")
    sp = ap.add_subparsers(dest="cmd", required=True)
    v = sp.add_parser("vista")
    v.add_argument("titulo"); v.add_argument("nota", type=float)
    v.add_argument("--anio", type=int); v.add_argument("--fecha"); v.add_argument("--lugar")
    v.add_argument("--resena"); v.add_argument("--generos"); v.add_argument("--saga")
    v.add_argument("--fav", action="store_true"); v.add_argument("--forzar", action="store_true")
    n = sp.add_parser("nota")
    n.add_argument("titulo"); n.add_argument("nota", type=float); n.add_argument("--resena")
    b = sp.add_parser("buscar"); b.add_argument("texto")
    w = sp.add_parser("pendiente"); w.add_argument("titulo"); w.add_argument("--anio", type=int); w.add_argument("--motivo")
    sp.add_parser("excel")
    a = ap.parse_args()
    if a.cmd == "excel":
        server.regenerate_excel()
        print(server.STATE["excel_error"] or f"✓ Excel regenerado: {server.excel.XLSX_PATH}")
        return
    {"vista": cmd_vista, "nota": cmd_nota, "buscar": cmd_buscar, "pendiente": cmd_pendiente}[a.cmd](a)


if __name__ == "__main__":
    main()

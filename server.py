"""Mi Cinemateca · servidor local.

Arranca con:  python server.py      (o doble clic en Iniciar.bat)
Abre:         http://localhost:8765

Sirve la web (carpeta app/), guarda los cambios en data/db.json, hace copias de
seguridad y regenera "Mi Cinemateca.xlsx" en cada cambio.
"""
import json
import mimetypes
import shutil
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tools"))
import excel  # noqa: E402
import wiki  # noqa: E402

APP = ROOT / "app"
DATA = ROOT / "data"
DB_PATH = DATA / "db.json"
EST_PATH = DATA / "estrenos.json"
CFG_PATH = DATA / "config.json"
CAT_PATH = ROOT / "tools" / "catalogo_recomendaciones.txt"
BACKUPS = DATA / "backups"
PORT = 8765

LOCK = threading.RLock()
STATE = {"excel_error": None, "excel_at": None}

GEN = {"A": "Acción", "Av": "Aventura", "An": "Animación", "CF": "Ciencia ficción", "C": "Comedia",
       "Cr": "Crimen", "D": "Drama", "F": "Fantasía", "T": "Terror", "Th": "Thriller", "R": "Romance",
       "M": "Musical", "B": "Bélico", "W": "Western", "S": "Superhéroes", "Mi": "Misterio",
       "Bio": "Biográfico", "H": "Histórico", "Fa": "Familiar", "Doc": "Documental"}


def read_json(p, default=None):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def load_db():
    return read_json(DB_PATH)


def backup():
    BACKUPS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(DB_PATH, BACKUPS / f"db-{stamp}.json")
    olds = sorted(BACKUPS.glob("db-*.json"))
    for f in olds[:-30]:
        f.unlink()


def save_db(db):
    db["actualizado"] = datetime.now().isoformat(timespec="seconds")
    backup()
    tmp = DB_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(DB_PATH)
    regenerate_excel(db)


def regenerate_excel(db=None):
    try:
        excel.export(db or load_db(), read_json(EST_PATH, {"estrenos": []}))
        STATE["excel_error"], STATE["excel_at"] = None, datetime.now().isoformat(timespec="seconds")
    except Exception as e:  # p. ej. el Excel está abierto
        STATE["excel_error"] = str(e)


def next_id(items, prefix):
    n = max([int(x["id"][1:]) for x in items if x.get("id", "")[1:].isdigit()] + [0]) + 1
    return f"{prefix}{n:04d}"


def load_catalog():
    extra = read_json(DATA / "catalogo_extra.json", {}) or {}
    out = []
    for line in CAT_PATH.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        es, orig, anio, director, pais, codes, prest = [x.strip() for x in line.split("|")]
        out.append({"titulo": es, "tituloOriginal": orig, "anio": int(anio), "director": director, "pais": pais,
                    "generos": [GEN[c] for c in codes.split(",")], "prestigio": float(prest),
                    **extra.get(f"{orig}|{anio}", {})})
    return out


def enrich_background(kind, item_id):
    """Busca póster e IDs para un elemento recién añadido sin bloquear la respuesta."""
    def run():
        with LOCK:
            db = load_db()
            coll = db["peliculas"] if kind == "film" else db["series"]
            it = next((x for x in coll if x["id"] == item_id), None)
            if not it:
                return
            snapshot = dict(it)
        try:
            if kind == "film":
                e = wiki.find_movie(snapshot["titulo"], snapshot.get("tituloOriginal"), snapshot.get("anio"))
            else:
                a = str(snapshot.get("anios") or "")[:4]
                e = wiki.find_series(snapshot["titulo"], int(a) if a.isdigit() else None)
            if not e:
                return
            ids = wiki.extract_ids(e)
            t = wiki.enwiki_title(e)
            poster = wiki.posters_for([t]).get(t) if t else None
        except Exception:
            return
        with LOCK:
            db = load_db()
            coll = db["peliculas"] if kind == "film" else db["series"]
            it = next((x for x in coll if x["id"] == item_id), None)
            if it:
                it["ids"] = {**ids, **(it.get("ids") or {})}
                if poster and not it.get("poster"):
                    it["poster"] = poster
                save_db(db)
    threading.Thread(target=run, daemon=True).start()


# ------------------------------------------------------------------ TMDb (opcional)
def tmdb(path, **params):
    cfg = read_json(CFG_PATH, {}) or {}
    key = cfg.get("tmdbKey")
    if not key:
        raise RuntimeError("Sin clave de TMDb")
    params = {"api_key": key, "language": "es-ES", **params}
    url = f"https://api.themoviedb.org/3{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": wiki.UA}), timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def refresh_estrenos_tmdb():
    """Actualiza el calendario con los estrenos en cines de España según TMDb."""
    genres = {g["id"]: g["name"] for g in tmdb("/genre/movie/list")["genres"]}
    gmap = {"Ciencia ficción": "Ciencia ficción", "Suspense": "Thriller", "Película de TV": None,
            "Bélica": "Bélico", "Historia": "Histórico", "Música": "Musical", "Familia": "Familiar",
            "Romance": "Romance", "Animación": "Animación", "Documental": "Documental", "Aventura": "Aventura",
            "Acción": "Acción", "Comedia": "Comedia", "Crimen": "Crimen", "Drama": "Drama", "Fantasía": "Fantasía",
            "Terror": "Terror", "Misterio": "Misterio", "Western": "Western"}
    start = date.today()
    end = start + timedelta(days=180)
    seen, items = set(), []
    for page in range(1, 8):
        d = tmdb("/discover/movie", region="ES", with_release_type="3|2",
                 **{"release_date.gte": start.isoformat(), "release_date.lte": end.isoformat()},
                 sort_by="popularity.desc", page=page)
        for m in d.get("results", []):
            if m["id"] in seen:
                continue
            seen.add(m["id"])
            items.append(m)
        if page >= d.get("total_pages", 1):
            break

    def detail(m):
        try:
            x = tmdb(f"/movie/{m['id']}", append_to_response="release_dates,credits")
        except Exception:
            return None
        fecha = None
        for rd in x.get("release_dates", {}).get("results", []):
            if rd["iso_3166_1"] == "ES":
                ds = sorted(r["release_date"][:10] for r in rd["release_dates"] if r["type"] in (2, 3))
                fecha = ds[0] if ds else None
        if not fecha or fecha < start.isoformat():
            return None
        dirs = [c["name"] for c in x.get("credits", {}).get("crew", []) if c.get("job") == "Director"]
        gs = [gmap.get(genres.get(g["id"]), genres.get(g["id"])) for g in x.get("genres", [])]
        return {"fecha": fecha, "titulo": x.get("title"), "original": x.get("original_title"),
                "director": " / ".join(dirs[:2]) or None, "generos": [g for g in gs if g][:3],
                "pais": (x.get("production_countries") or [{}])[0].get("name"),
                "sinopsis": x.get("overview"), "poster": f"https://image.tmdb.org/t/p/w342{x['poster_path']}" if x.get("poster_path") else None,
                "tmdb": x["id"], "destacado": m.get("popularity", 0) > 60}

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=8) as ex:
        res = [r for r in ex.map(detail, items[:140]) if r]
    est = read_json(EST_PATH, {})
    est["estrenos"] = sorted(res, key=lambda e: e["fecha"])
    est["actualizado"] = date.today().isoformat()
    est["fuentes"] = ["TMDb (fechas de España)"]
    EST_PATH.write_text(json.dumps(est, ensure_ascii=False, indent=1), encoding="utf-8")
    return len(res)


# ------------------------------------------------------------------ HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "MiCinemateca/1.0"

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("%s  %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n).decode("utf-8")) if n else {}

    def parts(self):
        u = urllib.parse.urlparse(self.path)
        return [p for p in u.path.split("/") if p], urllib.parse.parse_qs(u.query)

    # ---- GET
    def do_GET(self):
        parts, qs = self.parts()
        try:
            if not parts or parts[0] != "api":
                return self.static(parts)
            if parts[1:] == ["db"]:
                db = load_db()
                cfg = read_json(CFG_PATH, {}) or {}
                return self.send_json({**db, "estado": {**STATE, "tmdb": bool(cfg.get("tmdbKey"))},
                                       "config": {k: v for k, v in cfg.items() if k != "tmdbKey"}})
            if parts[1:] == ["estrenos"]:
                return self.send_json(read_json(EST_PATH, {"estrenos": [], "cines": []}))
            if parts[1:] == ["catalogo"]:
                return self.send_json(load_catalog())
            if parts[1:] == ["buscar"]:
                q = (qs.get("q") or [""])[0].strip()
                return self.send_json(wiki.search_films(q) if len(q) >= 2 else [])
            if parts[1:] == ["excel"]:
                if not excel.XLSX_PATH.exists():
                    regenerate_excel()
                data = excel.XLSX_PATH.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                self.send_header("Content-Disposition", "attachment; filename*=UTF-8''Mi%20Cinemateca.xlsx")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                return self.wfile.write(data)
            if parts[1:] == ["backup"]:
                data = DB_PATH.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Disposition", f"attachment; filename=cinemateca-{date.today()}.json")
                self.end_headers()
                return self.wfile.write(data)
            return self.send_json({"error": "no encontrado"}, 404)
        except Exception as e:
            return self.send_json({"error": str(e)}, 500)

    def static(self, parts):
        rel = "/".join(parts) or "index.html"
        f = (APP / rel).resolve()
        if not str(f).startswith(str(APP.resolve())) or not f.is_file():
            f = APP / "index.html"
        data = f.read_bytes()
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript",):
            ctype += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    # ---- POST / PUT / DELETE
    COLLS = {"peliculas": ("peliculas", "p", "film"), "series": ("series", "s", "tv"), "pendientes": ("pendientes", "w", None)}

    def do_POST(self):
        parts, _ = self.parts()
        try:
            if parts[:1] != ["api"]:
                return self.send_json({"error": "no encontrado"}, 404)
            if parts[1:] == ["config"]:
                cfg = read_json(CFG_PATH, {}) or {}
                cfg.update({k: v for k, v in self.body().items() if v is not None})
                CFG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
                return self.send_json({"ok": True})
            if parts[1:] == ["excel", "regenerar"]:
                regenerate_excel()
                return self.send_json({"ok": STATE["excel_error"] is None, **STATE})
            if parts[1:] == ["excel", "importar"]:
                with LOCK:
                    db, res = excel.import_pro(excel.XLSX_PATH, load_db())
                    save_db(db)
                return self.send_json({"ok": True, **res})
            if parts[1:] == ["estrenos", "actualizar"]:
                n = refresh_estrenos_tmdb()
                return self.send_json({"ok": True, "estrenos": n})
            if len(parts) == 2 and parts[1] in self.COLLS:
                key, prefix, kind = self.COLLS[parts[1]]
                item = self.body()
                with LOCK:
                    db = load_db()
                    item["id"] = next_id(db[key], prefix)
                    item.setdefault("añadido", datetime.now().isoformat(timespec="seconds"))
                    if key == "peliculas":
                        item.setdefault("ids", {})
                        item.setdefault("taquilla", {})
                        item.setdefault("origen", "app")
                    db[key].append(item)
                    # si estaba en pendientes, se quita
                    if key == "peliculas" and item.get("desdePendiente"):
                        db["pendientes"] = [w for w in db["pendientes"] if w["id"] != item.pop("desdePendiente")]
                    save_db(db)
                if kind and not (item.get("ids") or {}).get("wikidata"):
                    enrich_background(kind, item["id"])
                return self.send_json(item, 201)
            return self.send_json({"error": "no encontrado"}, 404)
        except Exception as e:
            return self.send_json({"error": str(e)}, 500)

    def do_PUT(self):
        parts, _ = self.parts()
        try:
            if len(parts) == 3 and parts[0] == "api" and parts[1] in self.COLLS:
                key, _, kind = self.COLLS[parts[1]]
                data = self.body()
                with LOCK:
                    db = load_db()
                    it = next((x for x in db[key] if x["id"] == parts[2]), None)
                    if not it:
                        return self.send_json({"error": "no existe"}, 404)
                    data.pop("id", None)
                    it.update(data)
                    save_db(db)
                return self.send_json(it)
            return self.send_json({"error": "no encontrado"}, 404)
        except Exception as e:
            return self.send_json({"error": str(e)}, 500)

    def do_DELETE(self):
        parts, _ = self.parts()
        if len(parts) == 3 and parts[0] == "api" and parts[1] in self.COLLS:
            key = self.COLLS[parts[1]][0]
            with LOCK:
                db = load_db()
                db[key] = [x for x in db[key] if x["id"] != parts[2]]
                save_db(db)
            return self.send_json({"ok": True})
        return self.send_json({"error": "no encontrado"}, 404)


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if not DB_PATH.exists():
        print("No existe data/db.json. Ejecuta primero: python tools/importar_excel.py <tu Excel>")
        sys.exit(1)
    if not excel.XLSX_PATH.exists():
        regenerate_excel()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}"
    print(f"\n  Mi Cinemateca en marcha → {url}\n  (Cierra esta ventana para apagarla)\n")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

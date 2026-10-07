// API de Mi Cinemateca en Vercel: lectura pública y edición con PIN.
// Los datos se guardan en Vercel Blob; si aún no hay nada guardado, se usa la
// copia publicada (/data/db.json). Rutas (vercel.json): /api/<ruta> -> ?ruta=<ruta>
import { head, put } from "@vercel/blob";
import { COLECCIONES, actualizar, borrar, crear, fusionar, pinValido } from "../lib/cinemateca.mjs";

const CLAVE = "cinemateca/db.json";
const hayAlmacen = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

async function cargar(req) {
  if (hayAlmacen()) {
    try {
      const h = await head(CLAVE);
      const r = await fetch(`${h.url}?t=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) {
      /* aún no hay nada guardado */
    }
  }
  const r = await fetch(new URL("/data/db.json", req.url));
  if (!r.ok) throw new Error("No hay datos iniciales");
  return r.json();
}

const guardar = (db) =>
  put(CLAVE, JSON.stringify(db), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });

async function manejar(req) {
  const url = new URL(req.url);
  const partes = (url.searchParams.get("ruta") || "").split("/").filter(Boolean);
  try {
    if (req.method === "GET" && partes[0] === "db") {
      const db = await cargar(req);
      return json({ ...db, estado: { web: true, edicion: !!process.env.EDIT_PIN && hayAlmacen() } });
    }
    const pinCorrecto = process.env.EDIT_PIN;
    if (!pinCorrecto) return json({ error: "La edición no está activada: falta la variable EDIT_PIN en Vercel." }, 403);
    if (!pinValido(req.headers.get("x-pin"), pinCorrecto)) {
      await new Promise((r) => setTimeout(r, 800)); // frena intentos a ciegas
      return json({ error: "PIN incorrecto" }, 401);
    }
    if (!hayAlmacen()) return json({ error: "Falta conectar el almacenamiento: en Vercel, Storage → Create → Blob." }, 503);
    if (req.method === "POST" && partes[0] === "login") return json({ ok: true });

    const db = await cargar(req);
    if (req.method === "POST" && partes[0] === "sync") {
      const entrante = await req.json();
      if (!Array.isArray(entrante?.peliculas)) return json({ error: "Datos no válidos" }, 400);
      const fusion = fusionar(db, entrante);
      await guardar(fusion);
      return json(fusion);
    }
    const col = partes[0];
    if (!COLECCIONES[col]) return json({ error: "No encontrado" }, 404);
    if (req.method === "POST" && partes.length === 1) {
      const item = crear(db, col, await req.json());
      await guardar(db);
      return json(item, 201);
    }
    if (req.method === "PUT" && partes.length === 2) {
      const item = actualizar(db, col, partes[1], await req.json());
      if (!item) return json({ error: "No existe" }, 404);
      await guardar(db);
      return json(item);
    }
    if (req.method === "DELETE" && partes.length === 2) {
      borrar(db, col, partes[1]);
      await guardar(db);
      return json({ ok: true });
    }
    return json({ error: "No encontrado" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
export const DELETE = manejar;

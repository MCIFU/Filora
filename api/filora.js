// API de Filora en Vercel.
// - Sin sesión: la colección pública del dueño (lectura); el dueño edita con su PIN.
// - Con cuenta (usuario y contraseña): cada usuario lee y edita solo su colección.
// Los datos se guardan en Vercel Blob. Las cuentas y colecciones de usuario van en
// rutas con una parte aleatoria, así que sus direcciones no se pueden adivinar.
// Rutas (vercel.json): /api/<ruta> -> ?ruta=<ruta>
import { randomBytes } from "node:crypto";
import { head, list, put } from "@vercel/blob";
import { COLECCIONES, actualizar, borrar, crear, fusionar, pinValido } from "../lib/filora.mjs";
import { claveValida, crearSesion, hashClave, leerSesion, normalizarUsuario, nuevaColeccion, verificarClave } from "../lib/cuentas.mjs";

const CLAVE = "filora/db.json";
const hayAlmacen = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const leerJSON = async (url) => {
  const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
  return r.ok ? r.json() : null;
};

async function cargar(req) {
  if (hayAlmacen()) {
    try {
      const h = await head(CLAVE);
      const db = await leerJSON(h.url);
      if (db) return db;
    } catch (e) {
      /* aún no hay nada guardado */
    }
  }
  const r = await fetch(new URL("/data/db.json", req.url));
  if (!r.ok) throw new Error("No hay datos iniciales");
  return r.json();
}

const guardar = (db, ruta = CLAVE) =>
  put(ruta, JSON.stringify(db), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });

// ---------------------------------------------------------------- cuentas
async function secreto() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const { blobs } = await list({ prefix: "filora/privado/secreto" });
  if (blobs[0]) return (await leerJSON(blobs[0].url)).s;
  const s = randomBytes(32).toString("base64url");
  await put("filora/privado/secreto.json", JSON.stringify({ s }), { access: "public", addRandomSuffix: true, contentType: "application/json" });
  return s;
}

async function leerCuenta(usuario) {
  const { blobs } = await list({ prefix: `filora/usuarios/${usuario}/cuenta` });
  return blobs[0] ? leerJSON(blobs[0].url) : null;
}

const rutaDatos = (c) => `filora/usuarios/${c.usuario}/${c.carpeta}/datos.json`;

async function cargarUsuario(c) {
  try {
    const h = await head(rutaDatos(c));
    return (await leerJSON(h.url)) || nuevaColeccion();
  } catch (e) {
    return nuevaColeccion();
  }
}

async function cuentaDeSesion(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const usuario = leerSesion(m[1], await secreto());
  return usuario ? leerCuenta(usuario) : null;
}

async function registroOEntrada(req, accion) {
  const b = await req.json().catch(() => ({}));
  const usuario = normalizarUsuario(b.usuario);
  if (!usuario) return json({ error: "El usuario debe tener de 3 a 24 letras, números, puntos o guiones (sin espacios)." }, 400);
  if (!claveValida(b.clave)) return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
  const cuenta = await leerCuenta(usuario);
  if (accion === "registro") {
    if (cuenta) return json({ error: "Ese usuario ya existe. Prueba con otro o entra con tu contraseña." }, 409);
    const nueva = { usuario, clave: hashClave(b.clave), carpeta: randomBytes(12).toString("hex"), creado: new Date().toISOString() };
    await put(`filora/usuarios/${usuario}/cuenta.json`, JSON.stringify(nueva), { access: "public", addRandomSuffix: true, contentType: "application/json" });
    await guardar(nuevaColeccion(), rutaDatos(nueva));
    return json({ usuario, token: crearSesion(usuario, await secreto()) }, 201);
  }
  if (!cuenta || !verificarClave(b.clave, cuenta.clave)) {
    await espera(800); // frena intentos a ciegas
    return json({ error: "Usuario o contraseña incorrectos." }, 401);
  }
  return json({ usuario, token: crearSesion(usuario, await secreto()) });
}

// Aplica una operación (crear, editar, borrar, sincronizar) sobre una colección y la guarda.
async function operar(req, partes, db, guardarEn) {
  if (req.method === "POST" && partes[0] === "sync") {
    const entrante = await req.json();
    if (!Array.isArray(entrante?.peliculas)) return json({ error: "Datos no válidos" }, 400);
    const fusion = fusionar(db, entrante);
    await guardarEn(fusion);
    return json(fusion);
  }
  const col = partes[0];
  if (!COLECCIONES[col]) return json({ error: "No encontrado" }, 404);
  if (req.method === "POST" && partes.length === 1) {
    const item = crear(db, col, await req.json());
    await guardarEn(db);
    return json(item, 201);
  }
  if (req.method === "PUT" && partes.length === 2) {
    const item = actualizar(db, col, partes[1], await req.json());
    if (!item) return json({ error: "No existe" }, 404);
    await guardarEn(db);
    return json(item);
  }
  if (req.method === "DELETE" && partes.length === 2) {
    borrar(db, col, partes[1]);
    await guardarEn(db);
    return json({ ok: true });
  }
  return json({ error: "No encontrado" }, 404);
}

async function manejar(req) {
  const url = new URL(req.url);
  const partes = (url.searchParams.get("ruta") || "").split("/").filter(Boolean);
  try {
    // ---- cuentas de usuario
    if (req.method === "POST" && (partes[0] === "registro" || partes[0] === "entrar")) {
      if (!hayAlmacen()) return json({ error: "Las cuentas aún no están activadas: falta conectar el almacenamiento Blob en Vercel." }, 503);
      return await registroOEntrada(req, partes[0]);
    }
    if (req.headers.get("authorization")) {
      if (!hayAlmacen()) return json({ error: "Falta conectar el almacenamiento Blob en Vercel." }, 503);
      const cuenta = await cuentaDeSesion(req);
      if (!cuenta) return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401);
      const db = await cargarUsuario(cuenta);
      if (req.method === "GET" && partes[0] === "db") return json({ ...db, estado: { web: true, edicion: true, usuario: cuenta.usuario } });
      return await operar(req, partes, db, (d) => guardar(d, rutaDatos(cuenta)));
    }

    // ---- colección pública del dueño (lectura libre, edición con PIN)
    if (req.method === "GET" && partes[0] === "db") {
      const db = await cargar(req);
      return json({ ...db, estado: { web: true, edicion: !!process.env.EDIT_PIN && hayAlmacen(), cuentas: hayAlmacen() } });
    }
    const pinCorrecto = process.env.EDIT_PIN;
    if (!pinCorrecto) return json({ error: "La edición no está activada: falta la variable EDIT_PIN en Vercel." }, 403);
    if (!pinValido(req.headers.get("x-pin"), pinCorrecto)) {
      await espera(800); // frena intentos a ciegas
      return json({ error: "PIN incorrecto" }, 401);
    }
    if (!hayAlmacen()) return json({ error: "Falta conectar el almacenamiento: en Vercel, Storage → Create → Blob." }, 503);
    if (req.method === "POST" && partes[0] === "login") return json({ ok: true });
    return await operar(req, partes, await cargar(req), (d) => guardar(d));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
export const DELETE = manejar;

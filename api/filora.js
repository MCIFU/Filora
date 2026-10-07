// API de Filora en Vercel. Todas las colecciones son privadas:
// - Sin sesión no se ve ninguna colección (solo cartelera, estrenos y recomendaciones).
// - Con cuenta (usuario y contraseña) cada usuario lee y edita solo la suya.
// - La cuenta del dueño (OWNER_USER, por defecto "mcifu") usa su colección de siempre
//   (filora/db.json, la que sincroniza el PC con el PIN); para crearla hace falta el PIN.
// Los datos se guardan en Vercel Blob. Las cuentas y colecciones de usuario van en
// rutas con una parte aleatoria, así que sus direcciones no se pueden adivinar.
// Rutas (vercel.json): /api/<ruta> -> ?ruta=<ruta>
import { randomBytes } from "node:crypto";
import { head, list, put } from "@vercel/blob";
import { COLECCIONES, actualizar, anotarDemanda, borrar, cinesActivos, crear, fusionar, guardarPreferencias, idsCineValidos, pinValido } from "../lib/filora.mjs";
import { claveValida, crearSesion, datosSesion, hashClave, normalizarUsuario, nuevaColeccion, verificarClave } from "../lib/cuentas.mjs";

const CLAVE = "filora/db.json";
const DUENO = (process.env.OWNER_USER || "mcifu").toLowerCase();
// Vercel conecta el almacenamiento con OIDC (BLOB_STORE_ID) o, en proyectos antiguos, con un token.
const hayAlmacen = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const leerJSON = async (url) => {
  const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
  return r.ok ? r.json() : null;
};

// Colección del dueño: la guardada en Blob (la sube el PC al sincronizar o se importa
// desde la web). El repositorio no contiene ninguna colección.
async function cargar() {
  if (hayAlmacen()) {
    try {
      const h = await head(CLAVE);
      const db = await leerJSON(h.url);
      if (db) return db;
    } catch (e) {
      /* aún no hay nada guardado */
    }
  }
  return nuevaColeccion();
}

const guardar = (db, ruta = CLAVE) =>
  put(ruta, JSON.stringify(db), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });

// ---------------------------------------------------------------- cuentas
// Se guarda en memoria mientras la función siga activa: menos operaciones de Blob (el plan gratis tiene un cupo).
let SECRETO = null;
async function secreto() {
  return (SECRETO ||= await leerSecreto());
}
async function leerSecreto() {
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

const rutaDatos = (c) => (c.dueno ? CLAVE : `filora/usuarios/${c.usuario}/${c.carpeta}/datos.json`);

async function cargarUsuario(c) {
  if (c.dueno) return cargar();
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
  const d = datosSesion(m[1], await secreto());
  if (!d) return null;
  if (d.c) return { usuario: d.u, carpeta: d.c, dueno: !!d.d }; // la sesión ya dice dónde están sus datos
  return leerCuenta(d.u); // sesiones antiguas
}

async function registroOEntrada(req, accion) {
  const b = await req.json().catch(() => ({}));
  const usuario = normalizarUsuario(b.usuario);
  if (!usuario) return json({ error: "El usuario debe tener de 3 a 24 letras, números, puntos o guiones (sin espacios)." }, 400);
  if (!claveValida(b.clave)) return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
  const cuenta = await leerCuenta(usuario);
  if (accion === "registro") {
    if (cuenta) return json({ error: "Ese usuario ya existe. Prueba con otro o entra con tu contraseña." }, 409);
    const dueno = usuario === DUENO;
    if (dueno && !pinValido(String(b.pin || ""), process.env.EDIT_PIN)) {
      await espera(800);
      return json({ error: "Este usuario es el del dueño: escribe también tu PIN para crearlo.", pedirPin: true }, 403);
    }
    const nueva = { usuario, clave: hashClave(b.clave), carpeta: randomBytes(12).toString("hex"), creado: new Date().toISOString(), ...(dueno ? { dueno: true } : {}) };
    await put(`filora/usuarios/${usuario}/cuenta.json`, JSON.stringify(nueva), { access: "public", addRandomSuffix: true, contentType: "application/json" });
    if (!dueno) await guardar(nuevaColeccion(), rutaDatos(nueva));
    return json({ usuario, token: crearSesion(usuario, await secreto(), Date.now(), { c: nueva.carpeta, ...(dueno ? { d: 1 } : {}) }) }, 201);
  }
  if (!cuenta || !verificarClave(b.clave, cuenta.clave)) {
    await espera(800); // frena intentos a ciegas
    return json({ error: "Usuario o contraseña incorrectos." }, 401);
  }
  return json({ usuario, token: crearSesion(usuario, await secreto(), Date.now(), { c: cuenta.carpeta, ...(cuenta.dueno ? { d: 1 } : {}) }) });
}

// ---------------------------------------------------------------- cines pedidos
// Lista pública de ids de cine que alguien ha elegido: el robot diario descarga sus sesiones.
const DEMANDA = "filora/demanda.json";

// Si hay clave de GitHub (GH_DISPATCH_TOKEN, permiso «Actions: write» solo en este repositorio),
// un cine que nadie había pedido lanza la descarga al momento en vez de esperar al turno.
async function lanzarDescarga() {
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return false;
  const repo = process.env.GH_REPO || "MCIFU/Filora";
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/cartelera.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "Filora", "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!r || !r.ok) console.error("No se pudo lanzar la descarga", r && r.status);
  return !!(r && r.ok);
}

// Solo cines que existen en el catálogo publicado (evita pedir descargas de ids inventados).
async function enCatalogo(req, ids) {
  try {
    const r = await fetch(new URL("/data/cines_es.json", req.url));
    const validos = new Set((await r.json()).cines.map((c) => c.id));
    return ids.filter((id) => validos.has(id));
  } catch (e) {
    return ids;
  }
}
async function leerDemanda() {
  try {
    return (await leerJSON((await head(DEMANDA)).url)) || {};
  } catch (e) {
    return {};
  }
}

// Aplica una operación (crear, editar, borrar, sincronizar) sobre una colección y la guarda.
async function operar(req, partes, db, guardarEn) {
  if (req.method === "PUT" && partes[0] === "preferencias") {
    const b = await req.json().catch(() => ({}));
    const prefs = guardarPreferencias(db, { cines: Array.isArray(b.cines) ? b.cines.slice(0, 12) : [] });
    await guardarEn(db);
    return json(prefs);
  }
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
    // ---- cines elegidos (anónimo): alimenta la descarga diaria de sesiones
    if (partes[0] === "demanda") {
      if (req.method === "GET") return json({ cines: hayAlmacen() ? cinesActivos(await leerDemanda()) : [] });
      if (req.method === "POST") {
        if (!hayAlmacen()) return json({ ok: false }, 503);
        const ids = await enCatalogo(req, idsCineValidos((await req.json().catch(() => ({}))).cines));
        if (!ids.length) return json({ error: "Sin cines" }, 400);
        const antes = await leerDemanda();
        const nuevos = ids.filter((id) => !antes[id]);
        await guardar(anotarDemanda(antes, ids), DEMANDA);
        const descargando = nuevos.length ? await lanzarDescarga() : false;
        return json({ ok: true, nuevos, descargando });
      }
    }
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

    // ---- sin cuenta: ninguna colección (es privada); el PC del dueño entra con el PIN
    const pinCorrecto = process.env.EDIT_PIN;
    if (req.method === "GET" && partes[0] === "db" && !req.headers.get("x-pin")) {
      return json({ ...nuevaColeccion(), estado: { web: true, privada: true, cuentas: hayAlmacen() } });
    }
    if (!pinCorrecto) return json({ error: "La edición no está activada: falta la variable EDIT_PIN en Vercel." }, 403);
    if (!pinValido(req.headers.get("x-pin"), pinCorrecto)) {
      await espera(800); // frena intentos a ciegas
      return json({ error: "PIN incorrecto" }, 401);
    }
    if (!hayAlmacen()) return json({ error: "Falta conectar el almacenamiento: en Vercel, Storage → Create → Blob." }, 503);
    if (req.method === "POST" && partes[0] === "login") return json({ ok: true });
    if (req.method === "GET" && partes[0] === "db") return json({ ...(await cargar()), estado: { web: true, edicion: true } });
    return await operar(req, partes, await cargar(), (d) => guardar(d));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
export const DELETE = manejar;

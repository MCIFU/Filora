// Pruebas de las cuentas de usuario de la API de Vercel con un Blob simulado en memoria.
// node tests/cuentas.test.mjs
import assert from "node:assert/strict";
import { register } from "node:module";
import { claveValida, crearSesion, hashClave, leerSesion, normalizarUsuario, verificarClave } from "../lib/cuentas.mjs";

// ---- funciones sueltas
assert.equal(normalizarUsuario("  Marta.G "), "marta.g");
assert.equal(normalizarUsuario("ab"), null);
assert.equal(normalizarUsuario("con espacio"), null);
assert.equal(claveValida("12345"), false);
const h = hashClave("palomitas");
assert.ok(verificarClave("palomitas", h));
assert.ok(!verificarClave("palomita", h));
const tk = crearSesion("marta", "secreto");
assert.equal(leerSesion(tk, "secreto"), "marta");
assert.equal(leerSesion(tk, "otro"), null);
assert.equal(leerSesion(tk.replace(/^./, "x"), "secreto"), null);
assert.equal(leerSesion(crearSesion("marta", "secreto", Date.now() - 200 * 864e5), "secreto"), null);

// ---- API completa con @vercel/blob simulado
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(s, c, next) {
  if (s === "@vercel/blob") return { url: new URL("./blob-falso.mjs", ${JSON.stringify(import.meta.url)}).href, shortCircuit: true };
  return next(s, c);
}`));
process.env.BLOB_READ_WRITE_TOKEN = "falso";
process.env.EDIT_PIN = "4321";
process.env.OWNER_USER = "mcifu";
const { almacen } = await import("./blob-falso.mjs");
const real = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const s = String(u);
  if (s.endsWith("/data/cines_es.json")) return new Response(JSON.stringify({ cines: [{ id: 402 }, { id: 1269 }] }));
  if (s.startsWith("https://blob.test/")) {
    const v = almacen.get(decodeURIComponent(s.slice(18).split("?")[0]));
    return v == null ? new Response("", { status: 404 }) : new Response(v);
  }
  return real(u, o);
};
const { GET, POST, PUT, DELETE } = await import("../api/filora.js");
const llamar = async (fn, ruta, { cuerpo, token, metodo } = {}) => {
  const req = new Request(`https://filora.test/api/filora?ruta=${ruta}`, {
    method: metodo || (cuerpo ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const r = await fn(req);
  return { status: r.status, j: await r.json() };
};

let r = await llamar(POST, "registro", { cuerpo: { usuario: "Marta", clave: "123" } });
assert.equal(r.status, 400, "contraseña corta");
r = await llamar(POST, "registro", { cuerpo: { usuario: "Marta", clave: "palomitas" } });
assert.equal(r.status, 201);
const tokMarta = r.j.token;
r = await llamar(POST, "registro", { cuerpo: { usuario: "marta", clave: "otra-clave" } });
assert.equal(r.status, 409, "usuario repetido");
r = await llamar(POST, "entrar", { cuerpo: { usuario: "marta", clave: "mal-clave" } });
assert.equal(r.status, 401);
r = await llamar(POST, "entrar", { cuerpo: { usuario: "MARTA", clave: "palomitas" } });
assert.equal(r.status, 200);

r = await llamar(GET, "db", { token: tokMarta });
assert.equal(r.j.peliculas.length, 0, "cuenta nueva vacía");
assert.equal(r.j.estado.usuario, "marta");
r = await llamar(POST, "peliculas", { cuerpo: { titulo: "Amélie", nota: 9 }, token: tokMarta });
assert.equal(r.status, 201);
const id = r.j.id;
r = await llamar(PUT, `peliculas/${id}`, { cuerpo: { nota: 9.5 }, token: tokMarta, metodo: "PUT" });
assert.equal(r.j.nota, 9.5);

// otro usuario no ve lo de Marta
r = await llamar(POST, "registro", { cuerpo: { usuario: "luis", clave: "secreto1" } });
const tokLuis = r.j.token;
r = await llamar(GET, "db", { token: tokLuis });
assert.equal(r.j.peliculas.length, 0);
r = await llamar(GET, "db", { token: tokMarta });
assert.deepEqual(r.j.peliculas.map((p) => [p.titulo, p.nota]), [["Amélie", 9.5]]);

// sin sesión no se ve ninguna colección
r = await llamar(GET, "db");
assert.equal(r.j.peliculas.length, 0, "sin cuenta no se ve nada");
assert.equal(r.j.estado.privada, true);

// la cuenta del dueño solo se crea con el PIN y recibe su colección de siempre
r = await llamar(POST, "registro", { cuerpo: { usuario: "MCIFU", clave: "una-clave" } });
assert.equal(r.status, 403);
assert.equal(r.j.pedirPin, true);
r = await llamar(POST, "registro", { cuerpo: { usuario: "MCIFU", clave: "una-clave", pin: "0000" } });
assert.equal(r.status, 403, "PIN incorrecto");
r = await llamar(POST, "registro", { cuerpo: { usuario: "MCIFU", clave: "una-clave", pin: "4321" } });
assert.equal(r.status, 201);
const tokDueno = r.j.token;
// el PC del dueño sube su colección con el PIN y la cuenta la ve
const sync = await POST(new Request("https://filora.test/api/filora?ruta=sync", { method: "POST", headers: { "X-Pin": "4321", "Content-Type": "application/json" },
  body: JSON.stringify({ peliculas: [{ id: "p1", titulo: "Origen", nota: 10, mod: "2026-01-01T00:00:00" }], series: [], pendientes: [] }) }));
assert.equal(sync.status, 200);
r = await llamar(GET, "db", { token: tokDueno });
assert.deepEqual(r.j.peliculas.map((p) => p.titulo), ["Origen"], "el dueño ve su colección");
r = await llamar(POST, "peliculas", { cuerpo: { titulo: "Prueba del dueño", nota: 7 }, token: tokDueno });
assert.ok(almacen.has("filora/db.json"), "se guarda en la colección del dueño (la que sincroniza el PC)");
r = await llamar(GET, "db", { token: tokMarta });
assert.ok(!r.j.peliculas.some((p) => p.titulo === "Prueba del dueño"), "otros no la ven");

// sesión falsa
r = await llamar(GET, "db", { token: tokMarta.slice(0, -2) + "xx" });
assert.equal(r.status, 401);
r = await llamar(DELETE, `peliculas/${id}`, { token: tokMarta, metodo: "DELETE" });
r = await llamar(GET, "db", { token: tokMarta });
assert.equal(r.j.peliculas.length, 0);

// tus cines se guardan en tu cuenta
r = await llamar(PUT, "preferencias", { cuerpo: { cines: [{ id: 402, nombre: "Yelmo" }] }, token: tokLuis, metodo: "PUT" });
assert.deepEqual(r.j.cines, [{ id: 402, nombre: "Yelmo" }]);
r = await llamar(GET, "db", { token: tokLuis });
assert.equal(r.j.preferencias.cines[0].id, 402);
r = await llamar(GET, "db", { token: tokMarta });
assert.equal(r.j.preferencias, undefined, "los cines de otro no aparecen");

// cines pedidos (sin cuenta)
r = await llamar(POST, "demanda", { cuerpo: { cines: [402, "1269", "malo", 77777] } });
assert.equal(r.status, 200);
assert.deepEqual(r.j.nuevos.sort(), [1269, 402], "77777 no está en el catálogo");
assert.equal(r.j.descargando, false, "sin clave de GitHub no se lanza nada");
r = await llamar(POST, "demanda", { cuerpo: { cines: [402] } });
assert.deepEqual(r.j.nuevos, [], "un cine ya pedido no es nuevo");
r = await llamar(GET, "demanda");
assert.deepEqual(r.j.cines.sort(), [1269, 402]);

// las contraseñas no se guardan en claro
assert.ok(![...almacen.values()].some((v) => v.includes("palomitas")));
console.log("✓ Cuentas: registro, entrada, sesiones y colecciones separadas");

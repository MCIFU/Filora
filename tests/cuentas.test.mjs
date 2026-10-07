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
r = await llamar(GET, "db", { token: tokDueno });
assert.ok(r.j.peliculas.length > 100, "el dueño ve su colección");
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

// las contraseñas no se guardan en claro
assert.ok(![...almacen.values()].some((v) => v.includes("palomitas")));
console.log("✓ Cuentas: registro, entrada, sesiones y colecciones separadas");

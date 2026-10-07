// Cuentas de usuario de Filora: contraseñas con scrypt y sesiones firmadas (HMAC).
// Sin dependencias: solo node:crypto. Lo usan api/filora.js y las pruebas.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const DIAS_SESION = 180;

// 3–24 caracteres: letras, números, punto, guion y guion bajo. Se guarda en minúsculas.
export function normalizarUsuario(u) {
  const n = String(u || "").trim().toLowerCase();
  return /^[a-z0-9._-]{3,24}$/.test(n) ? n : null;
}

export function claveValida(c) {
  return typeof c === "string" && c.length >= 6 && c.length <= 200;
}

export function hashClave(clave) {
  const sal = randomBytes(16);
  const h = scryptSync(clave, sal, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${sal.toString("base64url")}$${h.toString("base64url")}`;
}

export function verificarClave(clave, guardado) {
  const [tipo, sal, h] = String(guardado || "").split("$");
  if (tipo !== "scrypt" || !sal || !h) return false;
  const esperado = Buffer.from(h, "base64url");
  const dado = scryptSync(String(clave || ""), Buffer.from(sal, "base64url"), esperado.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(dado, esperado);
}

const firma = (datos, secreto) => createHmac("sha256", secreto).update(datos).digest("base64url");

export function crearSesion(usuario, secreto, ahora = Date.now()) {
  const datos = Buffer.from(JSON.stringify({ u: usuario, exp: ahora + DIAS_SESION * 864e5 })).toString("base64url");
  return `${datos}.${firma(datos, secreto)}`;
}

// Devuelve el usuario si la sesión es válida y no ha caducado; si no, null.
export function leerSesion(token, secreto, ahora = Date.now()) {
  const [datos, f] = String(token || "").split(".");
  if (!datos || !f) return null;
  const a = Buffer.from(f), b = Buffer.from(firma(datos, secreto));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(datos, "base64url").toString());
    return exp > ahora ? normalizarUsuario(u) : null;
  } catch (e) {
    return null;
  }
}

export const nuevaColeccion = () => ({ peliculas: [], series: [], pendientes: [], borrados: {}, actualizado: new Date().toISOString().slice(0, 19) });

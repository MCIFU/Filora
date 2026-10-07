// Sustituto en memoria de @vercel/blob para las pruebas (head, list, put).
export const almacen = new Map();
const url = (p) => `https://blob.test/${encodeURIComponent(p)}`;

export async function put(ruta, cuerpo, opts = {}) {
  let p = ruta;
  if (opts.addRandomSuffix) p = ruta.replace(/(\.[a-z]+)$/, `-${Math.random().toString(36).slice(2, 12)}$1`);
  else if (almacen.has(p) && !opts.allowOverwrite) throw new Error("ya existe");
  almacen.set(p, String(cuerpo));
  return { url: url(p), pathname: p };
}
export async function head(ruta) {
  if (!almacen.has(ruta)) throw new Error("BlobNotFoundError");
  return { url: url(ruta), pathname: ruta };
}
export async function list({ prefix = "" } = {}) {
  return { blobs: [...almacen.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ url: url(k), pathname: k })) };
}

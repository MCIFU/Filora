// Lógica pura de la base de datos de Filora (sin dependencias de Netlify),
// compartida por las funciones de Vercel y Netlify y por las pruebas (node tests/api.test.mjs).


export const COLECCIONES = { peliculas: "p", series: "s", pendientes: "w" };

export const ahora = () => new Date().toISOString().slice(0, 19);

// Ids con fecha y hora: únicos aunque se añadan a la vez desde el PC y desde el móvil.
export function nuevoId(prefijo) {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, "0");
  const t = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${prefijo}${t}${p(Math.floor(Math.random() * 1e6), 6)}`;
}

function limpiar(db) {
  const { estado, config, ...resto } = db;
  return resto;
}

// Fusiona dos versiones: por cada elemento gana la modificación más reciente;
// los borrados (con su fecha) eliminan versiones más antiguas.
export function fusionar(base, entrante) {
  base = limpiar(base);
  entrante = limpiar(entrante);
  const borrados = { ...(base.borrados || {}) };
  for (const [id, t] of Object.entries(entrante.borrados || {})) {
    if (!borrados[id] || t > borrados[id]) borrados[id] = t;
  }
  const out = { ...entrante, ...base, borrados };
  for (const col of Object.keys(COLECCIONES)) {
    const mapa = new Map();
    for (const it of (base[col]) || []) mapa.set(it.id, it);
    for (const it of (entrante[col]) || []) {
      const actual = mapa.get(it.id);
      if (!actual || (it.mod || "") > (actual.mod || "")) mapa.set(it.id, it);
    }
    out[col] = [...mapa.values()].filter((it) => !(borrados[it.id] && borrados[it.id] >= (it.mod || "")));
  }
  out.actualizado = ahora();
  return out;
}

export function crear(db, col, datos) {
  const item = { ...datos, id: nuevoId(COLECCIONES[col]), mod: ahora() };
  if (!item["añadido"]) item["añadido"] = item.mod;
  if (col === "peliculas") {
    item.ids = item.ids || {};
    item.taquilla = item.taquilla || {};
    item.origen = item.origen || "web";
  }
  const desde = item.desdePendiente;
  delete item.desdePendiente;
  (db[col]).push(item);
  if (col === "peliculas" && desde) borrar(db, "pendientes", desde);
  db.actualizado = ahora();
  return item;
}

export function actualizar(db, col, id, datos) {
  const item = (db[col]).find((x) => x.id === id);
  if (!item) return null;
  const { id: _ignorado, ...resto } = datos;
  Object.assign(item, resto, { mod: ahora() });
  db.actualizado = ahora();
  return item;
}

export function borrar(db, col, id) {
  db[col] = (db[col]).filter((x) => x.id !== id);
  db.borrados = { ...(db.borrados || {}), [id]: ahora() };
  db.actualizado = ahora();
}

// Comparación en tiempo constante para no dar pistas del PIN.
export function pinValido(dado, correcto) {
  if (!correcto || !dado || correcto.length < 4) return false;
  let diff = dado.length ^ correcto.length;
  for (let i = 0; i < Math.max(dado.length, correcto.length); i++) {
    diff |= (dado.charCodeAt(i) || 0) ^ (correcto.charCodeAt(i) || 0);
  }
  return diff === 0;
}

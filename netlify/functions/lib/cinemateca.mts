// Lógica pura de la base de datos de Mi Cinemateca (sin dependencias de Netlify),
// para poder probarla en local con `node tests/api.test.mts`.

export type Item = { id: string; mod?: string; [k: string]: unknown };
export type DB = {
  peliculas: Item[];
  series: Item[];
  pendientes: Item[];
  borrados?: Record<string, string>;
  actualizado?: string;
  [k: string]: unknown;
};

export const COLECCIONES: Record<string, string> = { peliculas: "p", series: "s", pendientes: "w" };

export const ahora = () => new Date().toISOString().slice(0, 19);

// Ids con fecha y hora: únicos aunque se añadan a la vez desde el PC y desde el móvil.
export function nuevoId(prefijo: string): string {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  const t = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${prefijo}${t}${p(Math.floor(Math.random() * 1e6), 6)}`;
}

function limpiar(db: DB): DB {
  const { estado, config, ...resto } = db as DB & { estado?: unknown; config?: unknown };
  return resto as DB;
}

// Fusiona dos versiones: por cada elemento gana la modificación más reciente;
// los borrados (con su fecha) eliminan versiones más antiguas.
export function fusionar(base: DB, entrante: DB): DB {
  base = limpiar(base);
  entrante = limpiar(entrante);
  const borrados: Record<string, string> = { ...(base.borrados || {}) };
  for (const [id, t] of Object.entries(entrante.borrados || {})) {
    if (!borrados[id] || t > borrados[id]) borrados[id] = t;
  }
  const out: DB = { ...entrante, ...base, borrados } as DB;
  for (const col of Object.keys(COLECCIONES)) {
    const mapa = new Map<string, Item>();
    for (const it of (base[col] as Item[]) || []) mapa.set(it.id, it);
    for (const it of (entrante[col] as Item[]) || []) {
      const actual = mapa.get(it.id);
      if (!actual || (it.mod || "") > (actual.mod || "")) mapa.set(it.id, it);
    }
    (out as Record<string, unknown>)[col] = [...mapa.values()].filter((it) => !(borrados[it.id] && borrados[it.id] >= (it.mod || "")));
  }
  out.actualizado = ahora();
  return out;
}

export function crear(db: DB, col: string, datos: Record<string, unknown>): Item {
  const item: Item = { ...datos, id: nuevoId(COLECCIONES[col]), mod: ahora() };
  if (!item["añadido"]) item["añadido"] = item.mod;
  if (col === "peliculas") {
    item.ids = item.ids || {};
    item.taquilla = item.taquilla || {};
    item.origen = item.origen || "web";
  }
  const desde = item.desdePendiente as string | undefined;
  delete item.desdePendiente;
  (db[col] as Item[]).push(item);
  if (col === "peliculas" && desde) borrar(db, "pendientes", desde);
  db.actualizado = ahora();
  return item;
}

export function actualizar(db: DB, col: string, id: string, datos: Record<string, unknown>): Item | null {
  const item = (db[col] as Item[]).find((x) => x.id === id);
  if (!item) return null;
  const { id: _ignorado, ...resto } = datos;
  Object.assign(item, resto, { mod: ahora() });
  db.actualizado = ahora();
  return item;
}

export function borrar(db: DB, col: string, id: string): void {
  (db as Record<string, unknown>)[col] = (db[col] as Item[]).filter((x) => x.id !== id);
  db.borrados = { ...(db.borrados || {}), [id]: ahora() };
  db.actualizado = ahora();
}

// Comparación en tiempo constante para no dar pistas del PIN.
export function pinValido(dado: string | null, correcto: string | undefined): boolean {
  if (!correcto || !dado || correcto.length < 4) return false;
  let diff = dado.length ^ correcto.length;
  for (let i = 0; i < Math.max(dado.length, correcto.length); i++) {
    diff |= (dado.charCodeAt(i) || 0) ^ (correcto.charCodeAt(i) || 0);
  }
  return diff === 0;
}

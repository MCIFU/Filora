// Filora · Sincronización sin Vercel: la colección vive en un repositorio PRIVADO de GitHub (p. ej. MCIFU/filora-datos, archivo db.json).
// La web (y el móvil) la lee y la guarda con la API de GitHub usando tu clave personal, guardada solo en este navegador.
// La fusión es la misma que hace el servidor (lib/filora.mjs): por elemento gana el cambio más reciente y los borrados mandan.
// Se carga antes que app.js.

const NUBE_KEY = "filora.github";
function nubeCfg() { try { const c = JSON.parse(localStorage.getItem(NUBE_KEY) || "null"); return c && c.token && c.repo ? c : null; } catch (e) { return null; } }
function nubeGuardarCfg(c) { try { if (c) localStorage.setItem(NUBE_KEY, JSON.stringify(c)); else localStorage.removeItem(NUBE_KEY); } catch (e) { /* */ } }
const nubeActiva = () => !!nubeCfg();

// ---- misma lógica que lib/filora.mjs (fusionar, crear, actualizar, borrar)
const NUBE_COLS = { peliculas: "p", series: "s", pendientes: "w" };
const nubeAhora = () => new Date().toISOString().slice(0, 19);
function nubeId(prefijo) {
  const d = new Date(), p = (n, l = 2) => String(n).padStart(l, "0");
  return `${prefijo}${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}${p(Math.floor(Math.random() * 1e6), 6)}`;
}
function nubeFusionar(base, entrante) {
  const limpiar = (db) => { const { estado, config, ...resto } = db || {}; return resto; };
  base = limpiar(base); entrante = limpiar(entrante);
  const borrados = { ...(base.borrados || {}) };
  for (const [id, t] of Object.entries(entrante.borrados || {})) if (!borrados[id] || t > borrados[id]) borrados[id] = t;
  const out = { ...entrante, ...base, borrados };
  for (const col of Object.keys(NUBE_COLS)) {
    const mapa = new Map();
    for (const it of base[col] || []) mapa.set(it.id, it);
    for (const it of entrante[col] || []) { const a = mapa.get(it.id); if (!a || (it.mod || "") > (a.mod || "")) mapa.set(it.id, it); }
    out[col] = [...mapa.values()].filter((it) => !(borrados[it.id] && borrados[it.id] >= (it.mod || "")));
  }
  const pb = base.preferencias, pe = entrante.preferencias;
  if (pb || pe) out.preferencias = !pb ? pe : !pe ? pb : ((pe.mod || "") > (pb.mod || "") ? pe : pb);
  out.actualizado = nubeAhora();
  return out;
}
function nubeOperar(db, path, method, body) {
  const [col, id] = path.split("/");
  db.actualizado = nubeAhora();
  if (path === "sync" && method === "POST") return nubeFusionar(db, body);
  if (path === "preferencias" && method === "PUT") { db.preferencias = { ...(db.preferencias || {}), cines: (body.cines || []).slice(0, 12), mod: nubeAhora() }; return db.preferencias; }
  if (!NUBE_COLS[col]) throw new Error("No encontrado");
  db[col] = db[col] || [];
  if (method === "POST" && !id) {
    const item = { ...body, id: nubeId(NUBE_COLS[col]), mod: nubeAhora() };
    if (!item["añadido"]) item["añadido"] = item.mod;
    if (col === "peliculas") { item.ids = item.ids || {}; item.taquilla = item.taquilla || {}; item.origen = item.origen || "web"; }
    const desde = item.desdePendiente; delete item.desdePendiente;
    db[col].push(item);
    if (col === "peliculas" && desde) nubeOperar(db, `pendientes/${desde}`, "DELETE");
    return item;
  }
  if (method === "PUT" && id) {
    const item = db[col].find((x) => x.id === id);
    if (!item) throw new Error("No existe");
    const { id: _i, ...resto } = body || {};
    Object.assign(item, resto, { mod: nubeAhora() });
    return item;
  }
  if (method === "DELETE" && id) {
    db[col] = db[col].filter((x) => x.id !== id);
    db.borrados = { ...(db.borrados || {}), [id]: nubeAhora() };
    return { ok: true };
  }
  throw new Error("Operación no válida");
}

// ---- GitHub (api.github.com admite llamadas desde el navegador)
function nubeCabeceras(extra = {}) { return { Authorization: `Bearer ${nubeCfg().token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...extra }; }
const b64aTexto = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
function textoAb64(t) { const u = new TextEncoder().encode(t); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }
async function nubeLeerArchivo(repo, ruta) {
  const url = `https://api.github.com/repos/${repo}/contents/${ruta}`;
  const r = await fetch(url, { headers: nubeCabeceras(), cache: "no-store" });
  if (r.status === 404) return { datos: null, sha: null };
  if (r.status === 401 || r.status === 403) throw new Error("GitHub no acepta tu clave (revisa que no haya caducado y que tenga acceso al repositorio)");
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  const j = await r.json();
  let texto = j.content ? b64aTexto(j.content) : null;
  if (texto == null) { // más de 1 MB: se pide el contenido en bruto
    const r2 = await fetch(url, { headers: nubeCabeceras({ Accept: "application/vnd.github.raw+json" }), cache: "no-store" });
    if (!r2.ok) throw new Error(`GitHub respondió ${r2.status}`);
    texto = await r2.text();
  }
  return { datos: JSON.parse(texto), sha: j.sha };
}
async function nubeEscribirArchivo(repo, ruta, datos, sha, mensaje) {
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${ruta}`, { method: "PUT", headers: nubeCabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message: mensaje, content: textoAb64(JSON.stringify(datos)), ...(sha ? { sha } : {}) }) });
  if (r.status === 409 || r.status === 422) return null; // alguien guardó antes: se reintenta con la versión nueva
  if (!r.ok) throw new Error(`GitHub no guardó el cambio (${r.status})`);
  return (await r.json()).content.sha;
}
// Lee la colección; las escrituras releen, aplican y guardan (si otro dispositivo guardó a la vez, se repite)
async function nubeApi(path, opts = {}) {
  const { repo } = nubeCfg(), method = opts.method || "GET";
  for (let intento = 0; intento < 4; intento++) {
    const { datos, sha } = await nubeLeerArchivo(repo, "db.json");
    const db = datos || { peliculas: [], series: [], pendientes: [], borrados: {} };
    if (method === "GET" && path === "db") return { ...db, estado: { web: true, nube: true } };
    const res = nubeOperar(db, path, method, opts.body);
    const guardar = path === "sync" ? res : db;
    if (await nubeEscribirArchivo(repo, "db.json", guardar, sha, `Filora: ${method} ${path}`)) {
      if (path === "preferencias") nubeAvisarCines(guardar.preferencias).catch(() => {});
      return path === "sync" ? { ...res, estado: { web: true, nube: true } } : res;
    }
  }
  throw new Error("Otro dispositivo estaba guardando a la vez; prueba otra vez");
}
// Tus cines van también a MCIFU/Filora (data/demanda.json) para que el robot de la cartelera los descargue,
// y si hay uno nuevo se lanza la descarga al momento.
const FILORA_REPO = "MCIFU/Filora";
async function nubeAvisarCines(prefs) {
  const ids = ((prefs && prefs.cines) || []).map((c) => +c.id).filter(Boolean);
  if (!ids.length) return;
  const { datos, sha } = await nubeLeerArchivo(FILORA_REPO, "data/demanda.json").catch(() => ({ datos: null, sha: null }));
  const antes = new Set(((datos && datos.cines) || []).map(Number));
  const nuevos = ids.filter((i) => !antes.has(i));
  if (!nuevos.length && datos) return;
  await nubeEscribirArchivo(FILORA_REPO, "data/demanda.json", { cines: [...new Set([...ids, ...antes])].slice(0, 40), actualizado: nubeAhora() }, sha, "Cines elegidos para la cartelera");
  if (nuevos.length) await fetch(`https://api.github.com/repos/${FILORA_REPO}/actions/workflows/cartelera.yml/dispatches`, { method: "POST", headers: nubeCabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ref: "main", inputs: { cines: nuevos.join(",") } }) });
}
async function nubeProbar(c) {
  const r = await fetch(`https://api.github.com/repos/${c.repo}`, { headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" } });
  if (r.status === 404 || r.status === 401 || r.status === 403) throw new Error("No puedo entrar en ese repositorio con esa clave");
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  const j = await r.json();
  if (!j.private) throw new Error("Ese repositorio es público: tu colección quedaría a la vista. Usa uno privado");
}

/* ============================================================
   Filora · app
   ============================================================ */
"use strict";

// ---------------------------------------------------------------- utilidades
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt1 = (v) => (v == null ? "–" : Number(v).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const fmt2 = (v) => Number(v).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v) => Math.round(v).toLocaleString("es-ES", { useGrouping: "always" }).replace(/,/g, ".");
const money = (v) => {
  if (v == null) return "–";
  if (v >= 1e9) return `$${(v / 1e9).toLocaleString("es-ES", { maximumFractionDigits: 2 })} mil M`;
  if (v >= 1e6) return `$${(v / 1e6).toLocaleString("es-ES", { maximumFractionDigits: 1 })} M`;
  return `$${fmtInt(v)}`;
};
const splitDir = (d) => String(d || "").split(" / ").map((x) => x.trim()).filter(Boolean);
const todayISO = () => new Date().toISOString().slice(0, 10);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fechaLarga = (iso) => { const d = new Date(iso + "T12:00:00"); return `${d.getDate()} de ${MESES[d.getMonth()]}`; };
const diaSemana = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long" });

const GENEROS = ["Acción", "Aventura", "Animación", "Ciencia ficción", "Comedia", "Crimen", "Drama", "Fantasía", "Terror", "Thriller", "Romance", "Musical", "Bélico", "Western", "Superhéroes", "Misterio", "Biográfico", "Histórico", "Familiar", "Documental"];
const GEN_HUE = { "Acción": 12, "Aventura": 32, "Animación": 190, "Ciencia ficción": 210, "Comedia": 48, "Crimen": 350, "Drama": 260, "Fantasía": 285, "Terror": 0, "Thriller": 225, "Romance": 330, "Musical": 305, "Bélico": 80, "Western": 25, "Superhéroes": 200, "Misterio": 240, "Biográfico": 160, "Histórico": 38, "Familiar": 140, "Documental": 170 };
const GEN_FRASE = { "Acción": "el cine de acción", "Aventura": "las aventuras", "Animación": "la animación", "Ciencia ficción": "la ciencia ficción", "Comedia": "la comedia", "Crimen": "el cine criminal", "Drama": "el drama", "Fantasía": "la fantasía", "Terror": "el terror", "Thriller": "el thriller", "Romance": "el cine romántico", "Musical": "el musical", "Bélico": "el cine bélico", "Western": "el western", "Superhéroes": "los superhéroes", "Misterio": "el misterio", "Biográfico": "los biopics", "Histórico": "el cine histórico", "Familiar": "el cine familiar", "Documental": "el documental" };
const frase = (g) => GEN_FRASE[g] || g.toLowerCase();
const PLATAFORMAS = ["Netflix", "Prime Video", "Disney+", "Max", "Movistar Plus+", "Filmin", "SkyShowtime", "Apple TV+", "RTVE Play", "Atresplayer"];

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16V7"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  tv: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="m8 2.5 4 3.5 4-3.5"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.2 6.2C4.2 7.6 2.8 9.6 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
};
const icon = (n, fill = false) => `<span class="i"><svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg></span>`;

// color de la nota: rojo → ámbar → verde
function scoreColor(n) {
  if (n == null) return "var(--surface-3)";
  const h = n < 5 ? (350 + (n / 5) * 54) % 360 : 44 + ((n - 5) / 5) * 102;
  return `hsl(${h.toFixed(0)} ${n < 5 ? 72 : 64}% ${n < 5 ? 60 : 57}%)`;
}
const scoreBadge = (n, cls = "") => (n == null ? `<span class="score none ${cls}">–</span>` : `<span class="score ${cls}" style="--c:${scoreColor(n)}">${fmt1(n)}</span>`);
function veredicto(n) {
  if (n == null) return "Sin nota";
  if (n >= 9.5) return "Obra maestra absoluta";
  if (n >= 9) return "Obra maestra";
  if (n >= 8) return "Excelente";
  if (n >= 7) return "Muy buena";
  if (n >= 6) return "Buena";
  if (n >= 5) return "Pasable";
  if (n >= 4) return "Floja";
  if (n >= 2.5) return "Mala";
  return "Horrible";
}
function ring(pct) {
  const r = 10, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 26 26"><circle cx="13" cy="13" r="${r}" fill="none" stroke-width="3" style="stroke:rgba(var(--fg-rgb),.12)"/><circle cx="13" cy="13" r="${r}" fill="none" stroke="${pct >= 75 ? "#3ddc84" : pct >= 55 ? "var(--bombilla)" : "#94867a"}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 13 13)"/></svg>`;
}
const matchTag = (pct) => `<span class="match">${ring(pct)}${pct}%</span>`;

function posterHTML(item, big = false) {
  const g = (item.generos || [])[0];
  const h = GEN_HUE[g] ?? 40;
  const ph = `<div class="ph" style="--h:${h}"><b>${esc(item.titulo)}</b><span>${esc(item.anio || "")}</span></div>`;
  if (!item.poster) return ph;
  return `<img src="${esc(item.poster)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>${ph}</template>`;
}

// enlaces a tus webs de referencia
function extLinks(p) {
  const ids = p.ids || {};
  const q = encodeURIComponent(p.titulo);
  const qo = encodeURIComponent(p.tituloOriginal || p.titulo);
  const qy = encodeURIComponent(`${p.tituloOriginal || p.titulo} ${p.anio || ""}`.trim());
  return [
    { n: "FilmAffinity", c: "#1d4d8c", l: "FA", u: ids.filmaffinity ? `https://www.filmaffinity.com/es/film${ids.filmaffinity}.html` : `https://www.filmaffinity.com/es/search.php?stext=${q}` },
    { n: "IMDb", c: "#c9a200", l: "IMDb", u: ids.imdb ? `https://www.imdb.com/es-es/title/${ids.imdb}/` : `https://www.imdb.com/es-es/find/?q=${qy}` },
    { n: "SensaCine", c: "#e30613", l: "SC", u: ids.allocine ? `https://www.sensacine.com/peliculas/pelicula-${ids.allocine}/` : `https://www.sensacine.com/buscar/?q=${q}` },
    { n: "Letterboxd", c: "#202830", l: "LB", u: ids.letterboxd ? `https://letterboxd.com/film/${ids.letterboxd}/` : `https://letterboxd.com/search/films/${qo}/` },
    { n: "JustWatch", c: "#e7b32a", l: "JW", u: `https://www.justwatch.com/es/buscar?q=${q}` },
  ];
}
// Logos oficiales de cada web (app/img/logos); si no hay, la sigla sobre su color.
const LOGOS = { FA: "filmaffinity", IMDb: "imdb", RT: "rottentomatoes", SC: "sensacine", LB: "letterboxd", JW: "justwatch" };
const logoWeb = (sigla, color) => LOGOS[sigla]
  ? `<img class="logo logo-img" src="img/logos/${LOGOS[sigla]}.png" alt="" width="30" height="30" loading="lazy">`
  : `<span class="logo" style="background:${color}">${sigla}</span>`;
const linksHTML = (p) => `<div class="links">${extLinks(p).map((l) => `<a class="ext" href="${esc(l.u)}" target="_blank" rel="noopener">${logoWeb(l.l, l.c)}${l.n}</a>`).join("")}</div>`;

// ---------------------------------------------------------------- estado + API
const S = {
  db: null, est: null, cat: null, prof: null,
  coll: { q: "", genre: "", decade: "", country: "", saga: "", min: "", sort: "nota", mode: "grid", limit: 120 },
  recs: { genre: "", era: "", hideSeen: true },
  est_: { mode: "lista", filter: "todos", month: null },
  series: { tipo: "" },
};
try { Object.assign(S.coll, JSON.parse(localStorage.getItem("cine.coll") || "{}"), { limit: 120 }); } catch (e) { /* sin storage */ }
const saveUI = () => { try { localStorage.setItem("cine.coll", JSON.stringify({ mode: S.coll.mode, sort: S.coll.sort })); } catch (e) { /* */ } };

// Versión pública (Netlify): sin servidor, lee JSON estáticos y no permite editar.
// Modo PC (servidor local server.py, también detrás de DeployHub en *.localhost) o web publicada
// *.ts.net: el servidor del PC publicado en tu red privada de Tailscale (móvil incluido)
const STATIC = !/^(localhost|[\w-]+\.localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.[\w-]+\.ts\.net)$/.test(location.hostname) || new URLSearchParams(location.search).has("vitrina");
// Dónde está la API: en Vercel, en la propia web; publicada en otro sitio (DeployHub, otro dominio…), la de Vercel
const API = STATIC && !/(^|\.)vercel\.app$/.test(location.hostname) && !/^(127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  ? "https://filora-umber.vercel.app" : "";
const PIN_KEY = "cine.pin";
const getPin = () => { try { return localStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; } };
// Cuenta de usuario (web publicada): cada uno guarda su propia colección.
const SES_KEY = "filora.sesion";
const getSes = () => { try { return JSON.parse(localStorage.getItem(SES_KEY) || "null"); } catch (e) { return null; } };
const setSes = (s) => { try { s ? localStorage.setItem(SES_KEY, JSON.stringify(s)) : localStorage.removeItem(SES_KEY); } catch (e) { /* */ } };
const ro = () => STATIC && !getPin() && !getSes() && !(typeof nubeActiva === "function" && nubeActiva()); // solo lectura: web publicada sin cuenta, PIN ni GitHub
const authHeaders = () => { const ses = getSes(); return ses ? { Authorization: `Bearer ${ses.token}` } : getPin() ? { "X-Pin": getPin() } : {}; };
document.documentElement.classList.toggle("ro", ro());
// Búsquedas de solo lectura (IMDb, carteles, taquilla, plataformas, notas)
const API_WEB = API; // en el PC las responde server.py (tools/webs.py), sin Vercel
const STATIC_FILES = { cines: "data/cines_es.json", estrenos: "data/estrenos.json", catalogo: "data/catalogo.json", cartelera: "data/cartelera.json" };
const coleccionVacia = () => ({ peliculas: [], series: [], pendientes: [], borrados: {}, estado: { web: true, privada: true } });

// Los guardados en la web van en fila, uno detrás de otro: el servidor reescribe la colección entera en
// cada cambio y dos a la vez se pisaban (se perdían notas, pendientes y lo completado). La lectura de
// la colección también espera su turno, para no traer una versión anterior a lo que acabas de guardar.
let COLA = Promise.resolve();
function enCola(fn) { const r = COLA.then(fn, fn); COLA = r.catch(() => {}); return r; }
// Cambio al instante en pantalla y guardado por detrás; si falla, se avisa y se recarga lo guardado
function cambiarLocal(col, id, cambios) {
  const L = S.db[col] || [], i = L.findIndex((x) => x.id === id);
  if (i >= 0) L[i] = { ...L[i], ...cambios, mod: modNuevo(L[i]) };
  S.prof = null; S.cartIdx = null;
  return L[i];
}
function enFondo(promesa, error = "No se ha podido guardar") {
  return promesa.catch(async (e) => { toast(`${error}: ${e.message}`, "x"); await refreshDB().catch(() => {}); render._keep = true; render(); });
}
async function api(path, opts = {}) {
  const method = opts.method || "GET";
  if (STATIC && (method !== "GET" || path === "db") && !opts._enCola) return enCola(() => api(path, { ...opts, _enCola: true }));
  if (STATIC) {
    const method = opts.method || "GET";
    // sin Vercel: la colección se lee y se guarda en tu repositorio privado de GitHub (nube.js)
    if (typeof nubeActiva === "function" && nubeActiva() && !getSes() && ((method === "GET" && path === "db") || (method !== "GET" && path !== "demanda"))) {
      const j = await nubeApi(path, opts);
      if (method !== "GET") datosCambiados();
      return j;
    }
    if (path.startsWith("buscar")) return wikiBuscar(decodeURIComponent(path.split("q=")[1] || ""));
    if (method === "GET" && path === "db") {
      try {
        const r = await fetch(`${API}/api/db`, { cache: "no-store", headers: authHeaders() });
        if (r.ok) { const j = await r.json().catch(() => null); if (j && Array.isArray(j.peliculas)) return j; throw new Error("La API de Filora no responde con datos (¿la web está publicada sin su servidor?)"); }
        if (r.status === 401 && getSes()) { setSes(null); document.documentElement.classList.toggle("ro", ro()); toast("Tu sesión ha caducado. Vuelve a entrar", "user"); return api("db"); }
      } catch (e) { /* sin conexión con la API */ }
      return coleccionVacia(); // las colecciones son privadas: sin cuenta no se publica ninguna
    }
    // cartelera y estrenos: cada actualización del robot vuelve a publicar la web en Vercel (sin caché)
    if (method === "GET") {
      const r = await fetch(STATIC_FILES[path] || `data/${path}.json`, { cache: "no-cache" });
      if (!r.ok) throw new Error(`No encuentro los datos (${r.status})`);
      return r.json();
    }
    if (ro()) throw new Error("Entra con tu cuenta para guardar tus películas");
    const r = await fetch(`${API}/api/${path}`, { method, headers: { "Content-Type": "application/json", ...authHeaders() }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { setSes(null); try { localStorage.removeItem(PIN_KEY); } catch (e) { /* */ } document.documentElement.classList.toggle("ro", ro()); renderChrome(); }
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    datosCambiados();
    return j;
  }
  const r = await fetch(`${API}/api/${path}`, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  // Si /api devuelve una página HTML es que nadie ejecuta server.py (p. ej. DeployHub sirviendo archivos estáticos)
  if (!/json/.test(r.headers.get("content-type") || "")) throw Object.assign(new Error("Responde una página, no el servidor de Filora"), { sinServidor: true });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  if (opts.method && opts.method !== "GET") datosCambiados();
  return j;
}
async function loadAll() {
  const [db, est, cat, cart] = await Promise.all([api("db"), api("estrenos"), api("catalogo"), api("cartelera").catch(() => ({ cines: [] }))]);
  S.db = db; S.est = est; S.cat = cat; S.cartTodo = cart; S.prof = null;
  filtrarCartelera(); avisarDemanda();
  if (!ro()) setTimeout(() => calcularAvisos().catch(() => {}), 2500);
  if (!ro()) setTimeout(completarRecientes, 4000);
  if (typeof completarNotasImdb === "function") setTimeout(completarNotasImdb, 1500);
  if (typeof completarNotasWeb === "function") setTimeout(completarNotasWeb, 8000);
}
// ---------------------------------------------------------------- todo al día, solo
// Cualquier cambio (aquí, en otro dispositivo, en el Excel del PC o al sincronizar) recalcula
// tus gustos, estadísticas y recomendaciones y repinta la sección abierta.
const VISTAS_VIVAS = ["inicio", "estadisticas", "gustos", "recomendaciones", "series", "coleccion", "pendientes", "cartelera", "estrenos"];
function repintarSiToca() {
  clearTimeout(repintarSiToca._t);
  repintarSiToca._t = setTimeout(() => {
    const escribiendo = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (VISTAS_VIVAS.includes(route().name) && $("#modal").hidden && !escribiendo) { render._keep = true; render(); }
  }, 400);
}
function datosCambiados() { S.prof = null; S.cartIdx = null; repintarSiToca(); }
async function comprobarCambios() {
  if (document.hidden || !S.db || comprobarCambios.ocupado) return;
  comprobarCambios.ocupado = true;
  try {
    const db = await api("db");
    const firma = (d) => `${d.actualizado || ""}|${d.peliculas.length}|${d.series.length}|${d.pendientes.length}`;
    if (firma(db) !== firma(S.db)) {
      S.db = db; filtrarCartelera(); renderChrome(); datosCambiados();
    } else S.db.estado = db.estado;
  } catch (e) { /* sin conexión: ya se mirará luego */ } finally { comprobarCambios.ocupado = false; }
}
// al volver a la app y cada poco mientras está abierta (en el PC más a menudo: no gasta nada)
addEventListener("focus", () => setTimeout(comprobarCambios, 300));
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(comprobarCambios, 300); });
setInterval(comprobarCambios, STATIC ? 120e3 : 15e3);

async function refreshDB() { S.db = await api("db"); S.prof = null; S.cartIdx = null; filtrarCartelera(); renderChrome(); if (typeof completarNotasImdb === "function") setTimeout(completarNotasImdb, 1500); }

function toast(msg, ic = "check", enlace = null) {
  const t = $("#toast");
  t.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  t.classList.toggle("toast-aviso", !!enlace);
  t.onclick = enlace ? () => { t.hidden = true; location.hash = enlace; } : null;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), enlace ? 6000 : 3200);
}

// ---------------------------------------------------------------- perfil de gustos
function profile() {
  if (S.prof) return S.prof;
  const P = S.db.peliculas.filter((p) => p.nota != null);
  const mu = mean(P.map((p) => p.nota));
  const agg = (keys, k) => {
    const m = new Map();
    for (const p of P) for (const key of keys(p)) {
      if (key == null || key === "") continue;
      const o = m.get(key) || { key, n: 0, sum: 0, items: [] };
      o.n++; o.sum += p.nota; o.items.push(p);
      m.set(key, o);
    }
    for (const o of m.values()) { o.mean = o.sum / o.n; o.adj = (o.sum + k * mu) / (o.n + k) - mu; }
    return m;
  };
  S.prof = {
    P, mu, N: P.length,
    genres: agg((p) => p.generos || [], 6),
    directors: agg((p) => splitDir(p.director), 2),
    countries: agg((p) => [p.pais], 6),
    decades: agg((p) => (p.anio ? [Math.floor(p.anio / 10) * 10] : []), 6),
    sagas: agg((p) => (p.saga ? [p.saga] : []), 3),
  };
  return S.prof;
}

// ---------------------------------------------------------------- predicción de nota
// Cada película se describe con: tu afinidad con sus géneros, su director y su década
// (cuánto se separan tus notas de tu media, con prudencia si hay pocas) y su nota en IMDb.
// El peso de cada cosa se ajusta a TUS notas (regresión ridge), así que el modelo aprende
// si tú vas con el público o a tu aire. Validado tapando cada película y prediciéndola:
// error medio ±0,68 frente a ±0,99 del modelo anterior y ±1,28 de adivinar tu media.
const notaImdb = (x) => (x && (x.imdbNota || x.imdb)) || null; // [nota, votos]
function afinidades(pr, it) {
  const W = [1, 0.7, 0.5];
  let gs = 0, ws = 0, best = null, worst = null;
  (it.generos || []).forEach((g, i) => {
    const a = pr.genres.get(g);
    if (!a || !a.n) return;
    gs += a.adj * (W[i] || 0.4); ws += W[i] || 0.4;
    if (!best || a.adj > best.adj) best = a;
    if (!worst || a.adj < worst.adj) worst = a;
  });
  let dir = null;
  for (const d of splitDir(it.director)) { const a = pr.directors.get(d); if (a && a.n && (!dir || a.adj > dir.adj)) dir = a; }
  const dec = it.anio ? pr.decades.get(Math.floor(it.anio / 10) * 10) : null;
  const pais = it.pais ? pr.countries.get(it.pais) : null;
  return { g: ws ? gs / ws : 0, d: dir ? dir.adj : 0, e: dec && dec.n ? dec.adj : 0, c: pais && pais.n ? pais.adj : 0, best, worst, dir, dec, pais };
}
// media de FilmAffinity y Letterboxd (sobre 10) de una película, si la tenemos
function notaCritica(it) {
  const w = it.notasWeb || {}, v = [];
  if (w.fa) v.push(w.fa[0]);
  if (w.lb) v.push(w.lb[0] * 2);
  return v.length ? mean(v) : null;
}
function vectorPrediccion(pr, it, f = afinidades(pr, it)) {
  const r = notaImdb(it), c = notaCritica(it);
  const q = r ? r[0] - pr.imdbMedia : 0, h = r ? 1 : 0, v = r && r[1] ? Math.log10(r[1]) - 5 : 0;
  const wq = c != null ? c - pr.criticaMedia : 0, wh = c != null ? 1 : 0;
  return [1, f.g, f.d, f.e, f.c, q, h, v * h, wq, wh];
}
// perfil sin una película (para entrenar sin que cada una «se vea» a sí misma)
function sinPelicula(pr, p) {
  const quita = (m, keys, k) => {
    const out = new Map(m);
    for (const key of keys) {
      const o = m.get(key);
      if (!o) continue;
      const n = o.n - 1, sum = o.sum - p.nota;
      out.set(key, n ? { ...o, n, sum, mean: sum / n, adj: (sum + k * pr.mu) / (n + k) - pr.mu } : { ...o, n: 0, sum: 0, mean: pr.mu, adj: 0 });
    }
    return out;
  };
  return { ...pr, genres: quita(pr.genres, p.generos || [], 6), directors: quita(pr.directors, splitDir(p.director), 2),
    decades: quita(pr.decades, p.anio ? [Math.floor(p.anio / 10) * 10] : [], 6), countries: quita(pr.countries, [p.pais], 6) };
}
function resolver(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[m][i])) m = j;
    [M[i], M[m]] = [M[m], M[i]];
    for (let j = i + 1; j < n; j++) { const f = M[j][i] / M[i][i]; for (let k = i; k <= n; k++) M[j][k] -= f * M[i][k]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let t = M[i][n]; for (let k = i + 1; k < n; k++) t -= M[i][k] * x[k]; x[i] = t / M[i][i]; }
  return x;
}
function ridge(X, y, lambda) {
  const k = X[0].length, A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array(k).fill(0);
  X.forEach((x, i) => { for (let a = 0; a < k; a++) { b[a] += x[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += x[a] * x[c]; } });
  for (let a = 1; a < k; a++) A[a][a] += lambda; // ridge: evita pesos exagerados
  const w = resolver(A, b);
  return w.every(Number.isFinite) ? w : null;
}
// Entrena con tus notas y elige la regularización probándolo (validación cruzada en 5 partes):
// guarda el error medio real (pr.cv) para decir cuánto se fía la predicción y calcular la afinidad.
function entrenarModelo(pr) {
  const conImdb = pr.P.filter((p) => notaImdb(p)), conCrit = pr.P.filter((p) => notaCritica(p) != null);
  pr.imdbMedia = conImdb.length ? mean(conImdb.map((p) => notaImdb(p)[0])) : 7;
  pr.criticaMedia = conCrit.length ? mean(conCrit.map(notaCritica)) : 7;
  const orden = [...pr.P.map((p) => p.nota)].sort((a, b) => a - b);
  pr.umbral = Math.max(6, orden[Math.floor(orden.length * 0.6)] ?? pr.mu); // «te gusta»: por encima de tu percentil 60
  if (pr.N < 30) { pr.cv = { mae: 1.1, rmse: 1.4 }; return null; } // con pocas notas, pesos fijos
  const X = pr.P.map((p) => vectorPrediccion(sinPelicula(pr, p), p)), y = pr.P.map((p) => p.nota);
  let mejor = null;
  for (const lambda of [1, 3, 10, 30]) {
    let ae = 0, se = 0;
    for (let f = 0; f < 5; f++) {
      const tr = X.map((_, i) => i).filter((i) => i % 5 !== f), te = X.map((_, i) => i).filter((i) => i % 5 === f);
      const w = ridge(tr.map((i) => X[i]), tr.map((i) => y[i]), lambda);
      if (!w) { ae = Infinity; break; }
      for (const i of te) { const e = clamp(X[i].reduce((t, x, j) => t + x * w[j], 0), 0, 10) - y[i]; ae += Math.abs(e); se += e * e; }
    }
    if (!mejor || ae < mejor.ae) mejor = { lambda, ae, mae: ae / X.length, rmse: Math.sqrt(se / X.length) };
  }
  const azar = mean(y.map((v) => Math.abs(v - pr.mu)));
  pr.cv = { mae: mejor.mae, rmse: mejor.rmse, lambda: mejor.lambda, azar };
  return ridge(X, y, mejor.lambda);
}
// Φ: probabilidad normal acumulada (para pasar de «nota prevista ± error» a «probabilidad de que te guste»)
function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }

// predicción de nota + motivos para una película que no has visto
function predict(item) {
  const pr = profile();
  if (pr.modelo === undefined) pr.modelo = entrenarModelo(pr);
  const f = afinidades(pr, item);
  const r = notaImdb(item);
  let s;
  if (pr.modelo) s = vectorPrediccion(pr, item, f).reduce((t, x, i) => t + x * pr.modelo[i], 0);
  else {
    s = pr.mu + 1.5 * f.g + 0.6 * f.d + 0.8 * f.e;
    if (r) s += 0.5 * (r[0] - pr.imdbMedia);
    else if (item.prestigio) s += 0.45 * (item.prestigio - 7.9);
  }
  if (!r && item.prestigio && pr.modelo) s += 0.3 * (item.prestigio - 7.9); // recomendaciones sin dato de IMDb
  const why = [];
  if (f.dir && f.dir.adj > 0.3) why.push(`${f.dir.key}: le das una media de ${fmt1(f.dir.mean)} (${f.dir.n} ${f.dir.n === 1 ? "película" : "películas"})`);
  if (r && r[0] >= 8) why.push(`Muy bien valorada en IMDb (${fmt1(r[0])})`);
  if (f.best && f.best.adj > 0.2) why.push(`Te gusta ${frase(f.best.key)} (media ${fmt1(f.best.mean)} en ${f.best.n})`);
  if (f.dir && f.dir.adj < -0.4) why.push(`${f.dir.key} no te ha convencido (media ${fmt1(f.dir.mean)})`);
  if (r && r[0] < 6) why.push(`El público de IMDb la suspende (${fmt1(r[0])})`);
  if (f.worst && f.worst.adj < -0.35 && f.worst !== f.best) why.push(`Ojo: ${frase(f.worst.key)} te suele costar (media ${fmt1(f.worst.mean)})`);
  if (f.pais && f.pais.adj > 0.35 && f.pais.n >= 5) why.push(`El cine de ${f.pais.key} te suele gustar (media ${fmt1(f.pais.mean)})`);
  const crit = notaCritica(item);
  if (crit != null && crit >= 7.8) why.push(`Muy bien valorada en FilmAffinity y Letterboxd (${fmt1(crit)})`);
  if (f.dec && f.dec.adj > 0.45) why.push(`Los años ${String(f.dec.key).slice(2)} son una de tus décadas fuertes`);
  if (item.prestigio >= 8.8 && !(r && r[0] >= 8)) why.push("Imprescindible según crítica y público");
  // estrenos con poca información: menos confianza, se acercan a tu media
  if (!item.director && !r && !item.prestigio) s = pr.mu + (s - pr.mu) * 0.7;
  s = clamp(s, 0, 10);
  // afinidad = probabilidad de que le des al menos tu «me gusta» (pr.umbral), con el error real del modelo
  const sigma = Math.max(0.6, (pr.cv && pr.cv.rmse) || 1.2) * (!item.director && !r ? 1.3 : 1);
  return { nota: s, pct: clamp(Math.round(100 * phi((s - pr.umbral) / sigma)), 2, 98), why: why.slice(0, 3) };
}

// ---------------------------------------------------------------- páginas con pestañas
const SUB = {};
function conPestanas(v, ruta, tabs, qs) {
  const t = tabs.some(([k]) => k === qs.get("t")) ? qs.get("t") : tabs[0][0];
  v.innerHTML = `<nav class="pestanas" aria-label="Apartados">${tabs.map(([k, l, ic]) => `<a class="${k === t ? "on" : ""}" href="#/${ruta}${k === tabs[0][0] ? "" : `?t=${k}`}">${icon(ic)}${l}</a>`).join("")}</nav><div id="subv"></div>`;
  SUB[t]($("#subv"), qs);
}
const VIEWS_PESTANAS = {
  cartelera: [["cartelera", "En cines ahora", "ticket"], ["estrenos", "Próximos estrenos", "calendar"]],
  estadisticas: [["resumen", "Resumen", "chart"], ["gustos", "Mis gustos", "spark"], ["anio", "Tu año en cine", "star"]],
};
// ---------------------------------------------------------------- navegación
const NAV = [
  ["inicio", "Inicio", "home"],
  ["anadir", "Añadir películas", "plus"],
  ["cartelera", "Cartelera y estrenos", "ticket"],
  ["coleccion", "Colección", "film"],
  ["premios", "Premios", "trophy"],
  ["recomendaciones", "Para ti", "target"],
  ["estadisticas", "Estadísticas", "chart"],
  ["pendientes", "Pendientes", "bookmark"],
  ["ajustes", "Ajustes", "settings"],
];
const navItems = () => NAV.filter((n) => !(STATIC && n[0] === "ajustes") && !(ro() && n[0] === "anadir"));
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [name, qs] = h.split("?");
  return { name: navItems().some((n) => n[0] === name) || ["persona", "pelicula", "buscar", "estrenos", "gustos", "anio", "series", "juntos"].includes(name) ? name : "inicio", qs: new URLSearchParams(qs || "") };
}
function renderChrome() {
  const r = route().name;
  const counts = { coleccion: S.db.peliculas.length, pendientes: S.db.pendientes.length, series: S.db.series.length };
  $("#nav").innerHTML = navItems().map(([k, l, ic]) => `<a href="#/${k}" class="${r === k ? "on" : ""}">${icon(ic)}<span>${l}</span>${counts[k] != null ? `<span class="count">${counts[k]}</span>` : ""}</a>`).join("")
    + `<a href="#" data-more class="nav-more">Más</a>`;
  const TAB = ro() ? { inicio: "Inicio", cartelera: "Cartelera", coleccion: "Colección", estrenos: "Estrenos" }
    : { inicio: "Inicio", anadir: "Añadir", cartelera: "Cartelera", coleccion: "Colección" };
  const enTab = Object.keys(TAB).includes(r);
  $("#tabbar").innerHTML = NAV.filter((n) => TAB[n[0]])
    .map(([k, , ic]) => `<a href="#/${k}" class="${r === k ? "on" : ""}">${icon(ic)}<span>${TAB[k]}</span></a>`).join("")
    + `<a href="#" data-more class="${enTab ? "" : "on"}">${icon("list")}<span>Más</span></a>`;
  const e = S.db.estado || {};
  const hora = e.excel_at ? new Date(e.excel_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
  if (STATIC) {
    const f = S.db.actualizado ? new Date(S.db.actualizado + (S.db.actualizado.length === 19 ? "Z" : "")).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "";
    const ses = getSes();
    $("#sideFoot").innerHTML = ses
      ? `<b style="color:var(--gold)">Hola, ${esc(ses.usuario)}</b><br><span class="dim">Tu colección se guarda en tu cuenta y la ves en cualquier dispositivo</span><br><a href="#" data-logout class="dim" style="text-decoration:underline">Salir</a>`
      : ro()
      ? `<b>Tu colección es privada</b><br><span class="dim">Crea una cuenta o entra para verla y editarla</span><br><a href="#" data-login class="dim" style="text-decoration:underline">Entrar</a>`
      : `<b style="color:var(--gold)">Modo edición</b><br><span class="dim">Tus cambios se guardan al momento</span><br><a href="#" data-logout class="dim" style="text-decoration:underline">Salir</a>`;
    const c = $("#cuenta");
    if (c) {
      c.hidden = false;
      c.innerHTML = ses ? `<span class="cuenta-ini">${esc(ses.usuario[0].toUpperCase())}</span>` : icon("user");
      const etiqueta = ses ? `Cuenta de ${ses.usuario}` : getPin() ? "Modo edición" : "Entrar o crear cuenta";
      c.setAttribute("aria-label", etiqueta);
      c.dataset.tip = etiqueta;
      c.classList.toggle("on", !ro());
    }
    return;
  }
  $("#sideFoot").innerHTML = e.excel_error
    ? `<span class="warn">⚠ ${esc(e.excel_error)}</span>`
    : `<b>Guardado en tu PC</b><br><span class="dim">${e.pin || e.github ? (e.sync === "ok" ? `Sincronizado${e.github ? " con GitHub" : " con la web"}${e.sync_at ? ` ${haceRato(e.sync_at)}` : ""}` : esc(e.sync || "Sincronizando…")) : "Sin sincronizar (configúralo en Ajustes)"}</span><br><a href="/api/excel" class="dim">Excel${hora ? ` (${hora})` : ""}</a>`;
}
// «hace un momento», «hace 3 min», «hace 2 h»
function haceRato(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "hace un momento" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `el ${new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
}
function render() {
  const { name, qs } = route();
  renderChrome();
  const v = $("#view");
  const keep = render._keep;
  render._keep = false;
  const pintar = () => {
    VIEWS[name](v, qs);
    if (qs.get("ficha")) openFilm(qs.get("ficha"));
    if (!keep) window.scrollTo(0, 0);
  };
  // fundido entre páginas (como un cambio de plano) si el navegador lo permite
  pintar();
  if (!keep && render._visto) { v.classList.remove("entra"); void v.offsetWidth; v.classList.add("entra"); }
  render._visto = true;
}

// ---------------------------------------------------------------- componentes
// ---------------------------------------------------------------- nota final
// Mitad tu nota y mitad la media de las webs, todas sobre 10 (Letterboxd y SensaCine, que van
// sobre 5, se multiplican por 2; de SensaCine, la media de prensa y usuarios).
function notasWebDe(p) {
  const out = [], w = p.notasWeb || {}, i = notaImdb(p);
  if (i) out.push(["IMDb", i[0]]);
  if (w.fa) out.push(["FilmAffinity", w.fa[0]]);
  if (w.lb) out.push(["Letterboxd", w.lb[0] * 2]);
  if (w.sc) { const v = [w.sc.prensa, w.sc.usuarios].filter((x) => x != null); if (v.length) out.push(["SensaCine", mean(v) * 2]); }
  return out;
}
function notaFinal(p) {
  if (p.nota == null) return null;
  const w = notasWebDe(p);
  return w.length ? Math.round((0.5 * p.nota + 0.5 * mean(w.map((x) => x[1]))) * 10) / 10 : p.nota;
}
const desgloseFinal = (p) => [`Tú ${fmt1(p.nota)}`, ...notasWebDe(p).map(([n, v]) => `${n} ${fmt1(v)}`)].join(" · ");

function pcard(p, opts = {}) {
  return `<div class="pcard" data-open="${esc(p.id || "")}" ${opts.cat != null ? `data-cat="${opts.cat}"` : ""}>
    <div class="frame" ${opts.final && p.nota != null ? `data-tip="Nota final · ${esc(desgloseFinal(p))}"` : ""}>${posterHTML(p)}${opts.match != null ? matchTag(opts.match) : scoreBadge(opts.final ? notaFinal(p) : p.nota)}${p.favorita ? `<span class="fav">${icon("star", true)}</span>` : ""}</div>
    <div class="meta"><div class="t">${esc(p.titulo)}</div><div class="s">${esc([p.anio, splitDir(p.director)[0]].filter(Boolean).join(" · "))}</div></div>
  </div>`;
}
function sectionHead(t, link, linkText = "Ver todo") {
  return `<div class="section-head"><h2 class="h2">${t}</h2>${link ? `<a href="${link}">${linkText}</a>` : ""}</div>`;
}

// ================================================================ VISTAS
const VIEWS = {};

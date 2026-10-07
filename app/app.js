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
  return `<img src="${esc(item.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>${ph}</template>`;
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
    { n: "Rotten Tomatoes", c: "#d8321f", l: "RT", u: ids.rt ? `https://www.rottentomatoes.com/${ids.rt}` : `https://www.rottentomatoes.com/search?search=${qo}` },
    { n: "SensaCine", c: "#e30613", l: "SC", u: ids.allocine ? `https://www.sensacine.com/peliculas/pelicula-${ids.allocine}/` : `https://www.sensacine.com/buscar/?q=${q}` },
    { n: "Letterboxd", c: "#202830", l: "LB", u: ids.letterboxd ? `https://letterboxd.com/film/${ids.letterboxd}/` : `https://letterboxd.com/search/films/${qo}/` },
    { n: "JustWatch", c: "#e7b32a", l: "JW", u: `https://www.justwatch.com/es/buscar?q=${q}` },
  ];
}
const linksHTML = (p) => `<div class="links">${extLinks(p).map((l) => `<a class="ext" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="logo" style="background:${l.c}">${l.l}</span>${l.n}</a>`).join("")}</div>`;

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
const STATIC = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || new URLSearchParams(location.search).has("vitrina");
const PIN_KEY = "cine.pin";
const getPin = () => { try { return localStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; } };
// Cuenta de usuario (web publicada): cada uno guarda su propia colección.
const SES_KEY = "filora.sesion";
const getSes = () => { try { return JSON.parse(localStorage.getItem(SES_KEY) || "null"); } catch (e) { return null; } };
const setSes = (s) => { try { s ? localStorage.setItem(SES_KEY, JSON.stringify(s)) : localStorage.removeItem(SES_KEY); } catch (e) { /* */ } };
const ro = () => STATIC && !getPin() && !getSes(); // solo lectura: web publicada sin cuenta ni PIN
const authHeaders = () => { const ses = getSes(); return ses ? { Authorization: `Bearer ${ses.token}` } : getPin() ? { "X-Pin": getPin() } : {}; };
document.documentElement.classList.toggle("ro", ro());
const STATIC_FILES = { cines: "data/cines_es.json", estrenos: "data/estrenos.json", catalogo: "data/catalogo.json", cartelera: "data/cartelera.json" };
const coleccionVacia = () => ({ peliculas: [], series: [], pendientes: [], borrados: {}, estado: { web: true, privada: true } });

async function api(path, opts = {}) {
  if (STATIC) {
    const method = opts.method || "GET";
    if (path.startsWith("buscar")) return wikiBuscar(decodeURIComponent(path.split("q=")[1] || ""));
    if (method === "GET" && path === "db") {
      try {
        const r = await fetch("/api/db", { cache: "no-store", headers: authHeaders() });
        if (r.ok) return r.json();
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
    const r = await fetch(`/api/${path}`, { method, headers: { "Content-Type": "application/json", ...authHeaders() }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { setSes(null); try { localStorage.removeItem(PIN_KEY); } catch (e) { /* */ } document.documentElement.classList.toggle("ro", ro()); renderChrome(); }
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  }
  const r = await fetch(`/api/${path}`, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
async function loadAll() {
  const [db, est, cat, cart] = await Promise.all([api("db"), api("estrenos"), api("catalogo"), api("cartelera").catch(() => ({ cines: [] }))]);
  S.db = db; S.est = est; S.cat = cat; S.cartTodo = cart; S.prof = null;
  filtrarCartelera(); avisarDemanda();
}
async function refreshDB() { S.db = await api("db"); S.prof = null; filtrarCartelera(); renderChrome(); }

function toast(msg, ic = "check") {
  const t = $("#toast");
  t.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 3200);
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

// predicción de nota + motivos para una película que no has visto
function predict(item) {
  const pr = profile();
  let s = pr.mu;
  const why = [];
  const gs = item.generos || [];
  const W = [1, 0.7, 0.5];
  let gsum = 0, wsum = 0, best = null, worst = null;
  gs.forEach((g, i) => {
    const a = pr.genres.get(g);
    if (!a) return;
    gsum += a.adj * (W[i] || 0.4); wsum += W[i] || 0.4;
    if (!best || a.adj > best.adj) best = a;
    if (!worst || a.adj < worst.adj) worst = a;
  });
  if (wsum) s += 1.5 * (gsum / wsum);  // pesos calibrados con validación dejando-una-fuera
  if (best && best.adj > 0.2) why.push(`Te gusta ${frase(best.key)} (media ${fmt1(best.mean)} en ${best.n})`);
  if (worst && worst.adj < -0.35 && worst !== best) why.push(`Ojo: ${frase(worst.key)} te suele costar (media ${fmt1(worst.mean)})`);
  let dBest = null;
  for (const d of splitDir(item.director)) { const a = pr.directors.get(d); if (a && (!dBest || a.adj > dBest.adj)) dBest = a; }
  if (dBest) {
    s += 0.6 * dBest.adj;
    if (dBest.adj > 0.3) why.unshift(`${dBest.key}: le das una media de ${fmt1(dBest.mean)} (${dBest.n} ${dBest.n === 1 ? "película" : "películas"})`);
    else if (dBest.adj < -0.4) why.push(`${dBest.key} no te ha convencido (media ${fmt1(dBest.mean)})`);
  }
  const c = pr.countries.get(item.pais);
  if (c) { s += 0.5 * c.adj; if (c.adj > 0.35) why.push(`El cine de ${c.key} te funciona (media ${fmt1(c.mean)})`); }
  if (item.anio) {
    const d = pr.decades.get(Math.floor(item.anio / 10) * 10);
    if (d) { s += 0.8 * d.adj; if (d.adj > 0.45) why.push(`Los años ${String(d.key).slice(2)} son una de tus décadas fuertes`); }
  }
  if (item.prestigio) {
    s += 0.45 * (item.prestigio - 7.9);
    if (item.prestigio >= 8.8) why.push("Imprescindible según crítica y público");
  }
  // estrenos con poca información: menos confianza, se acercan a tu media
  if (!item.director && !item.prestigio) s = pr.mu + (s - pr.mu) * 0.7;
  s = clamp(s, 0, 10);
  return { nota: s, pct: clamp(Math.round(50 + 46 * Math.tanh((s - pr.mu) / 2.3)), 3, 97), why: why.slice(0, 3) };
}

// ---------------------------------------------------------------- navegación
const NAV = [
  ["inicio", "Inicio", "home"],
  ["anadir", "Añadir películas", "plus"],
  ["cartelera", "Cartelera", "ticket"],
  ["coleccion", "Colección", "film"],
  ["estrenos", "Estrenos", "calendar"],
  ["recomendaciones", "Para ti", "target"],
  ["gustos", "Mis gustos", "spark"],
  ["estadisticas", "Estadísticas", "chart"],
  ["pendientes", "Pendientes", "bookmark"],
  ["series", "Series", "tv"],
  ["ajustes", "Ajustes", "settings"],
];
const navItems = () => NAV.filter((n) => !(STATIC && n[0] === "ajustes") && !(ro() && n[0] === "anadir"));
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [name, qs] = h.split("?");
  return { name: navItems().some((n) => n[0] === name) ? name : "inicio", qs: new URLSearchParams(qs || "") };
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
      : `<b style="color:var(--gold)">Modo edición</b><br><span class="dim">Los cambios se guardan en la web y llegan a tu PC</span><br><a href="#" data-logout class="dim" style="text-decoration:underline">Salir</a>`;
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
    : `<b>Excel sincronizado</b>${hora ? ` · ${hora}` : ""}<br><span class="dim">${e.pin ? (e.sync === "ok" ? "Sincronizado con la web" : esc(e.sync || "Sincronizando con la web…")) : "Web sin sincronizar (Ajustes)"}</span><br><a href="/api/excel" class="dim">Descargar Filora.xlsx</a>`;
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
function pcard(p, opts = {}) {
  return `<div class="pcard" data-open="${esc(p.id || "")}" ${opts.cat != null ? `data-cat="${opts.cat}"` : ""}>
    <div class="frame">${posterHTML(p)}${opts.match != null ? matchTag(opts.match) : scoreBadge(p.nota)}${p.favorita ? `<span class="fav">${icon("star", true)}</span>` : ""}</div>
    <div class="meta"><div class="t">${esc(p.titulo)}</div><div class="s">${esc([p.anio, splitDir(p.director)[0]].filter(Boolean).join(" · "))}</div></div>
  </div>`;
}
function sectionHead(t, link, linkText = "Ver todo") {
  return `<div class="section-head"><h2 class="h2">${t}</h2>${link ? `<a href="${link}">${linkText}</a>` : ""}</div>`;
}

// ================================================================ VISTAS
const VIEWS = {};

// ---------------------------------------------------------------- Inicio
VIEWS.inicio = (v) => {
  const pr = profile();
  const pelis = S.db.peliculas;
  const horas = pelis.reduce((a, p) => a + (p.duracion || 0), 0) / 60;
  const vacia = pelis.length === 0;
  const conPoster = vacia ? S.cat.filter((c) => c.poster).slice(0, 45)
    : pelis.filter((p) => p.poster && p.nota != null).sort((a, b) => b.nota - a.nota).slice(0, 45);
  const tiras = [0, 1, 2].map((r) => conPoster.filter((_, k) => k % 3 === r));
  const olimpo = [...pr.P].sort((a, b) => b.nota - a.nota || (a.anio || 0) - (b.anio || 0)).slice(0, 10);
  const recientes = [...pelis].filter((p) => ["app", "web"].includes(p.origen)).sort((a, b) => String(b.añadido || "").localeCompare(String(a.añadido || ""))).slice(0, 14);
  const ultimas = recientes.length >= 4 ? recientes : [...pelis].sort((a, b) => (b.anio || 0) - (a.anio || 0) || (b.nota || 0) - (a.nota || 0)).slice(0, 14);
  const recs = topRecs(14, { variedad: 1 });
  const prox = upcoming().filter((e) => e.fecha >= todayISO() && e.fecha <= addDays(todayISO(), 30)).map((e) => ({ ...e, m: predict(e) })).sort((a, b) => b.m.pct - a.m.pct).slice(0, 4);
  const tira = (L) => { const h = L.map((p) => `<img src="${esc(p.poster)}" alt="" loading="eager" referrerpolicy="no-referrer">`).join(""); return `<div class="reel"><div class="reel-track">${h}${h}</div></div>`; };

  v.innerHTML = `
  <section class="hero">
    <div class="reels" aria-hidden="true">${tiras.map(tira).join("")}</div>
    <div class="hero-content">
      <h1><span>Filora</span></h1>
      <p class="hero-lead">${vacia && ro()
        ? `Tu diario de cine privado. Guarda las películas que ves con tu nota, descubre tus gustos y recibe recomendaciones. Mira la cartelera de Gijón sin registrarte.`
        : vacia
        ? `Tu diario de cine empieza aquí. Añade las películas que has visto con tu nota y Filora aprenderá tus gustos para recomendarte qué ver.`
        : `<b>${fmtInt(pelis.length)}</b> películas, <b>${fmtInt(horas)}</b> horas a oscuras y una nota para cada una. La media va por <b>${fmt2(pr.mu)}</b>.`}</p>
      <div class="hero-actions">${ro() ? `
        <a class="btn btn-primary" href="#" data-login="crear">Crear cuenta</a>
        <a class="btn" href="#" data-login="entrar">Entrar</a>
        <a class="btn" href="#/cartelera">Ver la cartelera</a>` : `
        <a class="btn btn-primary rw" href="#/anadir">${vacia ? "Añadir mi primera película" : "Añadir película"}</a>
        <a class="btn" href="#/coleccion">Ver la colección</a>
        <a class="btn" href="#/recomendaciones">¿Qué veo hoy?</a>`}
      </div>
    </div>
  </section>

  ${hoyHTML()}

  ${vacia ? "" : `<section class="section">${sectionHead("El Olimpo", "#/coleccion?min=9", `Las ${pr.P.filter((p) => p.nota >= 9).length} con un 9 o más`)}
    <ol class="olimpo">${olimpo.map((p) => `<li data-open="${p.id}"><div class="mini">${posterHTML(p)}</div>
      <div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="s">${esc([splitDir(p.director).join(" y "), p.anio].filter(Boolean).join(", "))}</div></div>${scoreBadge(p.nota)}</li>`).join("")}</ol></section>

  <section class="section">${sectionHead(recientes.length >= 4 ? "Lo último que has añadido" : "Lo último que has visto", "#/coleccion", "Toda la colección")}
    <div class="strip">${ultimas.map((p) => pcard(p)).join("")}</div></section>`}

  <section class="section">${sectionHead("Podrían gustarte", "#/recomendaciones", "Todas las recomendaciones")}
    <div class="strip">${recs.map((r) => pcard(r, { match: r.m.pct, cat: r._i })).join("")}</div></section>

  ${prox.length ? `<section class="section">${sectionHead("Próximos estrenos", "#/estrenos", "Calendario completo")}
    <div class="rels">${prox.map(relCard).join("")}</div></section>` : ""}

  ${vacia ? "" : `<section class="section">${sectionHead("Cómo ves el cine", "#/gustos", "Tu perfil completo")}
    <div class="insights">${insights().slice(0, 3).map(insightCard).join("")}</div></section>`}`;
};

// ---------------------------------------------------------------- Colección
function filtered() {
  const c = S.coll;
  const q = norm(c.q);
  let L = S.db.peliculas.filter((p) => {
    if (q && !(norm(p.titulo).includes(q) || norm(p.tituloOriginal).includes(q) || norm(p.director).includes(q))) return false;
    if (c.genre && !(p.generos || []).includes(c.genre)) return false;
    if (c.decade && Math.floor((p.anio || 0) / 10) * 10 !== +c.decade) return false;
    if (c.country && p.pais !== c.country) return false;
    if (c.saga && p.saga !== c.saga) return false;
    if (c.min && !(p.nota >= +c.min)) return false;
    return true;
  });
  const by = {
    nota: (a, b) => (b.nota ?? -1) - (a.nota ?? -1) || (b.anio || 0) - (a.anio || 0),
    peor: (a, b) => (a.nota ?? 99) - (b.nota ?? 99),
    nuevo: (a, b) => (b.anio || 0) - (a.anio || 0) || (b.nota || 0) - (a.nota || 0),
    viejo: (a, b) => (a.anio || 0) - (b.anio || 0),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, "es"),
    duracion: (a, b) => (b.duracion || 0) - (a.duracion || 0),
    taquilla: (a, b) => ((b.taquilla || {}).mundial || 0) - ((a.taquilla || {}).mundial || 0),
    registro: (a, b) => String(b.añadido || "").localeCompare(String(a.añadido || "")) || b.id.localeCompare(a.id),
  };
  return L.sort(by[c.sort] || by.nota);
}
VIEWS.coleccion = (v, qs) => {
  for (const k of ["q", "genre", "decade", "country", "saga", "min"]) if (qs.has(k)) S.coll[k] = qs.get(k);
  const P = S.db.peliculas;
  const opt = (vals, sel, all) => `<option value="">${all}</option>` + vals.map((x) => `<option value="${esc(x[0])}" ${String(sel) === String(x[0]) ? "selected" : ""}>${esc(x[1])}</option>`).join("");
  const count = (fn) => { const m = new Map(); P.forEach((p) => [].concat(fn(p)).forEach((k) => k != null && k !== "" && m.set(k, (m.get(k) || 0) + 1))); return m; };
  const gC = count((p) => p.generos || []), cC = count((p) => p.pais), sC = count((p) => p.saga), dC = count((p) => (p.anio ? Math.floor(p.anio / 10) * 10 : null));
  const c = S.coll;
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Mis películas</h1></div></div>
  <div class="toolbar">
    <label class="search">${icon("search")}<input class="input" id="fq" placeholder="Buscar película o director" value="${esc(c.q)}"></label>
    <select class="select" id="fgenre">${opt([...gC].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, `${k} (${n})`]), c.genre, "Todos los géneros")}</select>
    <select class="select" id="fdecade">${opt([...dC].sort((a, b) => b[0] - a[0]).map(([k, n]) => [k, `Años ${String(k).slice(2)} · ${k} (${n})`]), c.decade, "Todas las décadas")}</select>
    <select class="select" id="fcountry">${opt([...cC].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, `${k} (${n})`]), c.country, "Todos los países")}</select>
    <select class="select" id="fmin">${opt([["9", "Nota ≥ 9"], ["8", "Nota ≥ 8"], ["7", "Nota ≥ 7"], ["5", "Aprobadas (≥ 5)"]], c.min, "Cualquier nota")}</select>
    <select class="select" id="fsort">${opt([["nota", "Mejor nota"], ["peor", "Peor nota"], ["nuevo", "Más recientes"], ["viejo", "Más antiguas"], ["titulo", "Título A–Z"], ["duracion", "Más largas"], ["taquilla", "Mayor taquilla"], ["registro", "Últimas registradas"]], c.sort, "Ordenar")}</select>
    <div class="seg"><button data-mode="grid" class="${c.mode === "grid" ? "on" : ""}" title="Carátulas">${icon("grid")}</button><button data-mode="list" class="${c.mode === "list" ? "on" : ""}" title="Lista">${icon("list")}</button></div>
  </div>
  <div id="collRes"></div>`;
  const draw = () => {
    const L = filtered();
    const shown = L.slice(0, c.limit);
    const avg = mean(L.filter((p) => p.nota != null).map((p) => p.nota));
    const active = ["q", "genre", "decade", "country", "saga", "min"].some((k) => c[k]);
    $("#collRes").innerHTML = `
      <div class="result-line"><b>${L.length}</b> ${L.length === 1 ? "película" : "películas"}${L.length ? ` · nota media <b>${fmt2(avg)}</b>` : ""}${active ? ` · <a href="#" id="fclear" style="color:var(--gold)">Quitar filtros</a>` : ""}</div>
      ${!L.length ? `<div class="empty"><div class="h2">Nada por aquí</div>Prueba con otros filtros.</div>` : c.mode === "grid"
        ? `<div class="posters">${shown.map((p) => pcard(p)).join("")}</div>`
        : `<div class="list card" style="padding:6px">${shown.map((p) => `<div class="row" data-open="${p.id}"><div class="mini">${posterHTML(p)}</div>
            <div style="min-width:0"><div class="t">${esc(p.titulo)}${p.favorita ? ` <span style="color:var(--gold)">★</span>` : ""}</div><div class="s">${esc([p.tituloOriginal !== p.titulo ? p.tituloOriginal : null, p.director].filter(Boolean).join(" · "))}</div></div>
            <div class="c">${esc((p.generos || []).slice(0, 2).join(", "))}</div><div class="c">${esc(p.pais || "")}</div><div class="c num">${p.anio || ""}</div>${scoreBadge(p.nota)}</div>`).join("")}</div>`}
      ${L.length > c.limit ? `<div class="more"><button class="btn" id="fmore">Mostrar más (${L.length - c.limit})</button></div>` : ""}`;
    const fc = $("#fclear");
    if (fc) fc.onclick = (e) => { e.preventDefault(); Object.assign(c, { q: "", genre: "", decade: "", country: "", saga: "", min: "" }); location.hash = "#/coleccion"; VIEWS.coleccion(v, new URLSearchParams()); };
    const fm = $("#fmore");
    if (fm) fm.onclick = () => { c.limit += 240; render._keep = true; draw(); };
  };
  let t;
  $("#fq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { c.q = e.target.value; c.limit = 120; draw(); }, 120); };
  [["#fgenre", "genre"], ["#fdecade", "decade"], ["#fcountry", "country"], ["#fmin", "min"], ["#fsort", "sort"]].forEach(([id, k]) => {
    $(id).onchange = (e) => { c[k] = e.target.value; c.limit = 120; saveUI(); draw(); };
  });
  $$("[data-mode]", v).forEach((b) => (b.onclick = () => { c.mode = b.dataset.mode; saveUI(); $$("[data-mode]", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  draw();
};

// ---------------------------------------------------------------- Ficha
function openFilm(id) {
  const p = S.db.peliculas.find((x) => x.id === id);
  if (!p) return;
  const t = p.taquilla || {};
  const similares = S.db.peliculas.filter((x) => x.id !== p.id && (splitDir(x.director).some((d) => splitDir(p.director).includes(d))))
    .sort((a, b) => (b.nota || 0) - (a.nota || 0)).slice(0, 8);
  const pr = profile();
  const rank = [...pr.P].sort((a, b) => b.nota - a.nota).findIndex((x) => x.id === p.id) + 1;
  const pct = rank ? Math.round((1 - (rank - 1) / pr.N) * 100) : null;
  const visto = p.fechaVisto ? `Vista el ${new Date(p.fechaVisto + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}${p.lugar ? ` · ${p.lugar}` : ""}` : p.lugar ? `Vista en ${p.lugar}` : null;
  modal(`
    ${p.poster ? `<div class="detail-backdrop"><img src="${esc(p.poster)}" alt="" referrerpolicy="no-referrer"></div>` : ""}
    <div class="sheet-body"><div class="detail">
      <div><div class="poster">${posterHTML(p)}</div></div>
      <div>
        <div class="eyebrow">${esc([p.anio, p.pais].filter(Boolean).join(" · "))}</div>
        <h2 style="margin-top:8px">${esc(p.titulo)}</h2>
        ${p.tituloOriginal && norm(p.tituloOriginal) !== norm(p.titulo) ? `<div class="orig">${esc(p.tituloOriginal)}</div>` : ""}
        <div class="facts">
          ${p.anio ? `<span>${icon("calendar")}${p.anio}</span>` : ""}
          ${p.duracion ? `<span>${icon("clock")}${Math.floor(p.duracion / 60)} h ${p.duracion % 60} min</span>` : ""}
          ${p.pais ? `<span>${icon("globe")}${esc(p.pais)}</span>` : ""}
          ${p.director ? `<span>${icon("user")}${splitDir(p.director).map((d) => `<a href="#/coleccion?q=${encodeURIComponent(d)}" data-close style="text-decoration:underline;text-decoration-color:var(--line-2);text-underline-offset:3px">${esc(d)}</a>`).join(", ")}</span>` : ""}
        </div>
        <div class="chips">${(p.generos || []).map((g) => `<a class="chip" href="#/coleccion?genre=${encodeURIComponent(g)}" data-close>${esc(g)}</a>`).join("")}${p.favorita ? `<span class="chip gold">★ Favorita</span>` : ""}</div>
        <div class="myscore">${scoreBadge(p.nota, "lg")}<div><div class="lbl">Tu nota</div><div class="verdict">${veredicto(p.nota)}</div>
          ${pct ? `<div class="dim" style="font-size:12.5px">Puesto ${rank} de ${pr.N} · mejor que el ${Math.max(0, pct - 1)}% de lo que has visto</div>` : ""}</div></div>
        ${visto ? `<div class="muted" style="margin:-6px 0 14px;font-size:13px">${icon("ticket")} ${esc(visto)}</div>` : ""}
        ${p.resena ? `<blockquote class="review">${esc(p.resena)}</blockquote>` : ""}
        <div class="sub">Ver en</div>
        ${linksHTML(p)}
        <div id="fExtras" class="extras-ficha"><div class="sub">Notas en otras webs</div><div class="dim cargando-mini">Consultando IMDb, FilmAffinity, Letterboxd, Rotten Tomatoes y SensaCine…</div></div>
        ${t.mundial || p.presupuesto ? `<div class="sub">Taquilla${(p.ids || {}).imdb ? ` · <a href="https://www.boxofficemojo.com/title/${p.ids.imdb}/" target="_blank" rel="noopener" style="text-decoration:underline">Box Office Mojo</a>` : ""}</div><div class="boxoffice">
          ${p.presupuesto ? `<div><span>Presupuesto</span><b>${money(p.presupuesto)}</b></div>` : ""}
          ${t.apertura ? `<div><span>Estreno EE.UU.</span><b>${money(t.apertura)}</b></div>` : ""}
          ${t.domestica ? `<div><span>EE.UU.</span><b>${money(t.domestica)}</b></div>` : ""}
          ${t.internacional ? `<div><span>Internacional</span><b>${money(t.internacional)}</b></div>` : ""}
          ${t.mundial ? `<div><span>Mundial</span><b style="color:var(--gold)">${money(t.mundial)}</b></div>` : ""}
          ${p.presupuesto && t.mundial ? `<div><span>Rentabilidad</span><b>${fmt1(t.mundial / p.presupuesto)}x</b></div>` : ""}
        </div>` : ""}
        <div class="dl-actions">
          <button class="btn" data-edit="${p.id}">${icon("edit")}Editar</button>
          <button class="btn" data-fav="${p.id}">${icon("star", p.favorita)}${p.favorita ? "Quitar de favoritas" : "Marcar favorita"}</button>
          <button class="btn btn-ghost btn-danger" data-del="${p.id}">${icon("trash")}Eliminar</button>
        </div>
      </div>
    </div>
    ${similares.length ? `<div class="sub" style="margin-top:34px">Del mismo director en tu colección</div><div class="strip">${similares.map((x) => pcard(x)).join("")}</div>` : ""}
    </div>`);  if (typeof cargarExtras === "function") cargarExtras(p);
}

// ---------------------------------------------------------------- Modal genérico
function modal(html, cls = "") {
  const m = $("#modal");
  m.innerHTML = `<div class="sheet ${cls}"><button class="icon-btn sheet-close" data-close title="Cerrar (Esc)">${icon("x")}</button>${html}</div>`;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  m.onclick = (e) => { if (e.target === m) closeModal(); };
}
function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; document.body.style.overflow = ""; }

// ---------------------------------------------------------------- Formulario película
function lugarOptions(sel) {
  const cines = misCines().map((c) => `${c.nombre}`);
  const group = (l, arr) => `<optgroup label="${l}">${arr.map((x) => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("")}</optgroup>`;
  const extra = sel && ![...cines, ...PLATAFORMAS, "Televisión", "DVD / Blu-ray", "Otro"].includes(sel) ? `<option selected>${esc(sel)}</option>` : "";
  return `<option value="">—</option>${extra}${group("En el cine", cines)}${group("En casa · streaming", PLATAFORMAS)}${group("Otros", ["Televisión", "DVD / Blu-ray", "Otro"])}`;
}
function openForm(p = null, preset = {}) {
  const edit = !!p;
  const d = p ? { ...p } : { titulo: "", tituloOriginal: "", anio: "", duracion: "", director: "", pais: "", generos: [], saga: "", nota: 7, fechaVisto: todayISO(), lugar: "", resena: "", favorita: false, ids: {}, poster: null, ...preset };
  if (d.nota == null) d.nota = 7;
  const sagas = [...new Set(S.db.peliculas.map((x) => x.saga).filter(Boolean))].sort();
  modal(`<div class="sheet-body">
    <div class="eyebrow">${edit ? "Editar" : "Nueva película vista"}</div>
    <h2 class="h2" style="margin:6px 0 20px">${edit ? esc(p.titulo) : "¿Qué has visto?"}</h2>
    ${edit ? "" : `<div class="ac field full" style="margin-bottom:18px"><label class="search">${icon("search")}<input class="input" id="acq" placeholder="Busca la película para rellenarlo todo automáticamente…" autocomplete="off" value="${esc(preset.titulo || "")}"></label><div class="ac-list" id="acl" hidden></div></div>`}
    <div class="form-head"><div class="form-poster" id="fposter">${posterHTML(d)}</div>
      <div class="form" style="grid-template-columns:repeat(6,1fr)">
        <div class="field"><label>Título en España</label><input class="input" name="titulo" value="${esc(d.titulo)}" required></div>
        <div class="field"><label>Título original</label><input class="input" name="tituloOriginal" value="${esc(d.tituloOriginal || "")}"></div>
        <div class="field s2"><label>Año</label><input class="input" name="anio" type="number" min="1890" max="2100" value="${esc(d.anio || "")}"></div>
        <div class="field s2"><label>Duración (min)</label><input class="input" name="duracion" type="number" min="1" value="${esc(d.duracion || "")}"></div>
        <div class="field s2"><label>País</label><input class="input" name="pais" list="paises" value="${esc(d.pais || "")}"></div>
        <div class="field full"><label>Director/es <span class="dim">(separa con " / ")</span></label><input class="input" name="director" value="${esc(d.director || "")}"></div>
      </div></div>
    <div class="form">
      <div class="field full"><label>Géneros</label><div class="chips" id="fgen">${GENEROS.map((g) => `<button type="button" class="chip ${(d.generos || []).includes(g) ? "on" : ""}" data-g="${g}">${g}</button>`).join("")}</div></div>
      <div class="field full"><label>Tu nota</label><div class="rating-input">${scoreBadge(d.nota, "lg")}<input type="range" min="0" max="10" step="0.1" value="${d.nota}" id="fnota"><span class="words" id="fwords">${veredicto(d.nota)}</span></div></div>
      <div class="field s2"><label>Fecha en que la viste</label><input class="input" name="fechaVisto" type="date" value="${esc(d.fechaVisto || "")}"></div>
      <div class="field s2"><label>Dónde</label><select class="select" name="lugar">${lugarOptions(d.lugar)}</select></div>
      <div class="field full"><label>Tu reseña / notas</label><textarea class="textarea" name="resena" placeholder="Qué te pareció, con quién la viste, escenas que recordar…">${esc(d.resena || "")}</textarea></div>
      <div class="field full"><label class="toggle"><input type="checkbox" name="favorita" ${d.favorita ? "checked" : ""}><span class="sw"></span>Favorita</label></div>
    </div>
    <datalist id="paises">${[...new Set(S.db.peliculas.map((x) => x.pais).filter(Boolean))].sort().map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
    <div id="fdup"></div>
    <div class="form-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="fsave">${icon("check")}${edit ? "Guardar cambios" : "Añadir a mi colección"}</button></div>
  </div>`, "narrow");

  const sheet = $("#modal .sheet");
  const val = (n) => $(`[name="${n}"]`, sheet);
  const range = $("#fnota");
  range.oninput = () => {
    const n = +range.value;
    $(".rating-input .score", sheet).outerHTML = scoreBadge(n, "lg");
    $("#fwords").textContent = veredicto(n);
  };
  $$("#fgen .chip", sheet).forEach((b) => (b.onclick = () => b.classList.toggle("on")));
  const checkDup = () => {
    if (edit) return;
    const t = norm(val("titulo").value), y = +val("anio").value;
    const dup = S.db.peliculas.find((x) => (norm(x.titulo) === t || (x.tituloOriginal && norm(x.tituloOriginal) === t)) && (!y || !x.anio || Math.abs(x.anio - y) <= 1));
    $("#fdup").innerHTML = dup ? `<div class="card" style="padding:12px 14px;margin-top:16px;border-color:rgba(var(--acento-rgb),.4)">Ya tienes <b>${esc(dup.titulo)}</b> (${dup.anio}) con un ${fmt1(dup.nota)}. <a href="#" data-edit="${dup.id}" style="color:var(--gold)">Editar esa ficha</a></div>` : "";
  };
  val("titulo").onblur = checkDup;
  val("anio").onchange = checkDup;

  // autocompletar (Wikidata)
  const q = $("#acq");
  if (q) {
    let t, seq = 0, results = [];
    const list = $("#acl");
    const pick = (r) => {
      Object.assign(d, { ids: r.ids || {}, poster: r.poster || null });
      val("titulo").value = r.titulo || "";
      val("tituloOriginal").value = r.tituloOriginal || "";
      val("anio").value = r.anio || "";
      val("duracion").value = r.duracion || "";
      val("director").value = r.director || "";
      val("pais").value = r.pais || "";
      $$("#fgen .chip", sheet).forEach((b) => b.classList.toggle("on", (r.generos || []).includes(b.dataset.g)));
      $("#fposter").innerHTML = posterHTML({ ...r });
      list.hidden = true;
      q.value = r.titulo;
      checkDup();
      range.focus();
    };
    const search = async () => {
      const s = q.value.trim();
      if (s.length < 2) { list.hidden = true; return; }
      const my = ++seq;
      list.hidden = false;
      list.innerHTML = `<div class="ac-empty">Buscando “${esc(s)}”…</div>`;
      try {
        results = await api(`buscar?q=${encodeURIComponent(s)}`);
        if (my !== seq) return;
        list.innerHTML = results.length ? results.map((r, i) => `<div class="ac-item" data-i="${i}"><div class="mini">${r.poster ? `<img src="${esc(r.poster)}" referrerpolicy="no-referrer" alt="">` : ""}</div><div><div style="font-weight:600">${esc(r.titulo)} <span class="dim">${r.anio || ""}</span></div><div class="s">${esc([r.tituloOriginal !== r.titulo ? r.tituloOriginal : "", r.director].filter(Boolean).join(" · "))}</div></div></div>`).join("")
          : `<div class="ac-empty">Sin resultados. Rellena los datos a mano.</div>`;
        $$(".ac-item", list).forEach((el) => (el.onclick = () => pick(results[+el.dataset.i])));
      } catch (e) {
        list.innerHTML = `<div class="ac-empty">No se pudo buscar (¿sin internet?). Rellena los datos a mano.</div>`;
      }
    };
    q.oninput = () => { clearTimeout(t); t = setTimeout(search, 380); val("titulo").value = val("titulo").value || ""; };
    q.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); if (results[0] && !list.hidden) pick(results[0]); } };
    if (q.value) search();
    setTimeout(() => q.focus(), 50);
  }

  $("#fsave").onclick = async () => {
    const titulo = val("titulo").value.trim();
    if (!titulo) { val("titulo").focus(); return toast("Falta el título", "x"); }
    const data = {
      titulo, tituloOriginal: val("tituloOriginal").value.trim() || null,
      anio: +val("anio").value || null, duracion: +val("duracion").value || null,
      director: val("director").value.trim(), pais: val("pais").value.trim(),
      generos: $$("#fgen .chip.on", sheet).map((b) => b.dataset.g),
      nota: Math.round(+range.value * 10) / 10,
      fechaVisto: val("fechaVisto").value || null, lugar: val("lugar").value || null,
      resena: val("resena").value.trim(),
      favorita: val("favorita").checked,
    };
    const btn = $("#fsave");
    btn.disabled = true;
    try {
      if (edit) {
        await api(`peliculas/${p.id}`, { method: "PUT", body: data });
        toast("Cambios guardados · Excel actualizado");
      } else {
        const body = { ...data, ids: d.ids || {}, poster: d.poster || null, taquilla: {} };
        if (preset._pendiente) body.desdePendiente = preset._pendiente;
        const r = await api("peliculas", { method: "POST", body });
        toast(`«${r.titulo}» añadida con un ${fmt1(r.nota)}${STATIC ? "" : " · Excel actualizado"}`);
        completarDesdeWiki(r).then(refrescarSilencioso);
      }
      await refreshDB();
      closeModal();
      render._keep = true;
      render();
    } catch (e) { toast(e.message, "x"); btn.disabled = false; }
  };
}

// ---------------------------------------------------------------- Estadísticas
function hbars(rows, opts = {}) {
  const max = opts.max ?? Math.max(...rows.map((r) => r.value), 1);
  return rows.map((r) => `<div class="hbar" ${r.tip ? `data-tip="${esc(r.tip)}"` : ""} ${r.href ? `onclick="location.hash='${r.href}'" style="cursor:pointer"` : ""}>
    <span class="n">${esc(r.label)}</span><div class="track"><div class="fill" style="width:${(100 * r.value) / max}%;${r.color ? `background:${r.color}` : ""}"></div></div>
    <span class="v">${r.right ?? r.value}</span></div>`).join("");
}
function histogram(P) {
  const bins = Array.from({ length: 10 }, (_, i) => P.filter((p) => (i === 9 ? p.nota >= 9 : p.nota >= i && p.nota < i + 1)).length);
  const W = 560, H = 210, pad = 26, bw = (W - pad * 2) / 10, max = Math.max(...bins);
  return `<svg viewBox="0 0 ${W} ${H + 24}" width="100%">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pad}" x2="${W - pad}" y1="${H - f * (H - 20)}" y2="${H - f * (H - 20)}" style="stroke:rgba(var(--fg-rgb),.05)"/>`).join("")}
    ${bins.map((b, i) => { const h = (b / max) * (H - 20); const x = pad + i * bw; return `<g data-tip="${b} películas entre ${i} y ${i + 1}"><rect x="${x + 5}" y="${H - h}" width="${bw - 10}" height="${h}" rx="1" fill="${scoreColor(i + 0.5)}" opacity=".9"/><text x="${x + bw / 2}" y="${H - h - 7}" text-anchor="middle" font-size="12" fill="#cdbfa6">${b}</text><text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="12" fill="#94867a">${i}</text></g>`; }).join("")}
  </svg>`;
}
function decadeChart(pr) {
  const D = [...pr.decades.values()].sort((a, b) => a.key - b.key);
  const W = 560, H = 220, pad = 30, bw = (W - pad * 2) / D.length, max = Math.max(...D.map((d) => d.n));
  const y = (m) => H - ((m - 3) / 7) * (H - 30);
  const pts = D.map((d, i) => `${pad + i * bw + bw / 2},${y(d.mean)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H + 26}" width="100%">
    ${D.map((d, i) => { const h = (d.n / max) * (H - 40); const x = pad + i * bw; return `<g data-tip="Años ${String(d.key).slice(2)}: ${d.n} películas · media ${fmt1(d.mean)}"><rect x="${x + 6}" y="${H - h}" width="${bw - 12}" height="${h}" rx="1" fill="rgba(241,230,208,.16)"/><text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="11.5" fill="#94867a">${String(d.key).slice(2)}s</text></g>`; }).join("")}
    <polyline points="${pts}" fill="none" stroke-width="2.5" stroke-linejoin="round" style="stroke:var(--bombilla)"/>
    ${D.map((d, i) => `<circle cx="${pad + i * bw + bw / 2}" cy="${y(d.mean)}" r="4.5" stroke-width="2.5" data-tip="Años ${String(d.key).slice(2)}: media ${fmt1(d.mean)}" style="fill:var(--sala);stroke:var(--bombilla)"/>`).join("")}
  </svg><div class="legend"><span><i style="background:rgba(var(--acento-rgb),.35)"></i>Películas vistas</span><span><i style="background:var(--bombilla)"></i>Tu nota media</span></div>`;
}
function scatter(P, fx, lx, domain) {
  const W = 560, H = 240, pad = 34;
  const [x0, x1] = domain;
  const X = (v) => pad + ((v - x0) / (x1 - x0)) * (W - pad * 2);
  const Y = (n) => H - 10 - (n / 10) * (H - 30);
  const pts = P.filter((p) => fx(p) != null && fx(p) >= x0 && fx(p) <= x1);
  // regresión lineal
  const xs = pts.map(fx), ys = pts.map((p) => p.nota), mx = mean(xs), my = mean(ys);
  const b = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
  const a = my - b * mx;
  const ticks = lx(x0, x1);
  return `<svg viewBox="0 0 ${W} ${H + 22}" width="100%">
    ${[2, 4, 6, 8, 10].map((n) => `<line x1="${pad}" x2="${W - pad}" y1="${Y(n)}" y2="${Y(n)}" style="stroke:rgba(var(--fg-rgb),.05)"/><text x="${pad - 8}" y="${Y(n) + 4}" text-anchor="end" font-size="11" fill="#94867a">${n}</text>`).join("")}
    ${ticks.map((t) => `<text x="${X(t)}" y="${H + 16}" text-anchor="middle" font-size="11" fill="#94867a">${t}</text>`).join("")}
    ${pts.map((p) => `<circle cx="${X(fx(p)).toFixed(1)}" cy="${Y(p.nota).toFixed(1)}" r="3.6" fill="${scoreColor(p.nota)}" opacity=".7" data-tip="${esc(p.titulo)} (${p.anio}) · ${fmt1(p.nota)}" data-open="${p.id}" style="cursor:pointer"/>`).join("")}
    <line x1="${X(x0)}" y1="${Y(a + b * x0)}" x2="${X(x1)}" y2="${Y(a + b * x1)}" stroke-width="1.5" stroke-dasharray="5 5" opacity=".6" style="stroke:var(--papel)"/>
  </svg>`;
}
VIEWS.estadisticas = (v) => {
  const pr = profile();
  const P = pr.P;
  if (P.length < 2) {
    v.innerHTML = `<div class="page-head"><h1 class="h1">Estadísticas</h1></div><div class="empty"><div class="h2">Aún no hay datos</div>Cuando tengas al menos un par de películas con nota verás aquí tus números: notas, décadas, géneros, países y más.<br><a class="btn btn-primary rw" href="#/anadir" style="margin-top:18px">Añadir película</a></div>`;
    return;
  }
  const all = S.db.peliculas;
  const horas = all.reduce((a, p) => a + (p.duracion || 0), 0) / 60;
  const G = [...pr.genres.values()].sort((a, b) => b.n - a.n);
  const C = [...pr.countries.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  const Dir = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.mean - a.mean);
  const Sg = [...pr.sagas.values()].filter((s) => s.n >= 2).sort((a, b) => b.mean - a.mean);
  const ucm = all.filter((p) => p.saga === "UCM" && p.nota != null);
  const fases = [...new Set(ucm.map((p) => p.fase))].sort().map((f) => ({ f, L: ucm.filter((p) => p.fase === f) }));
  const taq = all.filter((p) => (p.taquilla || {}).mundial).sort((a, b) => b.taquilla.mundial - a.taquilla.mundial).slice(0, 10);
  const longest = [...all].filter((p) => p.duracion).sort((a, b) => b.duracion - a.duracion)[0];
  const oldest = [...all].filter((p) => p.anio).sort((a, b) => a.anio - b.anio)[0];
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Tus números</h1><p>Todo lo que dice tu colección, calculado en directo. Pasa el ratón por los gráficos para ver el detalle.</p></div></div>
  <div class="kpis">
    <div class="card kpi"><div class="l">Películas</div><div class="v">${fmtInt(all.length)}</div><div class="s">${S.db.series.length} series aparte</div></div>
    <div class="card kpi"><div class="l">Horas de cine</div><div class="v">${fmtInt(horas)}</div><div class="s">${fmt1(horas / 24)} días seguidos</div></div>
    <div class="card kpi"><div class="l">Nota media</div><div class="v">${fmt2(pr.mu)}</div><div class="s">mediana ${fmt1([...P].sort((a, b) => a.nota - b.nota)[Math.floor(P.length / 2)].nota)}</div></div>
    <div class="card kpi"><div class="l">Obras maestras</div><div class="v">${P.filter((p) => p.nota >= 9).length}</div><div class="s">con 9 o más</div></div>
    <div class="card kpi"><div class="l">Suspensos</div><div class="v">${P.filter((p) => p.nota < 5).length}</div><div class="s">${Math.round((100 * P.filter((p) => p.nota < 5).length) / P.length)}% del total</div></div>
    <div class="card kpi"><div class="l">La más larga</div><div class="v">${longest ? longest.duracion : "–"}′</div><div class="s">${esc(longest?.titulo || "")}</div></div>
    <div class="card kpi"><div class="l">La más antigua</div><div class="v">${oldest?.anio || "–"}</div><div class="s">${esc(oldest?.titulo || "")}</div></div>
  </div>
  <div class="charts section" style="margin-top:22px">
    <div class="card chart"><h3>Cómo puntúas</h3><div class="cap">Reparto de tus notas de 0 a 10</div>${histogram(P)}</div>
    <div class="card chart"><h3>Por décadas</h3><div class="cap">Cuántas has visto de cada época y qué nota les das</div>${decadeChart(pr)}</div>
    <div class="card chart"><h3>Géneros</h3><div class="cap">Nº de películas · color según tu nota media (clic para filtrar)</div>
      ${hbars(G.map((g) => ({ label: g.key, value: g.n, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}`, tip: `${g.key}: ${g.n} películas, media ${fmt1(g.mean)}`, href: `#/coleccion?genre=${encodeURIComponent(g.key)}` })))}</div>
    <div class="card chart"><h3>Países</h3><div class="cap">Top 10 por número de películas</div>
      ${hbars(C.map((g) => ({ label: g.key, value: g.n, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}`, tip: `${g.key}: media ${fmt1(g.mean)}`, href: `#/coleccion?country=${encodeURIComponent(g.key)}` })))}
      <div class="sub">Tus directores (mín. 3 películas)</div>
      <table class="tbl"><tbody>${Dir.slice(0, 8).map((d) => `<tr class="click" onclick="location.hash='#/coleccion?q=${encodeURIComponent(d.key)}'"><td>${esc(d.key)}</td><td class="r dim">${d.n}</td><td class="r">${scoreBadge(d.mean)}</td></tr>`).join("")}</tbody></table></div>
    <div class="card chart"><h3>¿Te gustan más las largas?</h3><div class="cap">Duración (min) frente a tu nota · la línea es la tendencia</div>${scatter(P, (p) => p.duracion, () => [80, 100, 120, 140, 160, 180, 200], [70, 210])}</div>
    <div class="card chart"><h3>¿Antiguas o modernas?</h3><div class="cap">Año de estreno frente a tu nota</div>${scatter(P, (p) => p.anio, () => [1940, 1960, 1980, 2000, 2020], [1935, 2027])}</div>
    <div class="card chart"><h3>Universo Marvel por fases</h3><div class="cap">Tu nota media en cada fase del UCM</div>
      ${hbars(fases.map((f) => ({ label: f.f.replace(/ · .*/, ""), value: mean(f.L.map((p) => p.nota)), color: scoreColor(mean(f.L.map((p) => p.nota))), right: fmt1(mean(f.L.map((p) => p.nota))), tip: f.f })), { max: 10 })}
      <p class="dim" style="font-size:12.5px;margin-top:14px">${ucm.length} películas del UCM vistas · media ${fmt1(mean(ucm.map((p) => p.nota)))}</p></div>
    <div class="card chart w12"><h3>Las más taquilleras que has visto</h3><div class="cap">Recaudación mundial y tu nota</div>
      <table class="tbl"><thead><tr><th>Película</th><th class="r">Año</th><th class="r">Mundial</th><th class="r">Tu nota</th></tr></thead><tbody>
      ${taq.map((p) => `<tr class="click" data-open="${p.id}"><td>${esc(p.titulo)}</td><td class="r dim">${p.anio}</td><td class="r">${money(p.taquilla.mundial)}</td><td class="r">${scoreBadge(p.nota)}</td></tr>`).join("")}</tbody></table></div>
  </div>`;
};

// ---------------------------------------------------------------- Mis gustos
function insights() {
  const pr = profile();
  const P = pr.P;
  const out = [];
  const G = [...pr.genres.values()].filter((g) => g.n >= 8);
  const favG = [...G].sort((a, b) => b.adj - a.adj);
  const most = [...pr.genres.values()].sort((a, b) => b.n - a.n)[0];
  const aprob = P.filter((p) => p.nota >= 5).length / P.length;
  const exig = pr.mu < 6 ? "exigente" : pr.mu < 6.8 ? "equilibrado" : "generoso";
  out.push({ big: fmt2(pr.mu), ttl: `Eres un espectador ${exig}`, txt: `Tu nota media es ${fmt2(pr.mu)} y apruebas el ${Math.round(aprob * 100)}% de lo que ves. Solo ${P.filter((p) => p.nota >= 9).length} películas han llegado al 9.` });
  if (favG[0]) out.push({ big: fmt1(favG[0].mean), ttl: `Tu terreno: ${frase(favG[0].key)}`, txt: `Es donde más brillas: media de ${fmt1(favG[0].mean)} en ${favG[0].n} películas${favG[1] ? `, seguido de ${frase(favG[1].key)} (${fmt1(favG[1].mean)})` : ""}.` });
  const dirs = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.adj - a.adj);
  if (dirs[0]) out.push({ big: fmt1(dirs[0].mean), ttl: `Director de cabecera: ${dirs[0].key}`, txt: `${dirs[0].n} películas vistas con una media de ${fmt1(dirs[0].mean)}. Detrás: ${dirs.slice(1, 3).map((d) => `${d.key} (${fmt1(d.mean)})`).join(" y ")}.` });
  if (most) out.push({ big: most.n, ttl: `Lo que más ves: ${frase(most.key)}`, txt: `El ${Math.round((100 * most.n) / P.length)}% de tu colección tiene algo de ${most.key.toLowerCase()}. Le das un ${fmt1(most.mean)} de media.` });
  const decs = [...pr.decades.values()].filter((d) => d.n >= 8).sort((a, b) => b.mean - a.mean);
  if (decs[0]) out.push({ big: `${String(decs[0].key).slice(2)}s`, ttl: "Tu década dorada", txt: `Las películas de los ${decs[0].key} son las que mejor puntúas (${fmt1(decs[0].mean)}). Las que menos, las de los ${decs[decs.length - 1].key} (${fmt1(decs[decs.length - 1].mean)}).` });
  const old = P.filter((p) => p.anio < 2000), nw = P.filter((p) => p.anio >= 2015);
  if (old.length > 10 && nw.length > 10) {
    const d = mean(old.map((p) => p.nota)) - mean(nw.map((p) => p.nota));
    out.push({ big: `${d >= 0 ? "+" : ""}${fmt1(d)}`, ttl: d > 0.3 ? "Los clásicos te ganan" : d < -0.3 ? "Lo nuevo te convence más" : "Ni nostálgico ni moderno", txt: `Das ${fmt1(mean(old.map((p) => p.nota)))} a las anteriores al 2000 y ${fmt1(mean(nw.map((p) => p.nota)))} a las de 2015 en adelante. Ojo: de lo antiguo sueles ver ya lo mejor.` });
  }
  const worstG = [...G].sort((a, b) => a.adj - b.adj)[0];
  if (worstG) out.push({ big: fmt1(worstG.mean), ttl: `Tu talón de Aquiles: ${frase(worstG.key)}`, txt: `Es el género que peor puntúas (${worstG.n} películas). ${worstG.items.sort((a, b) => a.nota - b.nota).slice(0, 2).map((p) => `«${p.titulo}» (${fmt1(p.nota)})`).join(" y ")} lo dicen todo.` });
  const esp = P.filter((p) => p.pais === "España");
  const espC = esp.filter((p) => (p.generos || []).includes("Comedia"));
  const espT = esp.filter((p) => (p.generos || []).includes("Thriller") || (p.generos || []).includes("Crimen"));
  if (espC.length >= 5 && espT.length >= 5) out.push({ big: fmt1(mean(espT.map((p) => p.nota))), ttl: "Cine español: thriller sí, comedia no tanto", txt: `Al thriller y el policiaco español le das ${fmt1(mean(espT.map((p) => p.nota)))}; a la comedia española, ${fmt1(mean(espC.map((p) => p.nota)))}. En total has visto ${esp.length} películas españolas.` });
  const anime = P.filter((p) => p.pais === "Japón" && (p.generos || []).includes("Animación"));
  const ghibli = anime.filter((p) => /Miyazaki|Takahata/.test(p.director));
  if (ghibli.length >= 3) out.push({ big: fmt1(mean(ghibli.map((p) => p.nota))), ttl: "Corazón Ghibli", txt: `Miyazaki y Takahata: ${ghibli.length} películas con una media de ${fmt1(mean(ghibli.map((p) => p.nota)))}, muy por encima del resto de animación japonesa (${fmt1(mean(anime.filter((p) => !ghibli.includes(p)).map((p) => p.nota)))}).` });
  const dur = P.filter((p) => p.duracion);
  const longs = dur.filter((p) => p.duracion >= 140), shorts = dur.filter((p) => p.duracion < 100);
  if (longs.length > 10 && shorts.length > 10) {
    const dl = mean(longs.map((p) => p.nota)), ds = mean(shorts.map((p) => p.nota));
    out.push({ big: `${fmt1(dl)} / ${fmt1(ds)}`, ttl: dl > ds + 0.4 ? "Te van las películas largas" : ds > dl + 0.4 ? "Mejor si es corta" : "La duración te da igual", txt: `Las de más de 2 h 20 min se llevan un ${fmt1(dl)} de media; las de menos de 100 minutos, un ${fmt1(ds)}.` });
  }
  const ucm = P.filter((p) => p.saga === "UCM");
  if (ucm.length >= 10) {
    const a = ucm.filter((p) => p.anio <= 2019), b = ucm.filter((p) => p.anio > 2019);
    out.push({ big: fmt1(mean(ucm.map((p) => p.nota))), ttl: "Marvel: fan con reservas", txt: `${ucm.length} películas del UCM. Hasta Endgame les dabas ${fmt1(mean(a.map((p) => p.nota)))}; desde entonces, ${fmt1(mean(b.map((p) => p.nota)))}.` });
  }
  const hor = P.filter((p) => (p.generos || []).includes("Terror"));
  const horSaga = hor.filter((p) => p.saga), horNo = hor.filter((p) => !p.saga);
  if (horSaga.length >= 5 && horNo.length >= 5) out.push({ big: fmt1(mean(horNo.map((p) => p.nota))), ttl: "Terror: original mejor que franquicia", txt: `El terror de autor o independiente te da ${fmt1(mean(horNo.map((p) => p.nota)))}; las sagas de terror (Insidious, La Purga, Saw…) se quedan en ${fmt1(mean(horSaga.map((p) => p.nota)))}.` });
  return out;
}
const insightCard = (i) => `<div class="card insight"><div class="big">${esc(i.big)}</div><div class="ttl">${esc(i.ttl)}</div><p>${esc(i.txt)}</p></div>`;

function radar(pr) {
  const G = [...pr.genres.values()].filter((g) => g.n >= 6).sort((a, b) => b.n - a.n).slice(0, 10);
  const R = 150, cx = 210, cy = 190, n = G.length;
  const pt = (i, r) => [cx + r * Math.sin((2 * Math.PI * i) / n), cy - r * Math.cos((2 * Math.PI * i) / n)];
  const val = (g) => clamp((g.mean - 3) / 6, 0.05, 1);
  const poly = G.map((g, i) => pt(i, R * val(g)).join(",")).join(" ");
  const avgPoly = G.map((_, i) => pt(i, R * clamp((pr.mu - 3) / 6, 0, 1)).join(",")).join(" ");
  return `<svg viewBox="0 0 420 390" width="100%" style="max-width:440px">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${G.map((_, i) => pt(i, R * f).join(",")).join(" ")}" fill="none" stroke="rgba(var(--fg-rgb),.07)"/>`).join("")}
    ${G.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" style="stroke:rgba(var(--fg-rgb),.06)"/>`).join("")}
    <polygon points="${avgPoly}" fill="none" stroke-dasharray="4 4" style="stroke:rgba(var(--fg-rgb),.35)"/>
    <polygon points="${poly}" stroke-width="2" style="fill:rgba(var(--acento-rgb),.2);stroke:var(--bombilla)"/>
    ${G.map((g, i) => { const [x, y] = pt(i, R * val(g)); const [lx, ly] = pt(i, R + 26); return `<circle cx="${x}" cy="${y}" r="4" data-tip="${g.key}: ${fmt1(g.mean)} (${g.n} películas)" style="fill:var(--bombilla)"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11.5" fill="#cdbfa6">${g.key}</text>`; }).join("")}
  </svg>`;
}
VIEWS.gustos = (v) => {
  const pr = profile();
  const G = [...pr.genres.values()].filter((g) => g.n >= 8).sort((a, b) => b.adj - a.adj);
  const dirs = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.adj - a.adj);
  const top = [...pr.P].sort((a, b) => b.nota - a.nota).slice(0, 3);
  const persona = `Te mueven <em>${G.slice(0, 2).map((g) => frase(g.key)).join("</em> y <em>")}</em>, confías en <em>${dirs.slice(0, 2).map((d) => d.key).join(" y ")}</em> y tu Olimpo lo forman ${top.map((p) => `«${esc(p.titulo)}»`).join(", ")}.`;
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Mis gustos</h1><p>Un retrato de cómo ves el cine a partir de tus ${pr.N} notas. Se recalcula cada vez que añades una película.</p></div></div>
  <div class="card card-pad dna">
    <div>${radar(pr)}<div class="legend" style="justify-content:center"><span><i style="background:var(--bombilla)"></i>Tu nota por género</span><span><i style="background:rgba(var(--fg-rgb),.35)"></i>Tu media general (${fmt2(pr.mu)})</span></div></div>
    <div><div class="eyebrow">En una frase</div><p class="persona" style="margin:12px 0 22px">${persona}</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:22px">
        <div><div class="sub" style="margin-top:0">Te encanta</div>${G.slice(0, 5).map((g) => `<div class="hbar" style="grid-template-columns:1fr 50px"><span class="n">${g.key}</span><span class="v">${scoreBadge(g.mean)}</span></div>`).join("")}</div>
        <div><div class="sub" style="margin-top:0">Te cuesta</div>${G.slice(-5).reverse().map((g) => `<div class="hbar" style="grid-template-columns:1fr 50px"><span class="n">${g.key}</span><span class="v">${scoreBadge(g.mean)}</span></div>`).join("")}</div>
      </div></div>
  </div>
  <section class="section">${sectionHead("Lo que dicen tus notas")}<div class="insights">${insights().map(insightCard).join("")}</div></section>
  ${seriesInsights().length ? `<section class="section">${sectionHead("Y en series…", "#/series", "Ver tus series")}<div class="insights">${seriesInsights().map(insightCard).join("")}</div></section>` : ""}
  <section class="section">${sectionHead("Tus directores")}
    <div class="card card-pad"><table class="tbl"><thead><tr><th>Director</th><th class="r">Películas</th><th class="r">Nota media</th><th>Mejor</th><th>Peor</th></tr></thead><tbody>
    ${dirs.slice(0, 25).map((d) => { const s = [...d.items].sort((a, b) => b.nota - a.nota); return `<tr class="click" onclick="location.hash='#/coleccion?q=${encodeURIComponent(d.key)}'"><td><b>${esc(d.key)}</b></td><td class="r dim">${d.n}</td><td class="r">${scoreBadge(d.mean)}</td><td class="muted">${esc(s[0].titulo)} <span class="dim">${fmt1(s[0].nota)}</span></td><td class="muted">${esc(s[s.length - 1].titulo)} <span class="dim">${fmt1(s[s.length - 1].nota)}</span></td></tr>`; }).join("")}
    </tbody></table></div></section>`;
};

// ---------------------------------------------------------------- Recomendaciones
function seenKey(p) { return [norm(p.titulo) + "|" + (p.anio || ""), norm(p.tituloOriginal || "") + "|" + (p.anio || "")]; }
function seenSet() {
  const s = new Set();
  for (const p of S.db.peliculas) for (const y of [p.anio - 1, p.anio, p.anio + 1]) { s.add(norm(p.titulo) + "|" + y); if (p.tituloOriginal) s.add(norm(p.tituloOriginal) + "|" + y); }
  return s;
}
const isSeen = (x, set) => set.has(norm(x.titulo) + "|" + (x.anio || "")) || (x.tituloOriginal && set.has(norm(x.tituloOriginal) + "|" + (x.anio || ""))) || (x.original && set.has(norm(x.original) + "|" + String(x.fecha || "").slice(0, 4)));
function descartadas() { try { return new Set(JSON.parse(localStorage.getItem("cine.desc") || "[]")); } catch (e) { return new Set(); } }
function topRecs(n = 999, filt = {}) {
  const seen = seenSet();
  const pend = new Set(S.db.pendientes.map((w) => norm(w.titulo)));
  const desc = descartadas();
  return S.cat.map((c, i) => ({ ...c, _i: i }))
    .filter((c) => !isSeen(c, seen) && !desc.has(norm(c.tituloOriginal)))
    .filter((c) => !filt.genre || c.generos.includes(filt.genre))
    .filter((c) => !filt.era || (filt.era === "clasicos" ? c.anio < 1990 : filt.era === "recientes" ? c.anio >= 2020 : c.anio >= 1990 && c.anio < 2020))
    .map((c) => ({ ...c, m: predict(c), pend: pend.has(norm(c.titulo)) }))
    .sort((a, b) => b.m.nota - a.m.nota)
    .filter(diversify(filt.variedad ?? 2))
    .slice(0, n);
}
// evita que la lista se llene del mismo director o de la misma década
function diversify(maxDir) {
  const dirs = new Map(), decs = new Map();
  return (c) => {
    const d = splitDir(c.director)[0], dec = Math.floor(c.anio / 10);
    const nd = dirs.get(d) || 0, ne = decs.get(dec) || 0;
    if (nd >= maxDir || (maxDir === 1 && ne >= 3)) return false;
    dirs.set(d, nd + 1); decs.set(dec, ne + 1);
    return true;
  };
}
function recCard(r) {
  const jw = `https://www.justwatch.com/es/buscar?q=${encodeURIComponent(r.titulo)}`;
  const fa = extLinks(r)[0].u;
  return `<div class="card rec">
    <div class="frame" data-cat="${r._i}">${posterHTML(r)}</div>
    <div style="min-width:0">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div class="t">${esc(r.titulo)}</div>${matchTag(r.m.pct)}</div>
      <div class="s">${r.anio} · ${esc(r.director)} · ${esc(r.pais)}</div>
      <div class="chips">${r.generos.map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      <div class="why">${r.m.why.map((w) => `<span>${esc(w)}</span>`).join("")}</div>
      <div class="acts">
        <a class="btn btn-sm" href="${jw}" target="_blank" rel="noopener">${icon("play")}Dónde verla</a>
        <a class="btn btn-sm btn-ghost" href="${fa}" target="_blank" rel="noopener">FilmAffinity</a>
        ${r.pend ? `<span class="chip gold">En pendientes</span>` : `<button class="btn btn-sm btn-ghost" data-want="${r._i}" title="Añadir a pendientes">${icon("bookmark")}</button>`}
        <button class="btn btn-sm btn-ghost" data-seen="${r._i}" title="Ya la he visto">${icon("eye")}</button>
        <button class="btn btn-sm btn-ghost" data-nope="${r._i}" title="No me interesa">${icon("eyeoff")}</button>
      </div>
    </div></div>`;
}
VIEWS.recomendaciones = (v) => {
  const f = S.recs;
  const draw = () => {
    const L = topRecs(60, f);
    $("#recRes").innerHTML = L.length ? `<div class="recs">${L.map(recCard).join("")}</div>` : `<div class="empty"><div class="h2">Sin recomendaciones con ese filtro</div></div>`;
  };
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Para ti</h1>
    <p>Películas que no tienes registradas, ordenadas por la nota que <b>predigo que les darías</b> según tus géneros, directores, países y épocas favoritos. El % es tu afinidad.</p>
    <p class="dim" style="font-size:12.5px">Probado con tus propias notas (tapando cada película y prediciéndola): el modelo se desvía de media ±1,0 puntos, frente a ±1,3 si adivinara siempre tu media.</p></div></div>
  <div class="toolbar" style="position:static">
    <div class="chips" id="rg"><button class="chip ${!f.genre ? "on" : ""}" data-g="">Todo</button>${GENEROS.filter((g) => S.cat.some((c) => c.generos.includes(g))).map((g) => `<button class="chip ${f.genre === g ? "on" : ""}" data-g="${g}">${g}</button>`).join("")}</div>
    <div class="seg" id="re">${[["", "Todas"], ["clasicos", "Clásicos"], ["modernas", "1990–2019"], ["recientes", "2020+"]].map(([k, l]) => `<button data-e="${k}" class="${f.era === k ? "on" : ""}">${l}</button>`).join("")}</div>
  </div>
  <div id="recRes"></div>`;
  $$("#rg .chip", v).forEach((b) => (b.onclick = () => { f.genre = b.dataset.g; $$("#rg .chip", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  $$("#re button", v).forEach((b) => (b.onclick = () => { f.era = b.dataset.e; $$("#re button", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  draw();
};
function openCat(i) {
  const c = S.cat[i];
  const m = predict(c);
  modal(`<div class="sheet-body"><div class="detail">
    <div><div class="poster">${posterHTML(c)}</div></div>
    <div><div class="eyebrow">Recomendación · ${m.pct}% afinidad</div><h2 style="margin-top:8px">${esc(c.titulo)}</h2>
      ${c.tituloOriginal !== c.titulo ? `<div class="orig">${esc(c.tituloOriginal)}</div>` : ""}
      <div class="facts"><span>${icon("calendar")}${c.anio}</span><span>${icon("user")}${esc(c.director)}</span><span>${icon("globe")}${esc(c.pais)}</span></div>
      <div class="chips">${c.generos.map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      <div class="myscore">${scoreBadge(m.nota, "lg")}<div><div class="lbl">Nota que predigo que le darías</div><div class="verdict">${veredicto(m.nota)}</div></div></div>
      <div class="why" style="display:flex;flex-direction:column;gap:6px;color:var(--text-2)">${m.why.map((w) => `<span>— ${esc(w)}</span>`).join("")}</div>
      <div class="sub">Ver en</div>${linksHTML(c)}
      <div class="dl-actions"><button class="btn btn-primary" data-seen="${i}">${icon("eye")}Ya la vi: puntuarla</button><button class="btn" data-want="${i}">${icon("bookmark")}Añadir a pendientes</button></div>
    </div></div></div>`);
}

// ---------------------------------------------------------------- Estrenos
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function upcoming() { const t = addDays(todayISO(), -6); return (S.est.estrenos || []).filter((e) => e.fecha >= t); }
function relCard(e) {
  const m = e.m || predict(e);
  const seen = isSeen({ titulo: e.titulo, anio: +e.fecha.slice(0, 4), original: e.original, fecha: e.fecha }, seenSet());
  return `<div class="card rel" data-rel="${esc(e.fecha + "|" + e.titulo)}" style="cursor:pointer">
    <div class="frame">${posterHTML({ ...e, anio: e.fecha.slice(0, 4) })}</div>
    <div style="min-width:0"><div class="t">${esc(e.titulo)}${e.destacado ? ` <span class="dest" title="Estreno destacado">●</span>` : ""}</div>
      <div class="s">${esc([e.director, e.pais].filter(Boolean).join(" · ") || "—")}</div>
      <div class="chips" style="margin-top:8px"><span class="chip gold">${diaSemana(e.fecha)} ${fechaLarga(e.fecha)}</span>${(e.generos || []).slice(0, 2).map((g) => `<span class="chip">${g}</span>`).join("")}</div></div>
    <div class="right">${seen ? `<span class="chip on">${icon("check")}Vista</span>` : matchTag(m.pct)}</div></div>`;
}
function openRel(key) {
  const e = (S.est.estrenos || []).find((x) => x.fecha + "|" + x.titulo === key);
  if (!e) return;
  const m = predict(e);
  const q = encodeURIComponent(e.titulo);
  modal(`<div class="sheet-body"><div class="detail">
    <div><div class="poster">${posterHTML({ ...e, anio: e.fecha.slice(0, 4) })}</div></div>
    <div><div class="eyebrow">Estreno en cines · ${diaSemana(e.fecha)} ${fechaLarga(e.fecha)} ${e.fecha.slice(0, 4)}${e.provisional ? " (provisional)" : ""}</div>
      <h2 style="margin-top:8px">${esc(e.titulo)}</h2>${e.original && norm(e.original) !== norm(e.titulo) ? `<div class="orig">${esc(e.original)}</div>` : ""}
      <div class="facts">${e.director ? `<span>${icon("user")}${esc(e.director)}</span>` : ""}${e.pais ? `<span>${icon("globe")}${esc(e.pais)}</span>` : ""}${e.reparto ? `<span>${icon("star")}${esc(e.reparto)}</span>` : ""}</div>
      <div class="chips">${(e.generos || []).map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      ${e.sinopsis ? `<p class="muted" style="margin-top:14px">${esc(e.sinopsis)}</p>` : ""}
      <div class="myscore">${matchTag(m.pct)}<div><div class="lbl">Afinidad contigo</div><div class="verdict">Predicción: ${fmt1(m.nota)} · ${veredicto(m.nota)}</div></div></div>
      ${m.why.length ? `<div style="display:flex;flex-direction:column;gap:6px;color:var(--text-2);font-size:13.5px">${m.why.map((w) => `<span>— ${esc(w)}</span>`).join("")}</div>` : ""}
      ${sesionesDe(e.titulo, e.fa) ? `<div class="sub">Sesiones en tus cines</div>${sesionesHTML(sesionesDe(e.titulo, e.fa), null, 4)}` : `<div class="sub">Cartelera de tus cines</div>
      <div class="links">${misCines().length ? misCines().map((c) => `<a class="ext" href="https://www.filmaffinity.com/es/theater-showtimes.php?id=${c.id}" target="_blank" rel="noopener"><span class="logo" style="background:#2a2a36">${icon("ticket")}</span>${esc(c.nombre)}</a>`).join("") : `<a class="ext" href="#" data-cines><span class="logo" style="background:#2a2a36">${icon("pin")}</span>Elegir mis cines</a>`}</div>`}
      <div class="sub">Más info</div>
      <div class="links">
        <a class="ext" href="${e.fa ? `https://www.filmaffinity.com/es/film${e.fa}.html` : `https://www.filmaffinity.com/es/search.php?stext=${q}`}" target="_blank" rel="noopener"><span class="logo" style="background:#1d4d8c">FA</span>FilmAffinity</a>
        <a class="ext" href="https://www.sensacine.com/buscar/?q=${q}" target="_blank" rel="noopener"><span class="logo" style="background:#e30613">SC</span>SensaCine</a>
        <a class="ext" href="https://www.imdb.com/es-es/find/?q=${encodeURIComponent(e.original || e.titulo)}" target="_blank" rel="noopener"><span class="logo" style="background:#c9a200">IMDb</span>IMDb</a>
        <a class="ext" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.titulo + " tráiler español")}" target="_blank" rel="noopener"><span class="logo" style="background:#c4302b">${icon("play")}</span>Tráiler</a>
      </div>
      <div class="dl-actions"><button class="btn btn-primary" data-relwant="${esc(key)}">${icon("bookmark")}Quiero verla</button><button class="btn" data-relseen="${esc(key)}">${icon("eye")}Ya la vi</button></div>
    </div></div></div>`);
}
VIEWS.estrenos = (v) => {
  const st = S.est_;
  const all = upcoming().map((e) => ({ ...e, m: predict(e) }));
  const filt = (L) => st.filter === "parami" ? L.filter((e) => e.m.pct >= 62) : st.filter === "destacados" ? L.filter((e) => e.destacado) : L;
  const L = filt(all);
  const upd = S.est.actualizado ? new Date(S.est.actualizado + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  if (!st.month) st.month = todayISO().slice(0, 7);
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Estrenos en España</h1>
    <p>Fechas de estreno en cines españoles${upd ? `, actualizadas el ${upd}` : ""}. El % es lo que encaja contigo.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${S.db.estado?.tmdb ? `<button class="btn" id="estUpd">${icon("refresh")}Actualizar desde TMDb</button>` : ""}
      <div class="seg" id="estMode"><button data-m="lista" class="${st.mode === "lista" ? "on" : ""}">Lista</button><button data-m="cal" class="${st.mode === "cal" ? "on" : ""}">Calendario</button></div></div></div>
  <div class="cinemas">${misCines().map((c) => `<div class="card cinema"><div class="n">${esc(c.nombre)}</div><div class="c">${icon("pin")} ${esc([c.ciudad, c.direccion].filter(Boolean).join(" · "))}</div>
    <div class="a"><a class="btn btn-sm" href="#/cartelera">${icon("ticket")}Sesiones</a><a class="btn btn-sm btn-ghost" href="https://www.filmaffinity.com/es/theater-showtimes.php?id=${c.id}" target="_blank" rel="noopener">Horarios FA</a></div></div>`).join("")}</div>
  <div class="toolbar" style="position:static;margin-top:20px">
    <div class="seg" id="estF">${[["todos", "Todos"], ["parami", "Encajan conmigo"], ["destacados", "Los grandes"]].map(([k, l]) => `<button data-f="${k}" class="${st.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <span class="dim" style="font-size:13px">${L.length} estrenos</span>
  </div>
  <div id="estBody"></div>`;
  const body = $("#estBody");
  if (st.mode === "cal") {
    const [yy, mm] = st.month.split("-").map(Number);
    const first = new Date(yy, mm - 1, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = [];
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const byDay = {};
    filt((S.est.estrenos || []).map((e) => ({ ...e, m: predict(e) }))).forEach((e) => (byDay[e.fecha] = byDay[e.fecha] || []).push(e));
    const shift = (n) => { const d = new Date(yy, mm - 1 + n, 1); st.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; render._keep = true; VIEWS.estrenos(v); };
    body.innerHTML = `<div class="section-head" style="margin-top:6px"><div class="cal-nav"><button class="icon-btn" id="cPrev">${icon("left")}</button><h2 class="h2">${MESES[mm - 1]} ${yy}</h2><button class="icon-btn" id="cNext">${icon("right")}</button></div>
      <div class="legend"><span><i style="background:var(--gold)"></i>Destacado</span><span><i style="background:var(--green)"></i>Encaja contigo</span></div></div>
      <div class="cal">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<div class="dow">${d}</div>`).join("")}
      ${days.map((d) => { const k = iso(d); const es = (byDay[k] || []).sort((a, b) => b.m.pct - a.m.pct); return `<div class="day ${d.getMonth() !== mm - 1 ? "out" : ""} ${k === todayISO() ? "today" : ""}"><span class="d">${d.getDate()}</span>${es.map((e) => `<div class="pill ${e.destacado ? "hot" : e.m.pct >= 62 ? "hi" : ""}" data-rel="${esc(e.fecha + "|" + e.titulo)}" data-tip="${esc(e.titulo)} · ${e.m.pct}%">${esc(e.titulo)}</div>`).join("")}</div>`; }).join("")}</div>`;
    $("#cPrev").onclick = () => shift(-1);
    $("#cNext").onclick = () => shift(1);
  } else {
    const groups = [];
    for (const e of L) {
      const d = new Date(e.fecha + "T12:00:00");
      const soon = e.fecha <= addDays(todayISO(), 70);
      const key = soon ? e.fecha : e.fecha.slice(0, 7);
      const label = soon ? `${diaSemana(e.fecha)} ${fechaLarga(e.fecha)}` : `${MESES[d.getMonth()]} ${d.getFullYear()}`;
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, label, soon, items: [] }));
      g.items.push(e);
    }
    body.innerHTML = groups.length ? groups.map((g) => `<div class="week"><div class="week-h"><h2 class="h2">${g.label.charAt(0).toUpperCase() + g.label.slice(1)}</h2><span class="dim">${g.items.length} ${g.items.length === 1 ? "estreno" : "estrenos"}${g.soon && g.key < todayISO() ? " · ya en cines" : ""}</span></div>
      <div class="rels">${g.items.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || b.m.pct - a.m.pct).map(relCard).join("")}</div></div>`).join("")
      : `<div class="empty"><div class="h2">Sin estrenos con ese filtro</div></div>`;
  }
  $$("#estMode button", v).forEach((b) => (b.onclick = () => { st.mode = b.dataset.m; render._keep = true; VIEWS.estrenos(v); }));
  $$("#estF button", v).forEach((b) => (b.onclick = () => { st.filter = b.dataset.f; render._keep = true; VIEWS.estrenos(v); }));
  const up = $("#estUpd");
  if (up) up.onclick = async () => {
    up.disabled = true; up.innerHTML = `${icon("refresh")}Actualizando…`;
    try { const r = await api("estrenos/actualizar", { method: "POST" }); S.est = await api("estrenos"); toast(`${r.estrenos} estrenos actualizados`); VIEWS.estrenos(v); }
    catch (e) { toast(e.message, "x"); up.disabled = false; }
  };
};

// ---------------------------------------------------------------- Pendientes
VIEWS.pendientes = (v) => {
  const W = [...S.db.pendientes].sort((a, b) => String(b.añadido || "").localeCompare(String(a.añadido || "")));
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Pendientes</h1><p>Lo que quieres ver. Cuando la veas, pulsa <b>La he visto</b> y pasa directamente a tu colección con su nota.</p></div></div>
  <div class="card card-pad rw" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px">
    <input class="input" id="wT" placeholder="Título" style="flex:2 1 220px"><input class="input" id="wY" placeholder="Año" type="number" style="flex:0 1 110px"><input class="input" id="wM" placeholder="¿Por qué? (quién te la recomendó…)" style="flex:2 1 220px">
    <button class="btn btn-primary" id="wAdd">${icon("plus")}Añadir</button></div>
  ${W.length ? `<div class="wl">${W.map((w) => `<div class="card"><div style="min-width:0"><div class="t">${esc(w.titulo)} <span class="dim">${w.anio || ""}</span></div><div class="s">${esc(w.motivo || "")}</div></div>
    <div style="display:flex;gap:6px"><button class="btn btn-sm" data-wseen="${w.id}">${icon("eye")}La he visto</button><button class="icon-btn" data-wdel="${w.id}" title="Quitar">${icon("x")}</button></div></div>`).join("")}</div>`
    : `<div class="empty"><div class="h2">No tienes pendientes</div>Añade desde <a href="#/recomendaciones" style="color:var(--gold)">Para ti</a> o <a href="#/estrenos" style="color:var(--gold)">Estrenos</a>.</div>`}`;
  $("#wAdd").onclick = async () => {
    const t = $("#wT").value.trim();
    if (!t) return $("#wT").focus();
    await api("pendientes", { method: "POST", body: { titulo: t, anio: +$("#wY").value || null, motivo: $("#wM").value.trim() } });
    await refreshDB(); toast("Añadida a pendientes"); VIEWS.pendientes(v);
  };
};
async function addPending(item, motivo) {
  await api("pendientes", { method: "POST", body: { titulo: item.titulo, anio: item.anio || null, motivo, tituloOriginal: item.tituloOriginal || item.original || null } });
  await refreshDB();
  toast(`«${item.titulo}» a pendientes`, "bookmark");
}

// ---------------------------------------------------------------- Series
VIEWS.series = (v) => {
  const st = S.series;
  const L = S.db.series.filter((s) => !st.tipo || s.tipo === st.tipo).sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));
  const tipos = [...new Set(S.db.series.map((s) => s.tipo))];
  const rated = S.db.series.filter((s) => s.nota != null);
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Series y documentales</h1><p>${S.db.series.length} títulos · media ${fmt2(mean(rated.map((s) => s.nota)))}${S.db.series.length - rated.length ? ` · ${S.db.series.length - rated.length} sin nota todavía` : ""}</p></div>
    <button class="btn btn-primary" id="sAdd">${icon("plus")}Añadir serie</button></div>
  ${seriesStatsHTML()}
  <div class="toolbar" style="position:static;margin-top:26px"><div class="seg" id="sT"><button data-t="" class="${!st.tipo ? "on" : ""}">Todas</button>${tipos.map((t) => `<button data-t="${esc(t)}" class="${st.tipo === t ? "on" : ""}">${esc(t)}s</button>`).join("")}</div></div>
  <div class="posters">${L.map((s) => `<div class="pcard" data-serie="${s.id}"><div class="frame">${posterHTML({ ...s, anio: s.anios, generos: [s.animacion ? "Animación" : s.tipo === "Documental" ? "Documental" : "Drama"] })}${scoreBadge(s.nota)}</div>
    <div class="meta"><div class="t">${esc(s.titulo)}</div><div class="s">${esc([s.anios, s.pais].filter(Boolean).join(" · "))}</div></div></div>`).join("")}</div>`;
  $$("#sT button", v).forEach((b) => (b.onclick = () => { st.tipo = b.dataset.t; VIEWS.series(v); }));
  $("#sAdd").onclick = () => openSerieForm();
};
const serieGen = (x) => [x.animacion ? "Animación" : x.tipo === "Documental" ? "Documental" : "Drama"];
function seriesLinks(s) {
  const ids = s.ids || {};
  const q = encodeURIComponent(s.titulo);
  return [
    { n: "FilmAffinity", c: "#1d4d8c", l: "FA", u: ids.filmaffinity ? `https://www.filmaffinity.com/es/film${ids.filmaffinity}.html` : `https://www.filmaffinity.com/es/search.php?stext=${q}` },
    { n: "IMDb", c: "#c9a200", l: "IMDb", u: ids.imdb ? `https://www.imdb.com/es-es/title/${ids.imdb}/` : `https://www.imdb.com/es-es/find/?q=${q}` },
    { n: "SensaCine", c: "#e30613", l: "SC", u: ids.allocineSerie ? `https://www.sensacine.com/series/serie-${ids.allocineSerie}/` : `https://www.sensacine.com/buscar/?q=${q}` },
    { n: "Rotten Tomatoes", c: "#d8321f", l: "RT", u: `https://www.rottentomatoes.com/search?search=${q}` },
    { n: "JustWatch", c: "#e7b32a", l: "JW", u: `https://www.justwatch.com/es/buscar?q=${q}` },
  ];
}
function openSerie(id) {
  const s = S.db.series.find((x) => x.id === id);
  if (!s) return;
  const rated = S.db.series.filter((x) => x.nota != null).sort((a, b) => b.nota - a.nota);
  const rank = rated.findIndex((x) => x.id === s.id) + 1;
  const parecidas = S.db.series.filter((x) => x.id !== s.id && x.tipo === s.tipo && !!x.animacion === !!s.animacion && x.nota != null).sort((a, b) => b.nota - a.nota).slice(0, 8);
  const card = (x) => `<div class="pcard" data-serie="${x.id}"><div class="frame">${posterHTML({ ...x, anio: x.anios, generos: serieGen(x) })}${scoreBadge(x.nota)}</div><div class="meta"><div class="t">${esc(x.titulo)}</div><div class="s">${esc(x.anios || "")}</div></div></div>`;
  modal(`
    ${s.poster ? `<div class="detail-backdrop"><img src="${esc(s.poster)}" alt="" referrerpolicy="no-referrer"></div>` : ""}
    <div class="sheet-body"><div class="detail">
      <div><div class="poster">${posterHTML({ ...s, anio: s.anios, generos: serieGen(s) })}</div></div>
      <div>
        <div class="eyebrow">${esc(s.tipo || "Serie")}${s.animacion ? " · Animación" : ""}</div>
        <h2 style="margin-top:8px">${esc(s.titulo)}</h2>
        <div class="facts">${s.anios ? `<span>${icon("calendar")}${esc(s.anios)}</span>` : ""}${s.pais ? `<span>${icon("globe")}${esc(s.pais)}</span>` : ""}</div>
        <div class="myscore">${scoreBadge(s.nota, "lg")}<div><div class="lbl">Tu nota</div><div class="verdict">${veredicto(s.nota)}</div>
          ${rank ? `<div class="dim" style="font-size:12.5px">Puesto ${rank} de ${rated.length} entre tus series</div>` : ""}</div></div>
        ${s.resena ? `<blockquote class="review">${esc(s.resena)}</blockquote>` : ""}
        <div class="sub">Ver en</div>
        <div class="links">${seriesLinks(s).map((l) => `<a class="ext" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="logo" style="background:${l.c}">${l.l}</span>${l.n}</a>`).join("")}</div>
        <div class="dl-actions"><button class="btn" data-sedit="${s.id}">${icon("edit")}Editar</button><button class="btn btn-ghost btn-danger" data-sdel="${s.id}">${icon("trash")}Eliminar</button></div>
      </div></div>
      ${parecidas.length ? `<div class="sub" style="margin-top:34px">Otras ${esc((s.tipo || "serie").toLowerCase())}s${s.animacion ? " de animación" : ""} que te gustaron</div><div class="strip">${parecidas.map(card).join("")}</div>` : ""}
    </div>`);
}
function seriesAgg(key) {
  const m = new Map();
  for (const s of S.db.series) {
    if (s.nota == null) continue;
    const k = key(s);
    if (!k) continue;
    const o = m.get(k) || { key: k, n: 0, sum: 0, items: [] };
    o.n++; o.sum += s.nota; o.items.push(s); m.set(k, o);
  }
  for (const o of m.values()) o.mean = o.sum / o.n;
  return [...m.values()];
}
function seriesInsights() {
  const R = S.db.series.filter((s) => s.nota != null);
  if (R.length < 10) return [];
  const mu = mean(R.map((s) => s.nota));
  const out = [];
  const tipos = seriesAgg((s) => s.tipo).filter((t) => t.n >= 5).sort((a, b) => b.mean - a.mean);
  if (tipos.length > 1) out.push({ big: fmt1(tipos[0].mean), ttl: `Lo tuyo son las ${tipos[0].key.toLowerCase()}s`, txt: `Les das un ${fmt1(tipos[0].mean)} de media (${tipos[0].n} vistas), frente al ${fmt1(tipos[tipos.length - 1].mean)} de los ${tipos[tipos.length - 1].key.toLowerCase()}s.` });
  const anime = R.filter((s) => s.animacion && s.pais === "Japón"), anim = R.filter((s) => s.animacion && s.pais !== "Japón");
  if (anime.length >= 5 && anim.length >= 5) out.push({ big: fmt1(mean(anime.map((s) => s.nota))), ttl: "El anime gana a los dibujos occidentales", txt: `Al anime le das ${fmt1(mean(anime.map((s) => s.nota)))} y a la animación occidental ${fmt1(mean(anim.map((s) => s.nota)))}. Tus favoritas: ${[...anime].sort((a, b) => b.nota - a.nota).slice(0, 2).map((s) => s.titulo).join(" y ")}.` });
  const esp = R.filter((s) => s.pais === "España" && s.tipo === "Documental");
  if (esp.length >= 5) out.push({ big: esp.length, ttl: "Fan del documental español", txt: `Has visto ${esp.length} documentales españoles con una media de ${fmt1(mean(esp.map((s) => s.nota)))}. El que más te gustó: ${[...esp].sort((a, b) => b.nota - a.nota)[0].titulo}.` });
  const top = [...R].sort((a, b) => b.nota - a.nota).slice(0, 3);
  out.push({ big: fmt1(mu), ttl: "Tu podio de series", txt: `${top.map((s) => `${s.titulo} (${fmt1(s.nota)})`).join(", ")}. Nota media en series: ${fmt2(mu)}.` });
  return out;
}
function seriesStatsHTML() {
  const R = S.db.series.filter((s) => s.nota != null);
  if (R.length < 5) return "";
  const tipos = seriesAgg((s) => s.tipo).sort((a, b) => b.n - a.n);
  const paises = seriesAgg((s) => s.pais).sort((a, b) => b.n - a.n).slice(0, 6);
  const formato = seriesAgg((s) => (s.animacion ? "Animación" : "Imagen real"));
  const row = (g) => ({ label: g.key, value: g.n, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}` });
  return `<div class="charts">
    <div class="card chart w4"><h3>Por formato</h3><div class="cap">Número de títulos y tu nota media</div>${hbars(tipos.map(row))}<div style="height:10px"></div>${hbars(formato.map(row))}</div>
    <div class="card chart w4"><h3>Por país</h3><div class="cap">Los 6 países con más series</div>${hbars(paises.map(row))}</div>
    <div class="card chart w4"><h3>Lo que dicen tus notas</h3><div class="cap">Tus gustos en series</div>
      ${seriesInsights().slice(0, 3).map((i) => `<p style="margin:0 0 12px;font-size:13.5px"><b style="color:var(--gold)">${esc(i.ttl)}.</b> <span class="muted">${esc(i.txt)}</span></p>`).join("")}</div>
  </div>`;
}

function openSerieForm(s = null) {
  const d = s || { titulo: "", anios: "", tipo: "Serie", pais: "", animacion: false, nota: 7, resena: "" };
  modal(`<div class="sheet-body"><div class="eyebrow">${s ? "Editar serie" : "Nueva serie"}</div><h2 class="h2" style="margin:6px 0 20px">${s ? esc(s.titulo) : "Añadir serie"}</h2>
    <div class="form">
      <div class="field full"><label>Título</label><input class="input" name="titulo" value="${esc(d.titulo)}"></div>
      <div class="field s2"><label>Años</label><input class="input" name="anios" value="${esc(d.anios || "")}" placeholder="2019–2023"></div>
      <div class="field s2"><label>Tipo</label><select class="select" name="tipo">${["Serie", "Miniserie", "Documental"].map((t) => `<option ${d.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field s2"><label>País</label><input class="input" name="pais" value="${esc(d.pais || "")}"></div>
      <div class="field full"><label>Tu nota</label><div class="rating-input">${scoreBadge(d.nota ?? 7, "lg")}<input type="range" min="0" max="10" step="0.1" value="${d.nota ?? 7}" id="snota"><span class="words" id="swords">${veredicto(d.nota ?? 7)}</span></div></div>
      <div class="field full"><label>Reseña</label><textarea class="textarea" name="resena">${esc(d.resena || "")}</textarea></div>
      <div class="field full"><label class="toggle"><input type="checkbox" name="animacion" ${d.animacion ? "checked" : ""}><span class="sw"></span>Animación</label></div>
    </div>
    <div class="form-foot">${s ? `<button class="btn btn-ghost btn-danger" data-sdel="${s.id}" style="margin-right:auto">${icon("trash")}Eliminar</button>` : ""}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ssave">${icon("check")}Guardar</button></div></div>`, "narrow");
  const sh = $("#modal .sheet");
  const r = $("#snota");
  r.oninput = () => { $(".rating-input .score", sh).outerHTML = scoreBadge(+r.value, "lg"); $("#swords").textContent = veredicto(+r.value); };
  $("#ssave").onclick = async () => {
    const g = (n) => $(`[name="${n}"]`, sh);
    const data = { titulo: g("titulo").value.trim(), anios: g("anios").value.trim(), tipo: g("tipo").value, pais: g("pais").value.trim(), nota: Math.round(+r.value * 10) / 10, resena: g("resena").value.trim(), animacion: g("animacion").checked };
    if (!data.titulo) return g("titulo").focus();
    let guardada = s;
    if (s) await api(`series/${s.id}`, { method: "PUT", body: data });
    else guardada = await api("series", { method: "POST", body: data });
    await refreshDB(); closeModal(); toast("Serie guardada"); render();
    completarSerie({ ...guardada, ...data });
  };
}

// ---------------------------------------------------------------- Ajustes
VIEWS.ajustes = (v) => {
  const e = S.db.estado || {};
  const corr = S.db.correcciones || [];
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Ajustes</h1></div></div>
  <div class="settings">
    <div class="card"><h3>${icon("download")} Tu Excel</h3><p>Cada cambio que haces aquí regenera <code>Filora.xlsx</code> en la carpeta de la app, con hojas de resumen, películas, series, UCM, pendientes y estrenos.</p>
      ${e.excel_error ? `<p style="color:var(--gold)">⚠ ${esc(e.excel_error)}</p>` : ""}
      <div class="acts"><a class="btn btn-primary" href="/api/excel">${icon("download")}Descargar Excel</a><button class="btn" id="xRegen">${icon("refresh")}Regenerar</button></div></div>
    <div class="card"><h3>${icon("globe")} Sincronizar con la web</h3><p>Escribe la dirección de tu web y el mismo <b>PIN</b> que configuraste en Vercel. Tu PC y la web se sincronizarán solos (al arrancar, tras cada cambio y cada 5 minutos), así lo que añadas desde el móvil llega a tu Excel.</p>
      <p class="dim" style="font-size:12.5px">Estado: ${e.pin ? esc(e.sync || "pendiente") : "sin PIN"}${e.sync_at ? ` · última vez ${new Date(e.sync_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
      <div class="acts" style="margin-bottom:8px"><input class="input" id="webLocal" type="url" placeholder="Dirección de tu web (por defecto https://filora-umber.vercel.app)" value="${esc((S.db.config || {}).web || "")}" style="flex:1"><button class="btn" id="webSave">Guardar</button></div>
      <div class="acts"><input class="input" id="pinLocal" type="password" inputmode="numeric" placeholder="${e.pin ? "PIN guardado ✓ (escribe para cambiarlo)" : "PIN de edición"}" style="flex:1"><button class="btn" id="pinSave">Guardar</button><button class="btn btn-ghost" id="syncNow">${icon("refresh")}Sincronizar ahora</button></div></div>
    <div class="card"><h3>${icon("upload")} Añadir desde el Excel</h3><p>Abre <code>Filora.xlsx</code>, escribe tus películas en la hoja <b>Añadir</b> (Año, Duración, Nota, Título, Director, País…), guarda y cierra: la app las importa sola en unos segundos y completa lo que falte. También detecta cambios de nota o reseña en la hoja <b>Películas</b>.</p>
      ${e.excel_import ? `<p class="dim" style="font-size:12.5px">Última importación: ${esc(e.excel_import)}</p>` : ""}
      <div class="acts"><button class="btn" id="xImp">${icon("upload")}Importar ahora</button></div></div>
    <div class="card"><h3>${icon("calendar")} Estrenos automáticos (opcional)</h3><p>Con una clave gratuita de <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style="color:var(--gold)">TMDb</a> el calendario se actualiza solo con las fechas de España, sinopsis y carteles. Sin clave, lo mantenemos juntos a mano.</p>
      <div class="acts"><input class="input" id="tmdbKey" type="password" placeholder="${e.tmdb ? "Clave guardada ✓ (escribe para cambiarla)" : "Clave API v3 de TMDb"}" style="flex:1"><button class="btn" id="tmdbSave">Guardar</button></div></div>
    <div class="card"><h3>${icon("layers")} Copia de seguridad</h3><p>La app guarda una copia automática en <code>data/local/backups</code> antes de cada cambio (las 30 últimas). También puedes descargar la base de datos completa.</p>
      <div class="acts"><a class="btn" href="/api/backup">${icon("download")}Descargar copia (.json)</a></div></div>
    ${corr.length ? `<div class="card" style="grid-column:1/-1"><h3>${icon("check")} Correcciones aplicadas al importar tu Excel original</h3><p>Revisé tu Excel y arreglé estos errores (tu archivo original no se ha tocado):</p>
      <ul style="margin:0;padding-left:18px;color:var(--text-2);columns:2;column-gap:40px;font-size:13px">${corr.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
  </div>`;
  $("#xRegen").onclick = async () => { const r = await api("excel/regenerar", { method: "POST" }); await refreshDB(); toast(r.ok ? "Excel regenerado" : r.excel_error, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#xImp").onclick = async () => { try { const r = await api("excel/importar", { method: "POST" }); await refreshDB(); toast(`${r.modificadas} modificadas · ${r.nuevas} nuevas`); } catch (err) { toast(err.message, "x"); } };
  $("#pinSave").onclick = async () => { const k = $("#pinLocal").value.trim(); if (k.length < 4) return toast("El PIN debe tener al menos 4 caracteres", "x"); await api("config", { method: "POST", body: { pin: k } }); const r = await api("sync", { method: "POST" }); await refreshDB(); toast(r.ok ? "PIN guardado · sincronizado con la web" : r.sync, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#webSave").onclick = async () => { const w = $("#webLocal").value.trim(); await api("config", { method: "POST", body: { web: w || null } }); await refreshDB(); toast("Dirección guardada"); VIEWS.ajustes(v); };
  $("#syncNow").onclick = async () => { const r = await api("sync", { method: "POST" }); await loadAll(); toast(r.ok ? "Sincronizado con la web" : r.sync, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#tmdbSave").onclick = async () => { const k = $("#tmdbKey").value.trim(); if (!k) return; await api("config", { method: "POST", body: { tmdbKey: k } }); await refreshDB(); toast("Clave guardada"); VIEWS.ajustes(v); };
};

// ---------------------------------------------------------------- Tus cines (cada persona elige los suyos)
// Con cuenta se guardan en tu cuenta; sin cuenta, en este dispositivo. No hay cines por defecto.
const CINES_KEY = "filora.cines";
function misCines() {
  const p = S.db && S.db.preferencias && S.db.preferencias.cines;
  if (Array.isArray(p) && !ro()) return p;
  try { return JSON.parse(localStorage.getItem(CINES_KEY) || "[]"); } catch (e) { return []; }
}
const idCine = (c) => String(c.fa ?? c.id);
function filtrarCartelera() {
  const ids = new Set(misCines().map((c) => String(c.id)));
  const todos = (S.cartTodo && S.cartTodo.cines) || [];
  S.cart = { ...(S.cartTodo || {}), cines: todos.filter((c) => ids.has(idCine(c))) };
  S.cartIdx = null;
}
const cinesSinSesiones = () => misCines().filter((c) => !S.cart.cines.some((x) => idCine(x) === String(c.id)));
// Avisa a la web de qué cines quieres (una vez al día) para que el robot descargue sus sesiones.
async function avisarDemanda(forzar) {
  if (!STATIC) return;
  const ids = misCines().map((c) => c.id);
  if (!ids.length) return;
  try { if (!forzar && localStorage.getItem("filora.demanda") === todayISO()) return; localStorage.setItem("filora.demanda", todayISO()); } catch (e) { /* */ }
  try {
    const r = await fetch("/api/demanda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cines: ids }) });
    const j = await r.json();
    if (j.descargando) S.descargandoHasta = Date.now() + 12 * 60e3;
    if (cinesSinSesiones().length) esperarSesiones();
  } catch (e) { /* sin conexión: ya lo recogerá el robot en su turno */ }
}
// Mientras llegan las sesiones de un cine nuevo, vuelve a mirar cada minuto (hasta 12 minutos).
function esperarSesiones() {
  clearInterval(esperarSesiones._t);
  let intentos = 0;
  esperarSesiones._t = setInterval(async () => {
    if (++intentos > 12 || !cinesSinSesiones().length) return clearInterval(esperarSesiones._t);
    try {
      const antes = cinesSinSesiones().length;
      S.cartTodo = await api("cartelera");
      filtrarCartelera();
      if (cinesSinSesiones().length < antes) {
        toast("Ya están las sesiones de tus cines", "ticket");
        if (["inicio", "cartelera"].includes(route().name) && $("#modal").hidden) { render._keep = true; render(); }
      }
    } catch (e) { /* se reintenta */ }
  }, 60e3);
}
async function guardarCines(lista) {
  const limpia = lista.map(({ id, nombre, ciudad, provincia, direccion }) => ({ id, nombre, ciudad, provincia, direccion }));
  if (ro()) { try { localStorage.setItem(CINES_KEY, JSON.stringify(limpia)); } catch (e) { /* */ } }
  else S.db.preferencias = await api("preferencias", { method: "PUT", body: { cines: limpia } });
  filtrarCartelera(); await avisarDemanda(true);
}
const kmEntre = ([a, b], [c, d]) => {
  const r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
async function openCines() {
  if (!S.cinesCat) {
    try { S.cinesCat = (await api("cines")).cines || []; } catch (e) { return toast("No se ha podido cargar la lista de cines", "x"); }
  }
  let sel = misCines().slice(), pos = null, q = "";
  modal(`<div class="sheet-body cines-f"><div class="eyebrow">Cartelera</div><h2 class="h2" style="margin:6px 0 8px">Tus cines</h2>
    <p class="muted" style="margin:0 0 16px">Elige los cines a los que sueles ir y verás sus sesiones. ${ro() ? "Se guardan en este dispositivo." : "Se guardan en tu cuenta."}</p>
    <div class="cines-busca"><button class="btn" id="cGeo" type="button">${icon("pin")}Cerca de mí</button><input class="input" id="cQ" placeholder="Tu ciudad, provincia o cine" autocomplete="off" enterkeyhint="search"></div>
    <div id="cSel" class="chips" style="margin:14px 0 4px"></div>
    <div id="cMsg" class="dim" style="min-height:20px;font-size:13px;margin-top:6px"></div>
    <ul id="cList" class="cines-list"></ul>
    <button class="btn btn-primary" id="cOk" style="width:100%;justify-content:center;margin-top:14px">${icon("check")}Guardar mis cines</button></div>`, "narrow");
  const msg = (m) => ($("#cMsg").textContent = m);
  const pinta = () => {
    $("#cSel").innerHTML = sel.length ? sel.map((c) => `<button type="button" class="chip on" data-quita="${c.id}" aria-label="Quitar ${esc(c.nombre)}">${esc(c.nombre)} ×</button>`).join("")
      : `<span class="dim" style="font-size:13px">Aún no has elegido ningún cine</span>`;
    const n = norm(q);
    let L = S.cinesCat;
    if (n) L = L.filter((c) => norm(`${c.nombre} ${c.ciudad} ${c.provincia}`).includes(n));
    if (pos) L = L.filter((c) => c.geo).map((c) => ({ ...c, d: kmEntre(pos, c.geo) })).sort((a, b) => a.d - b.d);
    else if (!n) L = [];
    const ids = new Set(sel.map((c) => c.id));
    $("#cList").innerHTML = L.slice(0, 40).map((c) => `<li><label><input type="checkbox" data-cid="${c.id}" ${ids.has(c.id) ? "checked" : ""}>
      <span><b>${esc(c.nombre)}</b><span class="dim">${esc(c.ciudad)}${c.provincia && c.ciudad !== c.provincia ? ` · ${esc(c.provincia)}` : ""}${c.d != null ? ` · ${c.d < 1 ? "menos de 1" : Math.round(c.d)} km` : ""}</span></span></label></li>`).join("")
      || (n ? `<li class="dim" style="padding:12px 0">No encuentro cines con «${esc(q)}»</li>` : "");
  };
  pinta();
  setTimeout(() => $("#cQ").focus(), 60);
  $("#cQ").oninput = (ev) => { q = ev.target.value; if (q) pos = null; msg(""); pinta(); };
  $("#cGeo").onclick = () => {
    if (!navigator.geolocation) return msg("Este navegador no permite usar tu ubicación. Escribe tu ciudad.");
    msg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => { pos = [p.coords.latitude, p.coords.longitude]; q = ""; $("#cQ").value = ""; msg("Cines ordenados por distancia (tu ubicación no se guarda)"); pinta(); },
      () => msg("No se ha podido usar tu ubicación. Escribe tu ciudad en el buscador."),
      { timeout: 12000, maximumAge: 600000 });
  };
  $("#cList").onchange = (ev) => {
    const id = +ev.target.dataset.cid;
    if (!id) return;
    if (ev.target.checked) {
      if (sel.length >= 12) { ev.target.checked = false; return msg("Puedes elegir hasta 12 cines."); }
      sel.push(S.cinesCat.find((c) => c.id === id));
    } else sel = sel.filter((c) => c.id !== id);
    pinta();
  };
  $("#cSel").onclick = (ev) => { const b = ev.target.closest("[data-quita]"); if (b) { sel = sel.filter((c) => String(c.id) !== b.dataset.quita); pinta(); } };
  $("#cOk").onclick = async () => {
    try {
      await guardarCines(sel);
      closeModal(); render._keep = true; render();
      const nuevos = cinesSinSesiones().length;
      toast(!sel.length ? "Has quitado tus cines" : !nuevos ? "Tus cines están guardados" : S.descargandoHasta > Date.now() ? "Guardado. Descargando sus sesiones: tardan unos minutos" : "Guardado. Sus sesiones llegarán en la próxima actualización (cada 3 horas)", "check");
    } catch (e) { toast(e.message, "x"); }
  };
}
function elegirCinesHTML(titulo = "¿A qué cines vas?") {
  return `<div class="card elige-cines"><div><div class="h2" style="margin:0 0 6px">${titulo}</div>
    <p class="muted" style="margin:0">Usa tu ubicación o escribe tu ciudad y elige tus cines para ver sus sesiones de hoy, ordenadas por lo que encajan contigo.</p></div>
    <button class="btn btn-primary" data-cines>${icon("pin")}Elegir mis cines</button></div>`;
}

// ---------------------------------------------------------------- Cartelera (sesiones reales de tus cines)
S.cart_ = { dia: null, cine: "" };
const hhmm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
function carteleraIdx() {
  if (S.cartIdx) return S.cartIdx;
  const idx = new Map();
  for (const c of (S.cart && S.cart.cines) || []) for (const p of c.peliculas || []) {
    const k = p.fa || norm(p.titulo);
    const o = idx.get(k) || { ...p, cines: [] };
    o.cines.push({ id: c.id, nombre: c.nombre, versiones: p.versiones });
    idx.set(k, o);
  }
  return (S.cartIdx = idx);
}
function sesionesDe(titulo, fa) {
  const idx = carteleraIdx();
  if (fa && idx.has(fa)) return idx.get(fa);
  const n = norm(titulo);
  return [...idx.values()].find((p) => norm(p.titulo) === n) || null;
}
function infoCartelera(p) {
  const e = (S.est.estrenos || []).find((x) => (p.fa && x.fa === p.fa) || norm(x.titulo) === norm(p.titulo));
  const generos = (e && e.generos) || [];
  const vista = S.db.peliculas.find((x) => (norm(x.titulo) === norm(p.titulo) || norm(x.tituloOriginal) === norm(p.titulo)) && (!p.anio || !x.anio || Math.abs(x.anio - p.anio) <= 1));
  const m = predict({ titulo: p.titulo, director: p.director, pais: p.pais, anio: p.anio, generos, saga: e && e.saga });
  return { generos, vista, m, estreno: e };
}
const versionCorta = (v) => { const t = (v.match(/\(([^)]+)\)/g) || []).map((x) => x.slice(1, -1)).filter((x) => !/^digital$/i.test(x)); return t.length ? t.join(" · ") : "Castellano"; };
function sesionesHTML(p, dia, maxDias = 1, cineId = "") {
  const hoy = todayISO(), ahora = hhmm();
  return (p.cines || []).filter((c) => !cineId || c.id === cineId).map((c) => {
    const bloques = c.versiones.map((v) => {
      const dias = Object.keys(v.dias).sort().filter((d) => (dia ? d === dia : d >= hoy)).slice(0, maxDias);
      return dias.map((d) => `<div class="ses-row"><span class="ses-v">${esc(versionCorta(v.nombre))}${!dia ? ` · <span class="dim">${d === hoy ? "hoy" : `${diaSemana(d).slice(0, 3)} ${+d.slice(8)}`}</span>` : ""}</span>
        <span class="ses-times">${v.dias[d].map((x) => { const pasada = d === hoy && x.hora < ahora; return `<a class="time ${pasada ? "past" : ""}" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.sala || "Comprar entradas")}">${x.hora}</a>`; }).join("")}</span></div>`).join("");
    }).join("");
    return bloques ? `<div class="ses-cine"><div class="ses-name">${icon("pin")}${esc(c.nombre.replace("Premium ", ""))}</div>${bloques}</div>` : "";
  }).join("");
}
function diasCartelera() {
  const hoy = todayISO(), lim = addDays(hoy, 8), set = new Set();
  for (const p of carteleraIdx().values()) for (const c of p.cines) for (const v of c.versiones) for (const d of Object.keys(v.dias)) if (d >= hoy && d <= lim) set.add(d);
  return [...set].sort();
}
function enCartelera(dia, cineId = "") {
  const out = [];
  for (const p of carteleraIdx().values()) {
    if (p.cines.some((c) => (!cineId || c.id === cineId) && c.versiones.some((v) => v.dias[dia]))) out.push({ ...p, info: infoCartelera(p) });
  }
  return out.sort((a, b) => (a.info.vista ? 1 : 0) - (b.info.vista ? 1 : 0) || b.info.m.pct - a.info.m.pct);
}
function carteleraCard(p, dia, cineId) {
  const i = p.info;
  const g = i.generos.length ? i.generos : ["Drama"];
  return `<div class="card cfilm">
    <div class="frame" ${i.estreno ? `data-rel="${esc(i.estreno.fecha + "|" + i.estreno.titulo)}"` : ""}>${posterHTML({ titulo: p.titulo, anio: p.anio, poster: p.poster, generos: g })}</div>
    <div style="min-width:0">
      <div class="cfilm-head">
        <div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="s">${esc([p.director, p.pais].filter(Boolean).join(" · ") || "—")}</div></div>
        ${i.vista ? `<span class="chip on" title="Ya la tienes en tu colección">${icon("check")}Vista · ${fmt1(i.vista.nota)}</span>` : matchTag(i.m.pct)}
      </div>
      ${i.generos.length ? `<div class="chips" style="margin:8px 0 2px">${i.generos.slice(0, 3).map((x) => `<span class="chip">${x}</span>`).join("")}</div>` : ""}
      ${sesionesHTML(p, dia, 1, cineId)}
    </div></div>`;
}
function hoyHTML() {
  if (!misCines().length) return `<section class="section">${sectionHead("Hoy en tus cines")}${elegirCinesHTML()}</section>`;
  const dias = diasCartelera();
  if (!dias.length) return "";
  const L = enCartelera(dias[0]).filter((p) => !p.info.vista).slice(0, 4);
  if (!L.length) return "";
  const titulo = dias[0] === todayISO() ? "Hoy en tus cines" : `${diaSemana(dias[0])} en tus cines`;
  return `<section class="section">${sectionHead(titulo, "#/cartelera", "Todas las sesiones")}
    <div class="cfilms cartel-fija">${L.map((p) => carteleraCard(p, dias[0], "")).join("")}</div></section>`;
}
VIEWS.cartelera = (v) => {
  const st = S.cart_;
  const dias = diasCartelera();
  if (!st.dia || !dias.includes(st.dia)) st.dia = dias[0];
  const cines = ((S.cart && S.cart.cines) || []).filter((c) => (c.peliculas || []).length);
  const act = S.cart && S.cart.actualizado ? new Date(S.cart.actualizado) : null;
  const viejo = act && Date.now() - act.getTime() > 2.5 * 864e5;
  const L = st.dia ? enCartelera(st.dia, st.cine) : [];
  const hoy = todayISO();
  const etiqueta = (d) => (d === hoy ? "Hoy" : d === addDays(hoy, 1) ? "Mañana" : `${diaSemana(d).slice(0, 3)} ${+d.slice(8)}`);
  const lim = addDays(hoy, 8);
  const preventa = [...carteleraIdx().values()]
    .map((p) => ({ p, first: p.cines.flatMap((c) => c.versiones.flatMap((x) => Object.keys(x.dias))).sort()[0] }))
    .filter((x) => x.first > lim).sort((a, b) => a.first.localeCompare(b.first));
  const cineCorto = (n) => n.replace("Premium ", "").replace("Yelmo Cines ", "Yelmo ");
  const mis = misCines();
  const pendientes = cinesSinSesiones();
  const ciudades = [...new Set(mis.map((c) => c.ciudad).filter(Boolean))];
  if (!mis.length) {
    v.innerHTML = `<div class="page-head"><div><h1 class="h1">Cartelera</h1><p>Sesiones reales de los cines que elijas, con enlace para comprar la entrada.</p></div></div>${elegirCinesHTML("Elige tus cines")}`;
    return;
  }
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">${esc(ciudades.join(" · "))} · ${esc(mis.map((c) => cineCorto(c.nombre)).join(", "))}</div><h1 class="h1">Cartelera</h1>
    <p>Sesiones reales de tus cines. Pulsa una hora para comprar la entrada.${act ? ` <span class="dim">Actualizado el ${act.toLocaleDateString("es-ES", { day: "numeric", month: "long" })} a las ${act.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} · fuente FilmAffinity.</span>` : ""}</p>
    ${viejo ? `<p style="color:var(--gold)">⚠ Estos horarios tienen más de dos días; pueden haber cambiado.</p>` : ""}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-cines>${icon("pin")}Cambiar cines</button>${!STATIC ? `<button class="btn" id="cartUpd">${icon("refresh")}Actualizar ahora</button>` : ""}</div></div>
  ${pendientes.length ? `<div class="card aviso-cines">${icon("clock")}<span>${S.descargandoHasta > Date.now()
    ? `Descargando las sesiones de <b>${esc(pendientes.map((c) => c.nombre).join(", "))}</b>. Suelen tardar unos minutos; esta página se actualizará sola.`
    : `Las sesiones de <b>${esc(pendientes.map((c) => c.nombre).join(", "))}</b> llegarán en la próxima actualización (cada 3 horas, de 7:00 a 22:00).`}</span></div>` : ""}
  ${dias.length ? `
  <div class="toolbar" style="position:static">
    <div class="chips">${dias.map((d) => `<button class="chip ${d === st.dia ? "on" : ""}" data-cday="${d}">${etiqueta(d)}</button>`).join("")}</div>
    <div class="seg"><button data-ccine="" class="${!st.cine ? "on" : ""}">Todos</button>${cines.map((c) => `<button data-ccine="${c.id}" class="${st.cine === c.id ? "on" : ""}">${esc(cineCorto(c.nombre))}</button>`).join("")}</div>
  </div>
  <div class="result-line"><b>${L.length}</b> películas ${st.dia === hoy ? "hoy" : `el ${etiqueta(st.dia).toLowerCase()}`} · ordenadas por lo que encajan contigo</div>
  <div class="cfilms cartel-fija">${L.map((p) => carteleraCard(p, st.dia, st.cine)).join("")}</div>`
  : pendientes.length === mis.length ? "" : `<div class="empty"><div class="h2">Sin sesiones cargadas</div>${STATIC ? "Vuelve a intentarlo más tarde." : "Pulsa «Actualizar ahora» para descargarlas."}</div>`}
  ${preventa.length ? `<section class="section">${sectionHead("Entradas ya a la venta (preventa)")}<div class="cfilms cartel-fija">${preventa.map(({ p }) => carteleraCard({ ...p, info: infoCartelera(p) }, null, "")).join("")}</div></section>` : ""}`;
  const up = $("#cartUpd");
  if (up) up.onclick = async () => {
    up.disabled = true; up.innerHTML = `${icon("refresh")}Descargando… (1-2 min)`;
    try { await api("estrenos/actualizar", { method: "POST" }); await loadAll(); toast("Cartelera y estrenos actualizados"); VIEWS.cartelera(v); }
    catch (err) { toast(err.message, "x"); up.disabled = false; }
  };
};

// ---------------------------------------------------------------- Menú «Más» (móvil)
function openMore() {
  const r = route().name;
  modal(`<div class="sheet-body"><div class="eyebrow">Filora</div><h2 class="h2" style="margin:6px 0 16px">Secciones</h2>
    <div class="more-list">${navItems().map(([k, l, ic]) => `<a href="#/${k}" class="${r === k ? "on" : ""}" data-close>${icon(ic)}<span>${l}</span></a>`).join("")}</div>
    ${!ro() ? `<button class="btn btn-primary" data-action="add" style="width:100%;justify-content:center;margin-top:16px">${icon("plus")}Añadir película</button>` : ""}
    ${STATIC ? (ro() ? `<button class="btn btn-ghost" data-login style="width:100%;justify-content:center;margin-top:10px">${icon("user")}Crea tu cuenta o entra</button>` : `<button class="btn btn-ghost" data-logout style="width:100%;justify-content:center;margin-top:10px">${icon("x")}Salir</button>`) : ""}</div>`, "narrow");
}

// ---------------------------------------------------------------- Búsqueda en Wikidata desde el navegador (web publicada)
const WD_FILM = new Set(["Q11424", "Q202866", "Q24869", "Q229390", "Q506240", "Q17517379", "Q93204", "Q20650540", "Q226730", "Q1261214", "Q336144", "Q110956863", "Q24862"]);
const WD_TV = new Set(["Q5398426", "Q1259759", "Q15416", "Q526877", "Q63952888", "Q117467246", "Q3464665", "Q21191270", "Q1366112", "Q581714"]);
const WD_GEN = [[/superh[ée]ro|superhero/, "Superhéroes"], [/terror|horror|slasher/, "Terror"], [/ciencia ficci|science fiction/, "Ciencia ficción"],
  [/animaci|animad|animated|anime/, "Animación"], [/document/, "Documental"], [/comedia|comedy|parod|sátira|satire/, "Comedia"],
  [/suspense|thriller/, "Thriller"], [/acci[óo]n|action|artes marciales/, "Acción"], [/aventura|adventure/, "Aventura"], [/fant[áa]s/, "Fantasía"],
  [/rom[áa]n|romance|romantic/, "Romance"], [/musical/, "Musical"], [/b[ée]lic|guerra|war film/, "Bélico"], [/western|w[ée]stern|del oeste/, "Western"],
  [/misterio|mystery|detectiv/, "Misterio"], [/biogr/, "Biográfico"], [/hist[óo]ric|period/, "Histórico"], [/famil|infantil|children/, "Familiar"],
  [/crim|polic|g[áa]ngster|noir|heist|atracos/, "Crimen"], [/drama/, "Drama"]];
async function wdApi(params, host = "www.wikidata.org") {
  const u = `https://${host}/w/api.php?` + new URLSearchParams({ ...params, format: "json", origin: "*" });
  const r = await fetch(u);
  return r.json();
}
async function wikiBuscar(q) {
  const s = await wdApi({ action: "wbsearchentities", search: q, language: "es", uselang: "es", type: "item", limit: "12" });
  const ids = (s.search || []).map((x) => x.id);
  if (!ids.length) return [];
  const ents = (await wdApi({ action: "wbgetentities", ids: ids.join("|"), props: "claims|labels|sitelinks", languages: "es|en", sitefilter: "enwiki" })).entities || {};
  const cv = (e, p) => ((e.claims || {})[p] || []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value)
    .filter((v) => v != null).map((v) => (typeof v === "object" ? v.id || v.time || v.amount || v.text : v));
  const esPeli = (e) => { const t = cv(e, "P31"); return t.some((x) => WD_FILM.has(x)) || (cv(e, "P345").some((x) => String(x).startsWith("tt")) && !t.some((x) => WD_TV.has(x)) && cv(e, "P57").length > 0); };
  const pelis = ids.map((i) => ents[i]).filter((e) => e && !e.missing && esPeli(e)).slice(0, 8);
  if (!pelis.length) return [];
  const refs = [...new Set(pelis.flatMap((e) => [...cv(e, "P57").slice(0, 3), ...cv(e, "P495").slice(0, 1), ...cv(e, "P136")]))];
  const labs = refs.length ? (await wdApi({ action: "wbgetentities", ids: refs.slice(0, 50).join("|"), props: "labels", languages: "es|en" })).entities || {} : {};
  const lab = (e, l = "es") => (e && e.labels && ((e.labels[l] || e.labels.en || {}).value)) || "";
  const titulos = pelis.map((e) => e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title).filter(Boolean);
  const posters = {};
  if (titulos.length) {
    const d = await wdApi({ action: "query", titles: titulos.join("|"), prop: "pageimages", piprop: "thumbnail", pithumbsize: "342", pilicense: "any", redirects: "1" }, "en.wikipedia.org");
    const q2 = d.query || {};
    const back = Object.fromEntries([...(q2.redirects || []), ...(q2.normalized || [])].map((r) => [r.to, r.from]));
    for (const p of Object.values(q2.pages || {})) if (p.thumbnail) posters[back[p.title] || p.title] = p.thumbnail.source.split("?")[0];
  }
  return pelis.map((e) => {
    const años = {};
    for (const t of cv(e, "P577")) { const m = /[+-](\d{4})/.exec(t); if (m) años[m[1]] = (años[m[1]] || 0) + 1; }
    const anio = Object.keys(años).sort((a, b) => años[b] - años[a] || a - b)[0];
    const gl = cv(e, "P136").flatMap((g) => [lab(labs[g], "es"), lab(labs[g], "en")]).map((x) => x.toLowerCase());
    const generos = [];
    for (const g of gl) for (const [rx, n] of WD_GEN) if (rx.test(g) && !generos.includes(n)) generos.push(n);
    const P = { imdb: "P345", filmaffinity: "P480", rt: "P1258", letterboxd: "P6127", tmdb: "P4947", allocine: "P1265" };
    const idsExt = { wikidata: e.id };
    for (const [k, p] of Object.entries(P)) { const v = cv(e, p)[0]; if (v) idsExt[k] = String(v); }
    const dur = cv(e, "P2047")[0];
    const enw = e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title;
    return {
      titulo: lab(e, "es"), tituloOriginal: cv(e, "P1476")[0] || lab(e, "en"), anio: anio ? +anio : null,
      duracion: dur ? Math.round(+dur) : null, director: cv(e, "P57").slice(0, 3).map((d) => lab(labs[d])).filter(Boolean).join(" / "),
      pais: lab(labs[cv(e, "P495")[0]]), generos: generos.slice(0, 3), ids: idsExt, poster: posters[enw] || null,
    };
  });
}
// Completa en segundo plano lo que falte de una película añadida desde la web
async function completarDesdeWiki(p) {
  if (!STATIC || (p.ids && p.ids.wikidata)) return;
  try {
    const res = await wikiBuscar(p.titulo);
    const m = res.find((r) => !p.anio || !r.anio || Math.abs(r.anio - p.anio) <= 1);
    if (!m) return;
    const cambios = { ids: m.ids };
    if (!p.poster && m.poster) cambios.poster = m.poster;
    for (const k of ["tituloOriginal", "director", "pais", "duracion", "anio"]) if (!p[k] && m[k]) cambios[k] = m[k];
    if (!(p.generos || []).length && m.generos.length) cambios.generos = m.generos;
    await api(`peliculas/${p.id}`, { method: "PUT", body: cambios });
  } catch (e) { /* sin conexión con Wikidata: se queda como está */ }
}

// ---------------------------------------------------------------- Cuentas (web publicada)
function openCuenta() {
  const ses = getSes();
  if (ses || getPin()) {
    modal(`<div class="sheet-body"><div class="eyebrow">${ses ? "Tu cuenta" : "Modo edición"}</div><h2 class="h2" style="margin:6px 0 10px">${ses ? esc(ses.usuario) : "Dueño"}</h2>
      <p class="muted" style="margin:0 0 18px">${ses ? `${fmtInt(S.db.peliculas.length)} películas y ${fmtInt(S.db.series.length)} series guardadas en tu cuenta. Entra con el mismo usuario en otro dispositivo para verlas allí.` : "Estás editando la colección pública con tu PIN."}</p>
      ${ses ? `<button class="btn" data-importar style="width:100%;justify-content:center;margin-bottom:10px">${icon("download")}Importar de Letterboxd, IMDb…</button>` : ""}
      ${ses ? `<label class="btn" style="width:100%;justify-content:center;margin-bottom:10px;cursor:pointer">${icon("upload")}Importar una copia (.json)<input type="file" id="impF" accept=".json,application/json" hidden></label>` : ""}
      <button class="btn" data-logout style="width:100%;justify-content:center">${icon("x")}Salir</button></div>`, "narrow");
    const f = $("#impF");
    if (f) f.onchange = async () => {
      try {
        const datos = JSON.parse(await f.files[0].text());
        if (!Array.isArray(datos.peliculas)) throw new Error("El archivo no es una copia de Filora");
        await api("sync", { method: "POST", body: datos });
        closeModal(); await refreshDB(); render();
        toast(`Importadas: ${fmtInt(S.db.peliculas.length)} películas en tu cuenta`, "upload");
      } catch (e) { toast(e.message || "No se ha podido importar", "x"); }
    };
    return;
  }
  openLogin();
}
function openLogin(modo = "entrar") {
  const crear = modo === "crear";
  modal(`<div class="sheet-body cuenta-f">
    <div class="seg" style="margin-bottom:20px"><button type="button" class="${crear ? "" : "on"}" data-modo="entrar">Entrar</button><button type="button" class="${crear ? "on" : ""}" data-modo="crear">Crear cuenta</button></div>
    <h2 class="h2" style="margin:0 0 8px">${crear ? "Tu propia Filora" : "Hola de nuevo"}</h2>
    <p class="muted" style="margin:0 0 18px">${crear ? "Elige un usuario y una contraseña. Tus películas se guardarán en tu cuenta y solo tú podrás editarlas." : "Entra con tu usuario y contraseña para ver y editar tu colección."}</p>
    <form id="cuentaF" novalidate>
      <label class="lbl" for="cUser">Usuario</label>
      <input class="input" id="cUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" placeholder="marta">
      <label class="lbl" for="cPass" style="margin-top:12px">Contraseña</label>
      <input class="input" id="cPass" name="password" type="password" autocomplete="${crear ? "new-password" : "current-password"}" placeholder="${crear ? "Mínimo 6 caracteres" : ""}">
      ${crear ? `<label class="lbl" for="cPass2" style="margin-top:12px">Repite la contraseña</label><input class="input" id="cPass2" type="password" autocomplete="new-password">` : ""}
      <div id="cPinBox" hidden><label class="lbl" for="cPinIn" style="margin-top:12px">PIN del dueño</label><input class="input" id="cPinIn" type="password" inputmode="numeric" autocomplete="off"></div>
      <p id="cErr" role="alert" style="color:var(--red);min-height:22px;margin:10px 0 6px"></p>
      <button class="btn btn-primary" id="cBtn" style="width:100%;justify-content:center">${icon(crear ? "plus" : "check")}${crear ? "Crear cuenta" : "Entrar"}</button>
    </form>
    </div>`, "narrow");
  setTimeout(() => $("#cUser").focus(), 60);
  document.querySelectorAll(".cuenta-f [data-modo]").forEach((b) => (b.onclick = () => openLogin(b.dataset.modo)));
  const err = (m) => ($("#cErr").textContent = m);
  ["cUser", "cPass", "cPass2"].forEach((id) => { const el = document.getElementById(id); if (el) el.oninput = () => err(""); });
  $("#cuentaF").onsubmit = async (ev) => {
    ev.preventDefault();
    const usuario = $("#cUser").value.trim(), clave = $("#cPass").value;
    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(usuario)) return err("El usuario debe tener de 3 a 24 letras, números, puntos o guiones, sin espacios.");
    if (clave.length < 6) return err("La contraseña debe tener al menos 6 caracteres.");
    if (crear && clave !== $("#cPass2").value) return err("Las contraseñas no coinciden.");
    const b = $("#cBtn"); b.disabled = true;
    try {
      const pin = $("#cPinIn").value.trim();
      const r = await fetch(`/api/${crear ? "registro" : "entrar"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, clave, ...(pin ? { pin } : {}) }) });
      const j = await r.json().catch(() => ({}));
      if (j.pedirPin) { $("#cPinBox").hidden = false; $("#cPinIn").focus(); }
      if (!r.ok) return err(j.error || "No se ha podido conectar. Inténtalo de nuevo.");
      setSes({ usuario: j.usuario, token: j.token });
      try { localStorage.removeItem(PIN_KEY); } catch (e) { /* */ }
      document.documentElement.classList.toggle("ro", ro());
      closeModal(); await refreshDB();
      location.hash = crear ? "#/anadir" : "#/inicio"; render();
      toast(crear ? `Cuenta creada. Bienvenido, ${j.usuario}` : `Hola, ${j.usuario}`, "user");
    } catch (e) {
      err("No se ha podido conectar. Comprueba tu conexión.");
    } finally { b.disabled = false; }
  };
}
// El dueño de la colección pública puede seguir editándola con su PIN.
function openPin() {
  modal(`<div class="sheet-body"><div class="eyebrow">Solo para el dueño</div><h2 class="h2" style="margin:6px 0 10px">Entrar con PIN</h2>
    <p class="muted" style="margin:0 0 18px">Con tu PIN podrás editar la colección pública desde este dispositivo.</p>
    <form id="loginF" style="display:flex;gap:10px"><input class="input" id="pinIn" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN" style="flex:1;font-size:18px;letter-spacing:.3em">
    <button class="btn btn-primary">${icon("check")}Entrar</button></form><p id="loginErr" style="color:var(--red);min-height:20px;margin:10px 0 0"></p></div>`, "narrow");
  setTimeout(() => $("#pinIn").focus(), 60);
  $("#loginF").onsubmit = async (ev) => {
    ev.preventDefault();
    const pin = $("#pinIn").value.trim();
    if (!pin) return;
    const r = await fetch("/api/login", { method: "POST", headers: { "X-Pin": pin } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { $("#loginErr").textContent = j.error || "No se pudo entrar"; return; }
    setSes(null);
    try { localStorage.setItem(PIN_KEY, pin); } catch (e) { /* */ }
    document.documentElement.classList.toggle("ro", ro());
    closeModal(); await refreshDB(); render(); toast("Modo edición activado en este dispositivo");
  };
}
async function logout() {
  setSes(null);
  try { localStorage.removeItem(PIN_KEY); } catch (e) { /* */ }
  document.documentElement.classList.toggle("ro", ro());
  await refreshDB().catch(() => {});
  location.hash = "#/inicio"; render();
  toast("Has salido de tu cuenta", "eyeoff");
}

// ---------------------------------------------------------------- Añadir (como en el Excel)
const COLS_XL = [
  ["anio", "Año", "number"], ["duracion", "Duración", "number"], ["nota", "Nota", "number"], ["titulo", "Título", "text"],
  ["director", "Director", "text"], ["pais", "País", "text"], ["generos", "Géneros", "tags"],
];
function lugaresLista() { return [...misCines().map((c) => c.nombre), ...PLATAFORMAS, "Televisión", "DVD / Blu-ray", "Otro"]; }
function parseGeneros(txt) {
  return String(txt || "").split(/[,;/]/).map((x) => x.trim()).filter(Boolean)
    .map((x) => GENEROS.find((g) => norm(g) === norm(x)) || GENEROS.find((g) => norm(g).startsWith(norm(x))) || null).filter(Boolean);
}
function valorCelda(p, k) {
  if (k === "generos") return (p.generos || []).join(", ");
  if (k === "nota") return p.nota == null ? "" : String(p.nota).replace(".", ",");
  return p[k] ?? "";
}
function leerCelda(k, v) {
  v = String(v).trim();
  if (k === "anio" || k === "duracion") return v ? parseInt(v, 10) || null : null;
  if (k === "nota") return v ? Math.round(clamp(parseFloat(v.replace(",", ".")), 0, 10) * 10) / 10 : null;
  if (k === "generos") return parseGeneros(v);
  if (k === "titulo" && v && v === v.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(v)) return v.toLowerCase().replace(/(^|[\s:¿¡(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return v || null;
}
const tagHTML = (g) => `<span class="tag" data-g="${esc(g)}">${esc(g)}<button type="button" class="tag-x" aria-label="Quitar ${esc(g)}">×</button></span>`;
const tagsHTML = (gen, id = "") => `<div class="tags" ${id ? `id="${id}"` : ""}>${(gen || []).map(tagHTML).join("")}<input class="tag-in" list="xlGeneros" placeholder="${(gen || []).length ? "+" : "+ género"}" autocomplete="off" aria-label="Añadir género"></div>`;
const leerTags = (c) => $$(".tag", c).map((t) => t.dataset.g);
function setTags(c, gen) { c.innerHTML = (gen || []).map(tagHTML).join("") + `<input class="tag-in" list="xlGeneros" placeholder="${(gen || []).length ? "+" : "+ género"}" autocomplete="off" aria-label="Añadir género">`; }
function celdaXL(p, k, t, nueva) {
  if (t === "tags") return tagsHTML(nueva ? [] : p.generos, nueva ? "xlTagsNew" : "");
  const ph = nueva ? (k === "titulo" ? "Escribe el título…" : k === "nota" ? "0–10" : "") : "";
  return `<input class="xl-in" ${nueva ? `id="xl_${k}"` : ""} data-k="${k}" type="text" ${t === "number" ? 'inputmode="decimal"' : ""} placeholder="${ph}" value="${nueva ? "" : esc(valorCelda(p, k))}" autocomplete="off">`;
}
function filaXL(p) {
  return `<tr data-xl="${p.id}">
    <td class="xl-poster">${p.poster ? `<img src="${esc(p.poster)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}</td>
    ${COLS_XL.map(([k, , t]) => `<td class="xl-c-${k}">${celdaXL(p, k, t, false)}</td>`).join("")}
    <td class="xl-act"><button class="icon-btn" data-open="${p.id}" title="Ver ficha">${icon("eye")}</button></td></tr>`;
}
VIEWS.anadir = (v) => {
  if (ro()) { location.hash = "#/inicio"; return; }
  const recientes = [...S.db.peliculas].sort((a, b) => String(b.añadido || "").localeCompare(String(a.añadido || "")) || (b.anio || 0) - (a.anio || 0) || (b.nota || 0) - (a.nota || 0)).slice(0, 40);
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Añadir películas</h1>
    <p>Escribe una fila por película y pulsa <b>Intro</b>. Al teclear el título te propongo la película y relleno el resto (director, país, géneros y póster). Puedes corregir cualquier celda de abajo: se guarda al salir de ella.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-importar>${icon("download")}Importar de Letterboxd, IMDb…</button><button class="btn" id="xlPaste">${icon("upload")}Pegar filas de Excel</button><button class="btn btn-ghost" data-action="add">${icon("plus")}Formulario completo</button></div></div>
  <div class="card xl-wrap">
    <table class="xl">
      <thead><tr><th></th>${COLS_XL.map(([k, l]) => `<th class="xl-c-${k}">${l}</th>`).join("")}<th></th></tr></thead>
      <tbody>
        <tr class="xl-new">
          <td class="xl-poster" id="xlNewPoster"></td>
          ${COLS_XL.map(([k, l, t]) => `<td class="xl-c-${k}" data-label="${l}"><div class="${k === "titulo" ? "ac" : ""}">${celdaXL(null, k, t, true)}${k === "titulo" ? `<div class="ac-list" id="xlAc" hidden></div>` : ""}</div></td>`).join("")}
          <td class="xl-act"><button class="btn btn-primary btn-sm" id="xlSave">${icon("check")}<span>Guardar</span></button></td>
        </tr>
        <tr class="xl-sep"><td colspan="${COLS_XL.length + 2}">Últimas añadidas</td></tr>
        ${recientes.map(filaXL).join("")}
      </tbody>
    </table>
  </div>
  <datalist id="xlLugares">${lugaresLista().map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
  <datalist id="xlGeneros">${GENEROS.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>`;

  let elegido = null;
  const campos = COLS_XL.filter((c) => c[2] !== "tags").map((c) => c[0]);
  const nuevo = () => Object.fromEntries(campos.map((k) => [k, $(`#xl_${k}`).value]));
  const limpiar = () => { campos.forEach((k) => { $(`#xl_${k}`).value = ""; }); setTags($("#xlTagsNew"), []); elegido = null; $("#xlNewPoster").innerHTML = ""; $("#xl_titulo").focus(); };

  // autocompletar el título
  const q = $("#xl_titulo"), list = $("#xlAc");
  let t, seq = 0, res = [];
  q.oninput = () => {
    elegido = null; clearTimeout(t);
    t = setTimeout(async () => {
      const s = q.value.trim();
      if (s.length < 2) { list.hidden = true; return; }
      const my = ++seq;
      list.hidden = false; list.innerHTML = `<div class="ac-empty">Buscando “${esc(s)}”…</div>`;
      try { res = await api(`buscar?q=${encodeURIComponent(s)}`); } catch (e) { res = []; }
      if (my !== seq) return;
      list.innerHTML = res.length ? res.map((r, i) => `<div class="ac-item" data-i="${i}"><div class="mini">${r.poster ? `<img src="${esc(r.poster)}" referrerpolicy="no-referrer" alt="">` : ""}</div><div><div style="font-weight:600">${esc(r.titulo)} <span class="dim">${r.anio || ""}</span></div><div class="s">${esc(r.director || "")}</div></div></div>`).join("")
        : `<div class="ac-empty">Sin coincidencias: se guardará como la escribas.</div>`;
      $$(".ac-item", list).forEach((el) => (el.onmousedown = (ev) => { ev.preventDefault(); elegir(res[+el.dataset.i]); }));
    }, 350);
  };
  q.onblur = () => setTimeout(() => (list.hidden = true), 150);
  const elegir = (r) => {
    elegido = r;
    q.value = r.titulo;
    for (const [k, val] of [["anio", r.anio], ["duracion", r.duracion], ["director", r.director], ["pais", r.pais]]) if (val) $(`#xl_${k}`).value = val;
    setTags($("#xlTagsNew"), r.generos || []);
    $("#xlNewPoster").innerHTML = r.poster ? `<img src="${esc(r.poster)}" alt="" referrerpolicy="no-referrer">` : "";
    list.hidden = true;
    $("#xl_nota").focus();
  };

  const guardar = async () => {
    const d = nuevo();
    if (!d.titulo.trim()) { $("#xl_titulo").focus(); return toast("Falta el título", "x"); }
    const datos = Object.fromEntries(campos.map((k) => [k, leerCelda(k, d[k])]));
    datos.generos = leerTags($("#xlTagsNew"));
    const dup = S.db.peliculas.find((x) => (norm(x.titulo) === norm(datos.titulo) || norm(x.tituloOriginal) === norm(datos.titulo)) && (!datos.anio || !x.anio || Math.abs(x.anio - datos.anio) <= 1));
    if (dup && !confirm(`Ya tienes «${dup.titulo}» (${dup.anio || "s/a"}) con un ${fmt1(dup.nota)}. ¿Añadirla otra vez?`)) return;
    const body = { ...datos, tituloOriginal: elegido ? elegido.tituloOriginal : null, ids: elegido ? elegido.ids : {}, poster: elegido ? elegido.poster : null, taquilla: {}, resena: "", favorita: false, fechaVisto: todayISO() };
    const btn = $("#xlSave"); btn.disabled = true;
    try {
      const p = await api("peliculas", { method: "POST", body });
      toast(`«${p.titulo}» añadida${p.nota != null ? ` con un ${fmt1(p.nota)}` : ""}`);
      S.db.peliculas.push(p); S.prof = null;
      $(".xl-sep").insertAdjacentHTML("afterend", filaXL(p));
      limpiar(); renderChrome();
      completarDesdeWiki(p).then(() => refrescarFila(p.id));
      [6000, 15000, 30000].forEach((ms) => setTimeout(() => refrescarFila(p.id), ms)); // el póster llega en unos segundos
    } catch (e) { toast(e.message, "x"); }
    btn.disabled = false;
  };
  $("#xlSave").onclick = guardar;
  $$(".xl-new .xl-in").forEach((el) => el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !(el.id === "xl_titulo" && !list.hidden && res.length)) { ev.preventDefault(); guardar(); }
    if (ev.key === "Enter" && el.id === "xl_titulo" && !list.hidden && res.length) { ev.preventDefault(); elegir(res[0]); }
  }));

  // edición directa de las filas existentes (se guarda al salir de la celda)
  // etiquetas de género: añadir con Intro, coma o eligiendo de la lista; quitar con × o retroceso
  const guardarTags = async (c) => {
    const tr = c.closest("tr[data-xl]");
    if (!tr) return;
    try {
      const p = await api(`peliculas/${tr.dataset.xl}`, { method: "PUT", body: { generos: leerTags(c) } });
      const i = S.db.peliculas.findIndex((x) => x.id === tr.dataset.xl); if (i >= 0) S.db.peliculas[i] = { ...S.db.peliculas[i], ...p };
      S.prof = null;
    } catch (e) { toast(e.message, "x"); }
  };
  const ponerTag = (inp, texto) => {
    const c = inp.closest(".tags");
    const g = parseGeneros(texto).filter((x) => !leerTags(c).includes(x));
    inp.value = "";
    if (!g.length) return false;
    inp.insertAdjacentHTML("beforebegin", g.map(tagHTML).join(""));
    inp.placeholder = "+";
    guardarTags(c);
    return true;
  };
  v.onclick = (ev) => {
    const x = ev.target.closest(".tag-x");
    if (x) { const c = x.closest(".tags"); x.parentElement.remove(); guardarTags(c); $(".tag-in", c).focus(); return; }
    const c = ev.target.closest(".tags");
    if (c && ev.target === c) $(".tag-in", c).focus();
  };
  v.oninput = (ev) => {
    const inp = ev.target.closest(".tag-in");
    if (inp && GENEROS.some((g) => norm(g) === norm(inp.value))) ponerTag(inp, inp.value);
  };
  v.onkeydown = (ev) => {
    const inp = ev.target.closest(".tag-in");
    if (!inp) return;
    if ((ev.key === "Enter" || ev.key === "," || ev.key === "Tab") && inp.value.trim()) { ev.preventDefault(); ponerTag(inp, inp.value); return; }
    if (ev.key === "Enter" && inp.closest(".xl-new")) { ev.preventDefault(); guardar(); return; }
    if (ev.key === "Backspace" && !inp.value) { const c = inp.closest(".tags"); const t = $$(".tag", c).pop(); if (t) { t.remove(); guardarTags(c); } }
  };
  v.onchange = async (ev) => {
    const inp = ev.target.closest("tr[data-xl] .xl-in");
    if (!inp) return;
    const tr = inp.closest("tr"); const id = tr.dataset.xl; const k = inp.dataset.k;
    const val = leerCelda(k, inp.value);
    if (k === "titulo" && !val) { toast("El título no puede quedar vacío", "x"); return; }
    try {
      const p = await api(`peliculas/${id}`, { method: "PUT", body: { [k]: val } });
      const i = S.db.peliculas.findIndex((x) => x.id === id); if (i >= 0) S.db.peliculas[i] = { ...S.db.peliculas[i], ...p };
      S.prof = null;
      inp.value = valorCelda(p, k);
      inp.classList.add("ok"); setTimeout(() => inp.classList.remove("ok"), 900);
    } catch (e) { toast(e.message, "x"); }
  };
  $("#xlPaste").onclick = openPegar;
  setTimeout(() => $("#xl_titulo").focus(), 80);
};
// Trae el póster y los datos que se completan solos tras añadir una película
async function refrescarFila(id) {
  await refrescarSilencioso();
  const p = S.db.peliculas.find((x) => x.id === id);
  const tr = document.querySelector(`tr[data-xl="${id}"]`);
  if (!p || !tr) return;
  if (p.poster && !$(".xl-poster img", tr)) $(".xl-poster", tr).innerHTML = `<img src="${esc(p.poster)}" alt="" referrerpolicy="no-referrer">`;
  $$(".xl-in", tr).forEach((inp) => { if (!inp.value && document.activeElement !== inp) inp.value = valorCelda(p, inp.dataset.k); });
  const c = $(".tags", tr);
  if (c && !leerTags(c).length && (p.generos || []).length) setTags(c, p.generos);
}
// Carátula de una serie recién añadida (TVmaze, sin claves)
async function completarSerie(sr) {
  if (sr.poster) return;
  try {
    const r = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(sr.titulo)}`);
    const L = await r.json();
    const y = parseInt(sr.anios, 10);
    const m = L.map((x) => x.show).find((x) => x.image && (!y || !x.premiered || Math.abs(+x.premiered.slice(0, 4) - y) <= 2));
    if (!m) return;
    const ids = { ...(sr.ids || {}), tvmaze: m.id };
    if (m.externals && m.externals.imdb) ids.imdb = ids.imdb || m.externals.imdb;
    await api(`series/${sr.id}`, { method: "PUT", body: { poster: m.image.medium.replace("http://", "https://"), ids } });
    await refrescarSilencioso();
    if (route().name === "series") { render._keep = true; render(); }
  } catch (e) { /* sin conexión: se queda sin carátula */ }
}
async function refrescarSilencioso() { try { S.db = await api("db"); S.prof = null; } catch (e) { /* */ } }

// Pegar varias filas copiadas de un Excel (Año · Duración · Nota · Título · Director · País)
function parsePegado(txt) {
  const filas = [];
  for (const linea of String(txt).split(/\r?\n/)) {
    if (!linea.trim()) continue;
    let c = linea.split("\t").map((x) => x.trim());
    while (c.length && !c[0]) c.shift(); // columna A vacía, como en tu Excel original
    if (!c.length) continue;
    let d;
    if (/^\d{4}(\.0)?$/.test(c[0])) d = { anio: c[0], duracion: c[1], nota: c[2], titulo: c[3], director: c[4], pais: c[5], generos: c[6] };
    else d = { titulo: c[0], anio: c[1], nota: c[2], director: c[3], pais: c[4] };
    if (!d.titulo || /^t[íi]tulo$/i.test(d.titulo)) continue;
    const it = Object.fromEntries(Object.entries(d).map(([k, val]) => [k, leerCelda(k, val ?? "")]));
    it.dup = !!S.db.peliculas.find((x) => (norm(x.titulo) === norm(it.titulo) || norm(x.tituloOriginal) === norm(it.titulo)) && (!it.anio || !x.anio || Math.abs(x.anio - it.anio) <= 1));
    filas.push(it);
  }
  return filas;
}
function openPegar() {
  modal(`<div class="sheet-body"><div class="eyebrow">Importar en bloque</div><h2 class="h2" style="margin:6px 0 10px">Pegar filas de Excel</h2>
    <p class="muted" style="margin:0 0 14px">Copia filas de tu Excel con las columnas <b>Año · Duración · Nota · Título · Director · País</b> (como las tenías siempre) y pégalas aquí. También vale solo <b>Título · Año · Nota</b>.</p>
    <textarea class="textarea" id="pegTxt" rows="7" placeholder="2026&#9;155&#9;8,5&#9;DUNE: PARTE TRES&#9;DENIS VILLENEUVE&#9;ESTADOS UNIDOS"></textarea>
    <div id="pegPrev" style="margin-top:14px"></div>
    <div class="form-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="pegGo" disabled>${icon("check")}Importar</button></div></div>`);
  let filas = [];
  const prev = () => {
    filas = parsePegado($("#pegTxt").value);
    const nuevas = filas.filter((f) => !f.dup);
    $("#pegPrev").innerHTML = filas.length ? `<table class="tbl"><thead><tr><th>Título</th><th class="r">Año</th><th class="r">Nota</th><th>Director</th><th></th></tr></thead><tbody>
      ${filas.map((f) => `<tr><td>${esc(f.titulo)}</td><td class="r">${f.anio || ""}</td><td class="r">${f.nota != null ? scoreBadge(f.nota) : ""}</td><td class="muted">${esc(f.director || "")}</td><td>${f.dup ? `<span class="chip">Ya la tienes</span>` : `<span class="chip on">Nueva</span>`}</td></tr>`).join("")}</tbody></table>` : "";
    $("#pegGo").disabled = !nuevas.length;
    $("#pegGo").innerHTML = `${icon("check")}Importar ${nuevas.length || ""} ${nuevas.length === 1 ? "película" : "películas"}`;
  };
  $("#pegTxt").oninput = prev;
  setTimeout(() => $("#pegTxt").focus(), 60);
  $("#pegGo").onclick = async () => {
    const btn = $("#pegGo"); btn.disabled = true;
    let n = 0;
    for (const f of filas.filter((x) => !x.dup)) {
      const { dup, ...datos } = f;
      btn.innerHTML = `${icon("refresh")}Importando ${++n}…`;
      try {
        const p = await api("peliculas", { method: "POST", body: { ...datos, fechaVisto: null, ids: {}, poster: null, taquilla: {}, resena: "", favorita: false } });
        S.db.peliculas.push(p);
        await completarDesdeWiki(p);
      } catch (e) { toast(e.message, "x"); break; }
    }
    await refrescarSilencioso(); closeModal(); render(); toast(`${n} ${n === 1 ? "película importada" : "películas importadas"}`);
  };
}

// ---------------------------------------------------------------- eventos globales
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-open],[data-cat],[data-rel],[data-edit],[data-del],[data-fav],[data-close],[data-action],[data-want],[data-seen],[data-nope],[data-wseen],[data-wdel],[data-relwant],[data-relseen],[data-serie],[data-sedit],[data-sdel],[data-more],[data-cday],[data-ccine],[data-login],[data-logout],[data-cuenta],[data-cines],[data-importar]");
  if (!t) return;
  const d = t.dataset;
  if (d.login !== undefined) { e.preventDefault(); return openLogin(d.login === "crear" ? "crear" : "entrar"); }
  if (d.cuenta !== undefined) { e.preventDefault(); return openCuenta(); }
  if (d.cines !== undefined) { e.preventDefault(); return openCines(); }
  if (d.importar !== undefined) { e.preventDefault(); return openImportar(); }
  if (d.logout !== undefined) { e.preventDefault(); closeModal(); return logout(); }
  if (ro() && ["action", "edit", "del", "fav", "want", "seen", "relwant", "relseen", "wseen", "wdel", "sedit", "sdel"].some((k) => d[k] !== undefined)) return;
  if (d.more !== undefined) { e.preventDefault(); return openMore(); }
  if (d.cday) { S.cart_.dia = d.cday; render._keep = true; return VIEWS.cartelera($("#view")); }
  if (d.ccine !== undefined) { S.cart_.cine = d.ccine; render._keep = true; return VIEWS.cartelera($("#view")); }
  if (d.close !== undefined) { if (t.tagName !== "A" || t.getAttribute("href") === "#") e.preventDefault(); closeModal(); return; }
  if (d.action === "add") return openForm();
  if (d.open) return openFilm(d.open);
  if (d.cat !== undefined && !d.open) return openCat(+d.cat);
  if (d.rel) return openRel(d.rel);
  if (d.edit) { e.preventDefault(); return openForm(S.db.peliculas.find((p) => p.id === d.edit)); }
  if (d.fav) {
    const p = S.db.peliculas.find((x) => x.id === d.fav);
    await api(`peliculas/${p.id}`, { method: "PUT", body: { favorita: !p.favorita } });
    await refreshDB(); openFilm(p.id); render._keep = true; render(); return;
  }
  if (d.del) {
    const p = S.db.peliculas.find((x) => x.id === d.del);
    if (!confirm(`¿Eliminar «${p.titulo}» de tu colección?`)) return;
    await api(`peliculas/${p.id}`, { method: "DELETE" });
    await refreshDB(); closeModal(); toast("Película eliminada"); render._keep = true; render(); return;
  }
  if (d.want !== undefined) { const c = S.cat[+d.want]; await addPending(c, `Recomendada · ${predict(c).pct}% afinidad`); if ($("#modal").hidden) { render._keep = true; render(); } else closeModal(); return; }
  if (d.seen !== undefined) { const c = S.cat[+d.seen]; return openForm(null, { titulo: c.titulo, tituloOriginal: c.tituloOriginal, anio: c.anio, director: c.director, pais: c.pais, generos: c.generos, poster: c.poster || null, ids: c.ids || {} }); }
  if (d.nope !== undefined) {
    const c = S.cat[+d.nope]; const s = descartadas(); s.add(norm(c.tituloOriginal));
    try { localStorage.setItem("cine.desc", JSON.stringify([...s])); } catch (err) { /* */ }
    toast("Vale, no te la volveré a sugerir", "eyeoff"); render._keep = true; render(); return;
  }
  if (d.relwant) { const x = S.est.estrenos.find((y) => y.fecha + "|" + y.titulo === d.relwant); await addPending({ ...x, anio: +x.fecha.slice(0, 4) }, `Estreno en cines el ${fechaLarga(x.fecha)}`); closeModal(); return; }
  if (d.relseen) { const x = S.est.estrenos.find((y) => y.fecha + "|" + y.titulo === d.relseen); return openForm(null, { titulo: x.titulo, tituloOriginal: x.original || null, anio: +x.fecha.slice(0, 4), director: x.director || "", pais: x.pais || "", generos: x.generos || [], saga: x.saga || "", poster: x.poster || null, lugar: (S.est.cines || [])[0]?.nombre || "" }); }
  if (d.wseen) { const w = S.db.pendientes.find((x) => x.id === d.wseen); return openForm(null, { titulo: w.titulo, tituloOriginal: w.tituloOriginal || null, anio: w.anio || "", _pendiente: w.id }); }
  if (d.wdel) { await api(`pendientes/${d.wdel}`, { method: "DELETE" }); await refreshDB(); render._keep = true; render(); return; }
  if (d.serie) return openSerie(d.serie);
  if (d.sedit) return openSerieForm(S.db.series.find((s) => s.id === d.sedit));
  if (d.sdel) { if (!confirm("¿Eliminar esta serie?")) return; await api(`series/${d.sdel}`, { method: "DELETE" }); await refreshDB(); closeModal(); render(); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (typing || !$("#modal").hidden) return;
  if (e.key === "/") { e.preventDefault(); if (route().name !== "coleccion") location.hash = "#/coleccion"; setTimeout(() => $("#fq")?.focus(), 60); }
  if (e.key === "n" && !ro()) { e.preventDefault(); openForm(); }
});
// tooltips
const tip = document.createElement("div");
tip.className = "tip"; tip.hidden = true; document.body.appendChild(tip);
document.addEventListener("mousemove", (e) => {
  const t = e.target.closest?.("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - 270) + "px"; tip.style.top = e.clientY + 14 + "px";
});
window.addEventListener("hashchange", () => { closeModal(); render(); });

// ---------------------------------------------------------------- tema claro / oscuro
// Ciclo: automático (sigue al sistema) → claro → oscuro. Se recuerda en este navegador.
(function tema() {
  const b = document.getElementById("tema");
  const nombres = { "": "automático", light: "claro", dark: "oscuro" };
  const pintar = () => {
    const t = document.documentElement.dataset.theme || "";
    b.setAttribute("aria-label", `Tema: ${nombres[t]}. Cambiar`);
    b.dataset.tip = `Tema ${nombres[t]}`;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      const claro = t === "light" || (!t && matchMedia("(prefers-color-scheme: light)").matches);
      m.content = claro ? "#f5f3fb" : "#13102e";
    });
  };
  b.onclick = () => {
    const sig = { "": "light", light: "dark", dark: "" }[document.documentElement.dataset.theme || ""];
    if (sig) document.documentElement.dataset.theme = sig; else delete document.documentElement.dataset.theme;
    try { sig ? localStorage.setItem("filora.tema", sig) : localStorage.removeItem("filora.tema"); } catch (e) {}
    pintar();
  };
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", pintar);
  pintar();
})();

// ---------------------------------------------------------------- app instalable (PWA)
if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// ---------------------------------------------------------------- arranque
(async function init() {
  try {
    await loadAll();
    render();
  } catch (e) {
    $("#view").innerHTML = STATIC
      ? `<div class="empty"><div class="h2">No se han podido cargar los datos</div>Prueba a recargar la página.<br><span class="dim">${esc(e.message)}</span></div>`
      : `<div class="empty"><div class="h2">No puedo conectar con la app</div>Arranca el servidor con <code>Iniciar.bat</code> (o <code>python server.py</code>) y recarga.<br><span class="dim">${esc(e.message)}</span></div>`;
  }
})();

// Notas de una película en FilmAffinity, Letterboxd, Rotten Tomatoes y SensaCine,
// leídas de sus páginas públicas (IMDb no deja: su nota sale de sus datos oficiales).
// Cada web se consulta a la vez y con un límite de tiempo; si una falla, se omite.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";
const num = (s) => (s == null ? null : +String(s).replace(",", "."));

async function pagina(url, intentos = 2) {
  for (let i = 1; ; i++) {
    try { return await pagina1(url); } catch (e) { if (i >= intentos) throw e; await new Promise((r) => setTimeout(r, 1200)); }
  }
}
async function pagina1(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

export function leerFA(h) {
  const v = /itemprop="ratingValue" content="([\d.,]+)"/.exec(h) || /id="movie-rat-avg"[^>]*>\s*([\d.,]+)/.exec(h);
  const n = /itemprop="ratingCount" content="(\d+)"/.exec(h) || /id="movie-count-rat"[^>]*>[^\d]*([\d.]+)/.exec(h);
  return v ? { v: num(v[1]), n: n ? +n[1].replace(/\./g, "") : null } : null;
}
export function leerLB(h) {
  const v = /"ratingValue":([\d.]+)/.exec(h);
  const n = /"ratingCount":(\d+)/.exec(h);
  return v ? { v: Math.round(num(v[1]) * 100) / 100, n: n ? +n[1] : null } : null;
}
export function leerRT(h) {
  const c = /"criticsScore":\{[^}]*?"score":"(\d+)"/.exec(h);
  const p = /"audienceScore":\{[^}]*?"score":"(\d+)"/.exec(h);
  return c || p ? { critica: c ? +c[1] : null, publico: p ? +p[1] : null } : null;
}
export function leerSC(h) {
  // en la cabecera de la ficha: «Medios 3,9 … Usuarios 4,4 …»
  const t = h.slice(0, 400000).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = /\bMedios (\d,\d)\b/.exec(t), u = /\bUsuarios (\d,\d)\b/.exec(t);
  return m || u ? { prensa: m ? num(m[1]) : null, usuarios: u ? num(u[1]) : null } : null;
}

const limpio = (s, rx) => (s && rx.test(s) ? s : null);

export async function notasExternas({ fa, lb, rt, ac }) {
  fa = limpio(fa, /^\d{3,7}$/); lb = limpio(lb, /^[a-z0-9-]{1,120}$/); rt = limpio(rt, /^m\/[a-z0-9_-]{1,120}$/); ac = limpio(ac, /^\d{2,10}$/);
  const tareas = {
    fa: fa && pagina(`https://www.filmaffinity.com/es/film${fa}.html`).then(leerFA),
    lb: lb && pagina(`https://letterboxd.com/film/${lb}/`).then(leerLB),
    rt: rt && pagina(`https://www.rottentomatoes.com/${rt}`).then(leerRT),
    sc: ac && pagina(`https://www.sensacine.com/peliculas/pelicula-${ac}/`).then(leerSC),
  };
  const out = {};
  await Promise.all(Object.entries(tareas).map(async ([k, t]) => {
    if (!t) return;
    try { const v = await t; if (v) out[k] = v; } catch (e) { /* esa web no responde: se omite */ }
  }));
  out.completo = Object.entries(tareas).every(([k, t]) => !t || out[k]);
  return out;
}

// Póster desde el buscador público de IMDb (sin clave). Con id IMDb es exacto; si no, busca
// por título y se queda con la película del año más cercano. Devuelve { poster, imdb } o {}.
export function elegirPosterImdb(d, { imdb, anio } = {}) {
  const pelis = (d || []).filter((x) => x.i && x.i.imageUrl && /^tt/.test(x.id || "") && (!x.qid || /movie|tvMovie|short|video/i.test(x.qid)));
  const m = (imdb && pelis.find((x) => x.id === imdb)) || (!imdb && pelis.find((x) => !anio || !x.y || Math.abs(x.y - anio) <= 1));
  if (!m) return {};
  return { poster: m.i.imageUrl.replace(/\._V1_.*\.jpg$/, "._V1_SX342.jpg"), imdb: m.id };
}
export async function posterImdb({ imdb, titulo, anio } = {}) {
  const q = imdb && /^tt\d+$/.test(imdb) ? imdb : String(titulo || "").trim().toLowerCase().slice(0, 80);
  if (!q) return {};
  const r = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(q)}.json`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) return {};
  return elegirPosterImdb((await r.json()).d, { imdb: imdb && /^tt\d+$/.test(imdb) ? imdb : null, anio: anio ? +anio : null });
}

// Buscador de IMDb: entiende títulos en español aunque no sean exactos ("crepusculo amanecer parte 2").
export function limpiarImdb(d) {
  return (d || []).filter((x) => /^tt/.test(x.id || "") && (!x.qid || /movie|tvMovie|short|video/i.test(x.qid))).slice(0, 8).map((x) => ({
    imdb: x.id, titulo: x.l, anio: x.y || null, reparto: x.s || "",
    poster: x.i && x.i.imageUrl ? x.i.imageUrl.replace(/\._V1_.*\.jpg$/, "._V1_SX342.jpg") : null,
  }));
}
const OFICIOS = { Director: "Dirección", Actor: "Actor", Actress: "Actriz", Writer: "Guion", Producer: "Producción", Composer: "Música", Cinematographer: "Fotografía", Editor: "Montaje" };
export function personasImdb(d) {
  return (d || []).filter((x) => /^nm/.test(x.id || "")).slice(0, 8).map((x) => {
    const [oficio, ...obra] = String(x.s || "").split(", ");
    return { imdb: x.id, nombre: x.l, desc: [OFICIOS[oficio] || oficio, obra.join(", ")].filter(Boolean).join(" · "),
      foto: x.i && x.i.imageUrl ? x.i.imageUrl.replace(/\._V1_.*\.jpg$/, "._V1_UX240.jpg") : null };
  });
}
async function sugerenciasImdb(q) {
  q = String(q || "").trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return [];
  const r = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(q)}.json`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
  return r.ok ? (await r.json()).d || [] : [];
}
export async function buscarImdb(q) { return limpiarImdb(await sugerenciasImdb(q)); }
// películas y personas a la vez (buscador de la web)
export async function buscarTodoImdb(q) { const d = await sugerenciasImdb(q); return { pelis: limpiarImdb(d), personas: personasImdb(d) }; }

// Taquilla y presupuesto desde Box Office Mojo (mismo lector que tools/taquilla.py).
export function leerTaquilla(h) {
  const decod = (s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const t = decod(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const num = (rx) => { const m = rx.exec(t); return m ? +m[1].replace(/[^\d]/g, "") : null; };
  const out = {
    domestica: num(/All Releases Domestic (?:\( ?[\d.<–-]+% ?\) )?(\$[\d,]+)/),
    internacional: num(/International (?:\( ?[\d.<–-]+% ?\) )?(\$[\d,]+)/),
    mundial: num(/Worldwide (\$[\d,]+)/),
    apertura: num(/Domestic Opening (\$[\d,]+)/),
    presupuesto: num(/Budget (\$[\d,]+)/),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}
export async function taquillaImdb(imdb) {
  if (!/^tt\d+$/.test(imdb || "")) return {};
  const r = await fetch(`https://www.boxofficemojo.com/title/${imdb}/`, { headers: { "User-Agent": UA, "Accept-Language": "en-US" }, signal: AbortSignal.timeout(8000) });
  return r.ok ? leerTaquilla(await r.text()) : {};
}

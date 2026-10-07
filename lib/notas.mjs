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

/* ============================================================
   Filora · notas de otras webs, premios e importación desde otras webs
   (se carga después de app.js y usa sus utilidades)
   ============================================================ */

// Dirección de la web publicada: la app del PC también le pide a ella las notas.
const WEB_FILORA = () => (STATIC ? "" : ((S.db && S.db.config && S.db.config.web) || "https://filora-umber.vercel.app").replace(/\/$/, ""));

// Pequeña caché en este dispositivo (no gasta nada del almacenamiento de la web).
function cacheLeer(clave, dias) {
  try {
    const x = JSON.parse(localStorage.getItem("filora.x." + clave) || "null");
    return x && Date.now() - x.t < dias * 864e5 ? x.v : null;
  } catch (e) { return null; }
}
function cacheGuardar(clave, v, caduca = 0) {
  // caduca > 0: guarda como si fuera más antiguo para que dure menos (respuestas incompletas)
  try { localStorage.setItem("filora.x." + clave, JSON.stringify({ t: Date.now() - caduca, v })); } catch (e) { /* lleno o sin permiso */ }
}

// ---------------------------------------------------------------- notas en otras webs
async function notaIMDb(tt) {
  if (!/^tt\d+$/.test(tt || "")) return null;
  const r = await fetch(`${WEB_FILORA()}/data/imdb/${tt.slice(-2)}.json`);
  if (!r.ok) return null;
  const d = (await r.json())[tt];
  return d ? { v: d[0], n: d[1] } : null;
}
async function notasDe(p) {
  const ids = p.ids || {};
  const clave = "notas." + (ids.imdb || ids.wikidata || norm(p.titulo));
  const hit = cacheLeer(clave, 5);
  if (hit) return hit;
  const q = new URLSearchParams(Object.entries({ fa: ids.filmaffinity, lb: ids.letterboxd, rt: ids.rt, ac: ids.allocine }).filter(([, v]) => v));
  const [imdb, otras] = await Promise.all([
    notaIMDb(ids.imdb).catch(() => null),
    [...q].length ? fetch(`${WEB_FILORA()}/api/notas?${q}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : {},
  ]);
  const out = { ...otras, ...(imdb ? { imdb } : {}) };
  const falta = [...q.keys()].some((k) => !out[{ fa: "fa", lb: "lb", rt: "rt", ac: "sc" }[k]]);
  if (Object.keys(out).length) cacheGuardar(clave, out, falta ? 4.8 * 864e5 : 0); // incompleta: se reintenta en unas horas
  return out;
}
const votos = (n) => (n == null ? "" : n >= 1e6 ? `${fmt1(n / 1e6)} M votos` : n >= 1e3 ? `${fmtInt(n / 1e3)} mil votos` : `${fmtInt(n)} votos`);
function notasHTML(p, n) {
  const L = Object.fromEntries(extLinks(p).map((l) => [l.n, l]));
  const t = (web, nota, escala, pie) => {
    const l = L[web];
    return `<a class="nota-ext" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="logo" style="background:${l.c}">${l.l}</span>
      <span class="nv"><b>${nota}</b>${escala ? `<small>/${escala}</small>` : ""}</span><span class="np">${pie}</span></a>`;
  };
  const tiles = [];
  if (n.imdb) tiles.push(t("IMDb", fmt1(n.imdb.v), 10, votos(n.imdb.n)));
  if (n.fa) tiles.push(t("FilmAffinity", fmt1(n.fa.v), 10, votos(n.fa.n)));
  if (n.lb) tiles.push(t("Letterboxd", n.lb.v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 5, votos(n.lb.n)));
  if (n.rt && n.rt.critica != null) tiles.push(t("Rotten Tomatoes", `${n.rt.critica}%`, "", `Crítica${n.rt.publico != null ? ` · público ${n.rt.publico}%` : ""}`));
  else if (n.rt && n.rt.publico != null) tiles.push(t("Rotten Tomatoes", `${n.rt.publico}%`, "", "Público"));
  if (n.sc) tiles.push(t("SensaCine", fmt1(n.sc.prensa ?? n.sc.usuarios), 5, n.sc.prensa != null ? `Prensa${n.sc.usuarios != null ? ` · usuarios ${fmt1(n.sc.usuarios)}` : ""}` : "Usuarios"));
  return tiles.length ? `<div class="sub">Notas en otras webs</div><div class="notas-ext">${tiles.join("")}</div>` : "";
}

// ---------------------------------------------------------------- premios (Wikidata)
const FAMILIAS = [
  ["oscar", "Óscar", /óscar|oscar|academy award/],
  ["goya", "Goya", /\bgoya\b/],
  ["globo", "Globo de Oro", /globo de oro|golden globe/],
  ["bafta", "BAFTA", /bafta|british academy film/],
  ["cannes", "Cannes", /cannes|palma de oro|palme d.or/],
  ["venecia", "Venecia", /venecia|venice|le[oó]n de oro|golden lion|copa volpi/],
  ["berlin", "Berlín", /berl[ií]n|oso de (oro|plata)|(golden|silver) bear/],
  ["sansebastian", "San Sebastián", /san sebasti[aá]n|concha de oro/],
  ["cesar", "César", /\bc[ée]sar\b/],
  ["europeo", "Cine Europeo", /cine europeo|european film award/],
  ["critics", "Critics' Choice", /critics.? choice/],
  ["sag", "Sindicato de Actores", /screen actors guild|sindicato de actores/],
  ["annie", "Annie", /\bannie\b/],
  ["saturn", "Saturn", /\bsaturn\b/],
];
const ICONOS_PREMIO = {
  oscar: '<circle cx="12" cy="4.4" r="1.9"/><path d="M10.4 7h3.2l-.4 3.6.9 1-1 5.4h-2.2l-1-5.4.9-1z"/><path d="M8.5 20.5h7M9.5 18h5"/>',
  goya: '<circle cx="12" cy="7" r="3.2"/><path d="M7 19.5c0-4 2.2-6.4 5-6.4s5 2.4 5 6.4"/><path d="M6 20.5h12"/>',
  globo: '<circle cx="12" cy="9.5" r="6"/><path d="M6 9.5h12M12 3.5c2.2 2 2.2 10 0 12M12 3.5c-2.2 2-2.2 10 0 12"/><path d="M12 15.5v3M8.5 20.5h7"/>',
  bafta: '<path d="M5 4.5c4.5 2 9.5 2 14 0v6.5c0 4.3-3.1 8.5-7 8.5s-7-4.2-7-8.5z"/><path d="M8.5 10h2.2M13.3 10h2.2M9.5 14.5c1.6 1.1 3.4 1.1 5 0"/>',
  cannes: '<path d="M12 21V10"/><path d="M12 10C9.5 6.5 6 6 3.5 7c3 .2 6 1.3 8.5 3zM12 10c2.5-3.5 6-4 8.5-3-3 .2-6 1.3-8.5 3zM12 10c-.6-3-2.4-5.3-5.5-6.5 2.2 1.9 4 4 5.5 6.5zM12 10c.6-3 2.4-5.3 5.5-6.5-2.2 1.9-4 4-5.5 6.5z"/>',
  laurel: '<path d="M8 20C4 17 3 11 6 6M16 20c4-3 5-9 2-14"/><path d="M6.6 15.6l-2.3.4M5.6 11.6l-2.2-.6M6.2 8 4.6 6.4M17.4 15.6l2.3.4M18.4 11.6l2.2-.6M17.8 8l1.6-1.6"/><path d="M9.5 20.5h5"/>',
};
const iconoPremio = (f) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_PREMIO[f] || ICONOS_PREMIO.laurel}</svg>`;

async function premiosDe(p) {
  const q = (p.ids || {}).wikidata;
  if (!/^Q\d+$/.test(q || "")) return null;
  const hit = cacheLeer("premios." + q, 30);
  if (hit) return hit;
  const sparql = `SELECT ?premio ?premioLabel ?fecha ?tipo WHERE {
    { wd:${q} p:P166 ?s . ?s ps:P166 ?premio . BIND("g" AS ?tipo) } UNION { wd:${q} p:P1411 ?s . ?s ps:P1411 ?premio . BIND("n" AS ?tipo) }
    OPTIONAL { ?s pq:P585 ?fecha }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } }`;
  const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sparql));
  if (!r.ok) return null;
  const filas = (await r.json()).results.bindings;
  const lista = [];
  const visto = new Set();
  for (const b of filas) {
    const nombre = b.premioLabel.value;
    if (/^Q\d+$/.test(nombre)) continue;
    const fam = FAMILIAS.find(([, , rx]) => rx.test(nombre.toLowerCase()));
    if (!fam) continue;
    const anio = b.fecha ? +b.fecha.value.slice(0, 4) : null;
    const k = `${b.premio.value}|${anio}|${b.tipo.value}`;
    if (visto.has(k)) continue;
    visto.add(k);
    lista.push({ f: fam[0], n: nombre, a: anio, g: b.tipo.value === "g" });
  }
  cacheGuardar("premios." + q, lista);
  return lista;
}
function premiosHTML(lista) {
  if (!lista || !lista.length) return "";
  const grupos = FAMILIAS.map(([f, nombre]) => {
    const L = lista.filter((x) => x.f === f);
    if (!L.length) return null;
    const ganados = [...new Map(L.filter((x) => x.g).map((x) => [x.n, x])).values()];
    const nominaciones = new Set(L.map((x) => x.n)).size;
    return { f, nombre, ganados, nominaciones };
  }).filter(Boolean);
  if (!grupos.length) return "";
  const icono = (f) => iconoPremio(["oscar", "goya", "globo", "bafta", "cannes"].includes(f) ? f : "laurel");
  const resumen = grupos.map((g) => `<div class="premio ${g.ganados.length ? "gana" : ""}"><span class="pi">${icono(g.f)}</span><div>
      <b>${g.ganados.length ? `${g.ganados.length} ${g.nombre}` : g.nombre}</b>
      <span>${g.ganados.length ? (g.nominaciones > g.ganados.length ? `de ${g.nominaciones} nominaciones` : g.ganados.length === 1 ? "ganado" : "ganados") : `${g.nominaciones} ${g.nominaciones === 1 ? "nominación" : "nominaciones"}`}</span></div></div>`).join("");
  const detalle = grupos.filter((g) => g.ganados.length).map((g) => g.ganados.map((x) => `<li><span class="pi">${icono(g.f)}</span>${esc(x.n)}${x.a ? ` <span class="dim">${x.a}</span>` : ""}</li>`).join("")).join("");
  return `<div class="sub">Premios</div><div class="premios">${resumen}</div>${detalle ? `<details class="premios-det"><summary>Ver los premios ganados</summary><ul>${detalle}</ul></details>` : ""}`;
}

// Rellena la ficha abierta cuando llegan las notas y los premios.
async function cargarExtras(p) {
  const box = document.getElementById("fExtras");
  if (!box) return;
  const [n, pr] = await Promise.all([notasDe(p).catch(() => ({})), premiosDe(p).catch(() => null)]);
  if (!document.body.contains(box)) return;
  const html = notasHTML(p, n || {}) + premiosHTML(pr);
  box.innerHTML = html;
  box.classList.toggle("vacio", !html);
}

// ---------------------------------------------------------------- importar desde otras webs
function leerCSV(texto) {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  texto = texto.replace(/^﻿/, "");
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') comillas = false; else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === "," || c === ";" && !texto.slice(0, 2000).includes(",")) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && texto[i + 1] === "\n") i++; fila.push(campo); filas.push(fila); fila = []; campo = ""; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = (filas.shift() || []).map((h) => h.trim());
  return filas.filter((f) => f.some((x) => x.trim())).map((f) => Object.fromEntries(cab.map((h, i) => [h, (f[i] || "").trim()])));
}
const col = (o, ...nombres) => { for (const n of nombres) for (const k of Object.keys(o)) if (k.toLowerCase() === n.toLowerCase() && o[k]) return o[k]; return ""; };
const generosDesde = (txt) => {
  const out = [];
  for (const g of String(txt || "").toLowerCase().split(/[,|/]/)) for (const [rx, n] of WD_GEN) if (rx.test(g.trim()) && !out.includes(n)) out.push(n);
  return out.slice(0, 3);
};

async function cargarJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = ok; s.onerror = () => mal(new Error("No se ha podido abrir el .zip (sin conexión)"));
    document.head.appendChild(s);
  });
  return window.JSZip;
}

// Letterboxd: el .zip de «Export your data» (o sus .csv sueltos)
async function leerLetterboxd(archivos) {
  const csv = {};
  for (const f of archivos) {
    if (/\.zip$/i.test(f.name)) {
      const zip = await (await cargarJSZip()).loadAsync(f);
      for (const [nombre, e] of Object.entries(zip.files)) if (!e.dir && /\.csv$/i.test(nombre) && !nombre.includes("/")) csv[nombre.toLowerCase()] = await e.async("string");
    } else csv[f.name.toLowerCase()] = await f.text();
  }
  const k = (n, a) => `${norm(n)}|${a || ""}`;
  const pelis = new Map();
  const toma = (r) => {
    const n = col(r, "Name"), a = +col(r, "Year") || null;
    if (!n) return null;
    if (!pelis.has(k(n, a))) pelis.set(k(n, a), { titulo: n, tituloOriginal: n, anio: a, nota: null, origen: "letterboxd" });
    return pelis.get(k(n, a));
  };
  for (const r of leerCSV(csv["watched.csv"] || "")) toma(r);
  for (const r of leerCSV(csv["ratings.csv"] || "")) { const p = toma(r); const v = parseFloat(col(r, "Rating")); if (p && v) p.nota = Math.round(v * 2 * 10) / 10; }
  for (const r of leerCSV(csv["diary.csv"] || "")) {
    const p = toma(r); if (!p) continue;
    const d = col(r, "Watched Date") || col(r, "Date");
    if (d && (!p.fechaVisto || d > p.fechaVisto)) p.fechaVisto = d;
    const v = parseFloat(col(r, "Rating")); if (v && p.nota == null) p.nota = v * 2;
  }
  for (const r of leerCSV(csv["reviews.csv"] || "")) { const p = toma(r); const t = col(r, "Review"); if (p && t) p.resena = t.slice(0, 4000); }
  const pendientes = leerCSV(csv["watchlist.csv"] || "").map((r) => ({ titulo: col(r, "Name"), anio: +col(r, "Year") || null, motivo: "De tu lista de Letterboxd" })).filter((w) => w.titulo);
  if (!pelis.size && !pendientes.length) throw new Error("No encuentro películas: sube el .zip que descarga Letterboxd en Settings → Data → Export your data");
  return { peliculas: [...pelis.values()], series: [], pendientes };
}

// IMDb: «Your ratings» (o la lista de seguimiento) exportada en .csv
async function leerIMDb(archivos) {
  const out = { peliculas: [], series: [], pendientes: [] };
  for (const f of archivos) {
    const filas = leerCSV(await f.text());
    if (!filas.length || !col(filas[0], "Const")) throw new Error("Ese archivo no parece una exportación de IMDb (falta la columna Const)");
    const conNota = filas.some((r) => col(r, "Your Rating"));
    for (const r of filas) {
      const tipo = col(r, "Title Type").toLowerCase();
      const base = { titulo: col(r, "Title"), tituloOriginal: col(r, "Original Title") || col(r, "Title"), anio: +col(r, "Year") || null, ids: { imdb: col(r, "Const") } };
      if (!base.titulo || /episode|episodio|video game/.test(tipo)) continue;
      if (!conNota) { out.pendientes.push({ titulo: base.titulo, anio: base.anio, motivo: "De tu lista de IMDb" }); continue; }
      const nota = +col(r, "Your Rating") || null;
      if (/series|serie/.test(tipo)) out.series.push({ titulo: base.titulo, anios: base.anio ? String(base.anio) : "", nota, tipo: "Serie", ids: base.ids, resena: "" });
      else out.peliculas.push({ ...base, nota, duracion: +col(r, "Runtime (mins)") || null, director: col(r, "Directors").split(",").slice(0, 3).map((x) => x.trim()).join(" / "),
        generos: generosDesde(col(r, "Genres")), fechaVisto: col(r, "Date Rated") || null, origen: "imdb" });
    }
  }
  return out;
}

// Cualquier otra web: un .csv con título, año y nota (de 0 a 10, o de 0 a 5 si todas lo son)
async function leerCSVGenerico(archivos) {
  const filas = (await Promise.all(archivos.map((f) => f.text()))).flatMap(leerCSV);
  const pelis = filas.map((r) => ({ titulo: col(r, "titulo", "título", "title", "name", "nombre"), anio: +col(r, "año", "anio", "year") || null,
    nota: parseFloat(String(col(r, "nota", "rating", "puntuación", "puntuacion", "your rating", "score")).replace(",", ".")) || null, origen: "csv" })).filter((p) => p.titulo);
  if (!pelis.length) throw new Error("No encuentro películas: el .csv necesita al menos una columna «título»");
  if (pelis.every((p) => p.nota == null || p.nota <= 5)) for (const p of pelis) if (p.nota != null) p.nota *= 2;
  return { peliculas: pelis, series: [], pendientes: [] };
}

// Completa carátula, director, país, géneros e ids con Wikidata y Wikipedia.
async function completarLote(pelis, avance) {
  const conImdb = pelis.filter((p) => p.ids && p.ids.imdb);
  for (let i = 0; i < conImdb.length; i += 60) {
    const trozo = conImdb.slice(i, i + 60);
    const sparql = `SELECT ?imdb ?item ?enwiki ?fa ?rt ?lb ?tmdb ?ac ?dur ?pais ?paisLabel (GROUP_CONCAT(DISTINCT ?genLabel; separator="|") AS ?gens) WHERE {
      VALUES ?imdb { ${trozo.map((p) => `"${p.ids.imdb}"`).join(" ")} } ?item wdt:P345 ?imdb .
      OPTIONAL { ?enwiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
      OPTIONAL { ?item wdt:P480 ?fa } OPTIONAL { ?item wdt:P1258 ?rt } OPTIONAL { ?item wdt:P6127 ?lb } OPTIONAL { ?item wdt:P4947 ?tmdb } OPTIONAL { ?item wdt:P1265 ?ac }
      OPTIONAL { ?item wdt:P2047 ?dur } OPTIONAL { ?item wdt:P495 ?pais . ?pais rdfs:label ?paisLabel FILTER(lang(?paisLabel)="es") }
      OPTIONAL { ?item wdt:P136 ?g . ?g rdfs:label ?genLabel FILTER(lang(?genLabel) IN ("es","en")) }
    } GROUP BY ?imdb ?item ?enwiki ?fa ?rt ?lb ?tmdb ?ac ?dur ?pais ?paisLabel`;
    try {
      const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sparql));
      const filas = (await r.json()).results.bindings;
      const porImdb = {};
      for (const b of filas) if (!porImdb[b.imdb.value]) porImdb[b.imdb.value] = b;
      const wiki = {};
      for (const p of trozo) {
        const b = porImdb[p.ids.imdb];
        if (!b) continue;
        const v = (x) => b[x] && b[x].value;
        Object.assign(p.ids, Object.fromEntries(Object.entries({ wikidata: v("item")?.split("/").pop(), filmaffinity: v("fa"), rt: v("rt"), letterboxd: v("lb"), tmdb: v("tmdb"), allocine: v("ac") }).filter(([, x]) => x)));
        if (!p.pais && v("paisLabel")) p.pais = v("paisLabel");
        if (!p.duracion && v("dur")) p.duracion = Math.round(+v("dur"));
        if (!(p.generos || []).length && v("gens")) p.generos = generosDesde(v("gens").replace(/\|/g, ","));
        if (v("enwiki")) wiki[decodeURIComponent(v("enwiki").split("/wiki/")[1]).replace(/_/g, " ")] = p;
      }
      const titulos = Object.keys(wiki);
      for (let j = 0; j < titulos.length; j += 50) {
        const d = await wdApi({ action: "query", titles: titulos.slice(j, j + 50).join("|"), prop: "pageimages", piprop: "thumbnail", pithumbsize: "342", pilicense: "any", redirects: "1" }, "en.wikipedia.org");
        const q2 = d.query || {};
        const atras = Object.fromEntries([...(q2.redirects || []), ...(q2.normalized || [])].map((x) => [x.to, x.from]));
        for (const pg of Object.values(q2.pages || {})) {
          const p = wiki[pg.title] || wiki[atras[pg.title]] || wiki[atras[atras[pg.title]]];
          if (p && pg.thumbnail && !p.poster) p.poster = pg.thumbnail.source.split("?")[0];
        }
      }
    } catch (e) { /* Wikidata ocupado: se quedan con lo que traían */ }
    avance(Math.min(i + 60, conImdb.length), pelis.length);
  }
  // sin id de IMDb (Letterboxd, CSV): búsqueda por título, de 4 en 4
  const resto = pelis.filter((p) => !(p.ids && p.ids.wikidata));
  let hechas = conImdb.length;
  const cola = [...resto];
  await Promise.all([0, 1, 2, 3].map(async () => {
    for (let p = cola.shift(); p; p = cola.shift()) {
      try {
        const res = await wikiBuscar(p.tituloOriginal || p.titulo);
        const m = res.find((r) => !p.anio || !r.anio || Math.abs(r.anio - p.anio) <= 1);
        if (m) {
          p.ids = { ...(p.ids || {}), ...m.ids };
          for (const k of ["director", "pais", "duracion", "poster"]) if (!p[k] && m[k]) p[k] = m[k];
          if (m.titulo) p.titulo = m.titulo;
          if (!(p.generos || []).length) p.generos = m.generos;
        }
      } catch (e) { /* se queda como está */ }
      avance(++hechas, pelis.length);
    }
  }));
}

const idCliente = (pre) => { const d = new Date().toISOString().replace(/\D/g, "").slice(0, 14); return `${pre}${d}${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`; };

function openImportar() {
  if (ro()) return openLogin("crear");
  const fuente = (id, logo, color, nombre, pasos, accept) => `<div class="imp-fuente">
      <div class="imp-cab"><span class="logo" style="background:${color}">${logo}</span><b>${nombre}</b></div>
      <p class="muted">${pasos}</p>
      ${accept ? `<label class="btn" style="cursor:pointer">${icon("upload")}Elegir archivo<input type="file" data-imp="${id}" accept="${accept}" multiple hidden></label>` : ""}</div>`;
  modal(`<div class="sheet-body"><div class="eyebrow">Importar</div><h2 class="h2" style="margin:6px 0 8px">Trae tus películas de otras webs</h2>
    <p class="muted" style="margin:0 0 18px">Ninguna de estas webs deja conectar tu cuenta directamente, pero casi todas te dejan descargar tus notas en un archivo. Súbelo aquí y Filora añade lo que te falte (sin duplicar) y le pone carátula y datos.</p>
    <div id="impPaso">
    ${fuente("lb", "LB", "#202830", "Letterboxd", "En letterboxd.com: tu perfil → <b>Settings</b> → <b>Data</b> → <b>Export your data</b>. Sube el <b>.zip</b> tal cual: trae tus notas (de 5 estrellas pasan a 10), reseñas, fechas y tu watchlist como pendientes.", ".zip,.csv")}
    ${fuente("imdb", "IMDb", "#c9a200", "IMDb", "En imdb.com: tu perfil → <b>Your ratings</b> → menú <b>⋯</b> → <b>Export</b>. Recibirás un <b>.csv</b> (desde la sección de exportaciones de tu cuenta). Las series van a Series y tu watchlist, exportada igual, a Pendientes.", ".csv")}
    ${fuente("csv", "CSV", "#4b4573", "Otra web u hoja de cálculo", "Un <b>.csv</b> con columnas <b>título</b>, <b>año</b> y <b>nota</b> (de 0 a 10, o de 0 a 5).", ".csv")}
    ${fuente("", "FA", "#1d4d8c", "FilmAffinity", "FilmAffinity no permite descargar tus votaciones. Puedes copiarlas a una hoja de cálculo (título, año, nota), guardarla como .csv y subirla en la opción de arriba.", "")}
    ${fuente("", "RT", "#d8321f", "Rotten Tomatoes y SensaCine", "No guardan tus notas en un formato descargable, así que no se pueden importar.", "")}
    </div></div>`, "narrow");
  document.querySelectorAll("[data-imp]").forEach((inp) => (inp.onchange = () => importarArchivos(inp.dataset.imp, [...inp.files])));
}

async function importarArchivos(tipo, archivos) {
  const paso = $("#impPaso");
  const estado = (html) => (paso.innerHTML = html);
  try {
    estado(`<p class="muted">Leyendo el archivo…</p>`);
    const datos = await ({ lb: leerLetterboxd, imdb: leerIMDb, csv: leerCSVGenerico }[tipo])(archivos);
    // fuera lo que ya tienes
    const clave = (p) => `${norm(p.tituloOriginal || p.titulo)}|${p.anio || ""}`;
    const tengo = new Set(S.db.peliculas.flatMap((p) => [p.ids && p.ids.imdb, `${norm(p.titulo)}|${p.anio || ""}`, `${norm(p.tituloOriginal)}|${p.anio || ""}`]).filter(Boolean));
    const pelis = datos.peliculas.filter((p) => !(p.ids && tengo.has(p.ids.imdb)) && !tengo.has(clave(p)) && !tengo.has(`${norm(p.titulo)}|${p.anio || ""}`));
    const tengoS = new Set(S.db.series.flatMap((s) => [s.ids && s.ids.imdb, norm(s.titulo)]).filter(Boolean));
    const series = datos.series.filter((s) => !tengoS.has(s.ids && s.ids.imdb) && !tengoS.has(norm(s.titulo)));
    const tengoW = new Set([...S.db.pendientes, ...S.db.peliculas].map((w) => norm(w.titulo)));
    const pend = datos.pendientes.filter((w) => !tengoW.has(norm(w.titulo)));
    const ya = datos.peliculas.length - pelis.length;
    if (!pelis.length && !series.length && !pend.length) return estado(`<div class="empty" style="padding:24px 0"><div class="h2">Ya lo tienes todo</div>Las ${fmtInt(datos.peliculas.length)} películas del archivo ya estaban en tu colección.</div>`);
    estado(`<div class="imp-resumen"><div><b>${fmtInt(pelis.length)}</b> películas nuevas</div>${series.length ? `<div><b>${fmtInt(series.length)}</b> series</div>` : ""}${pend.length ? `<div><b>${fmtInt(pend.length)}</b> pendientes</div>` : ""}${ya ? `<div class="dim">${fmtInt(ya)} ya estaban</div>` : ""}</div>
      <button class="btn btn-primary" id="impOk" style="width:100%;justify-content:center">${icon("upload")}Importar</button>`);
    $("#impOk").onclick = async () => {
      estado(`<p class="muted" id="impMsg">Buscando carátulas y datos…</p><div class="imp-barra"><span id="impBar"></span></div>`);
      await completarLote(pelis, (n, t) => { const b = $("#impBar"); if (b) b.style.width = `${Math.round((n / Math.max(t, 1)) * 100)}%`; const m = $("#impMsg"); if (m) m.textContent = `Buscando carátulas y datos… ${n} de ${t}`; });
      $("#impMsg").textContent = "Guardando en tu colección…";
      const ahora = new Date().toISOString().slice(0, 19);
      const listo = (x, pre) => ({ ...x, id: idCliente(pre), mod: ahora, "añadido": ahora });
      const nuevo = { peliculas: pelis.map((p) => listo({ ids: {}, taquilla: {}, generos: [], ...p }, "p")), series: series.map((s) => listo(s, "s")), pendientes: pend.map((w) => listo(w, "w")) };
      if (STATIC) {
        for (let i = 0; i < Math.max(nuevo.peliculas.length, 1); i += 400) await api("sync", { method: "POST", body: { peliculas: nuevo.peliculas.slice(i, i + 400), series: i ? [] : nuevo.series, pendientes: i ? [] : nuevo.pendientes } });
      } else {
        for (const [col, L] of Object.entries(nuevo)) for (const x of L) { const { id, mod, ...resto } = x; await api(col, { method: "POST", body: resto }); }
      }
      await refreshDB();
      closeModal(); render();
      toast(`Importadas ${fmtInt(pelis.length)} películas${series.length ? `, ${fmtInt(series.length)} series` : ""}${pend.length ? ` y ${fmtInt(pend.length)} pendientes` : ""}`, "upload");
    };
  } catch (e) {
    estado(`<div class="empty" style="padding:20px 0"><div class="h2">No se ha podido importar</div>${esc(e.message || "Error al leer el archivo")}</div><button class="btn" onclick="openImportar()">Volver</button>`);
  }
}

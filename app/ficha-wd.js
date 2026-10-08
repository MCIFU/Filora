/* ============================================================
   Filora · página de información de cualquier película (también las que no has visto)
   y filmografías rápidas para las páginas de persona. Datos de Wikidata y Wikipedia.
   ============================================================ */

// entidades de Wikidata por lotes de 50, varias peticiones a la vez y con caché en memoria
const CACHE_WD = new Map();
async function entidadesWD(ids, props = "labels|claims|sitelinks", sitefilter = "enwiki|eswiki") {
  const faltan = [...new Set(ids)].filter((q) => /^Q\d+$/.test(q) && !CACHE_WD.has(q + props));
  const lotes = [];
  for (let i = 0; i < faltan.length; i += 50) lotes.push(faltan.slice(i, i + 50));
  await Promise.all(lotes.map(async (L) => {
    try {
      const d = await wdApi({ action: "wbgetentities", ids: L.join("|"), props, languages: "es|en", sitefilter });
      for (const [q, e] of Object.entries(d.entities || {})) CACHE_WD.set(q + props, e);
    } catch (e) { /* sin conexión */ }
  }));
  return Object.fromEntries([...new Set(ids)].map((q) => [q, CACHE_WD.get(q + props)]).filter(([, e]) => e));
}
const etiqueta = (e) => (e && e.labels && (e.labels.es || e.labels.en || {}).value) || "";
const valores = (e, p) => (((e && e.claims) || {})[p] || []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter((v) => v != null);
const idsDe = (e, p) => valores(e, p).map((v) => v.id).filter(Boolean);
const anioDe = (e) => { const t = valores(e, "P577").map((v) => v.time).filter(Boolean).sort()[0]; const m = /[+-](\d{4})/.exec(t || ""); return m ? +m[1] : null; };
async function cartelesWiki(titulos) {
  const out = {}, L = [...new Set(titulos.filter(Boolean))];
  const lotes = [];
  for (let i = 0; i < L.length; i += 50) lotes.push(L.slice(i, i + 50));
  await Promise.all(lotes.map(async (T) => {
    try {
      const d = await wdApi({ action: "query", titles: T.join("|"), prop: "pageimages", piprop: "thumbnail", pithumbsize: "300", pilicense: "any", redirects: "1" }, "en.wikipedia.org");
      const qq = d.query || {}, atras = Object.fromEntries([...(qq.redirects || []), ...(qq.normalized || [])].map((r) => [r.to, r.from]));
      for (const pg of Object.values(qq.pages || {})) if (pg.thumbnail) out[atras[pg.title] || pg.title] = pg.thumbnail.source.split("?")[0];
    } catch (e) { /* sin carteles */ }
  }));
  return out;
}
const fotoCommons = (f, w = 300) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=${w}`;

// ---------------------------------------------------------------- filmografía rápida (con caché de 7 días)
// Una consulta mínima a Wikidata (sin etiquetas: es lo lento) y luego los datos en paralelo.
async function filmografiaRapida(q) {
  const k = "filmo2." + q;
  const hit = cacheLeer(k, 7);
  if (hit) return hit;
  // 1) qué películas (consulta mínima: medio segundo)
  const filas = await sparqlWD(`SELECT ?f ?rol WHERE {
    { ?f wdt:P57 wd:${q} . BIND("Dirección" AS ?rol) } UNION { ?f wdt:P161 wd:${q} . BIND("Reparto" AS ?rol) } UNION { ?f wdt:P58 wd:${q} . BIND("Guion" AS ?rol) } }`);
  const roles = new Map();
  for (const b of filas) { const f = b.f.value.split("/").pop(); roles.set(f, [...new Set([...(roles.get(f) || []), b.rol.value])]); }
  const ids = [...roles.keys()];
  if (!ids.length) return [];
  // 2) año, IMDb, popularidad y si es película (por lotes de 150) · 3) títulos (en paralelo)
  const tipos = [...WD_FILM].map((x) => "wd:" + x).join(" ");
  const lotes = [];
  for (let i = 0; i < ids.length; i += 150) lotes.push(ids.slice(i, i + 150));
  const [datos, nombres] = await Promise.all([
    Promise.all(lotes.map((L) => sparqlWD(`SELECT ?f (MIN(?a) AS ?anio) (SAMPLE(?i) AS ?imdb) (SAMPLE(?sl) AS ?n) (SAMPLE(?ok) AS ?peli) WHERE { VALUES ?f { ${L.map((x) => "wd:" + x).join(" ")} }
      OPTIONAL { ?f wdt:P577 ?d BIND(YEAR(?d) AS ?a) } OPTIONAL { ?f wdt:P345 ?i } OPTIONAL { ?f wikibase:sitelinks ?sl }
      OPTIONAL { ?f wdt:P31 ?tipo . VALUES ?tipo { ${tipos} } BIND(1 AS ?ok) } } GROUP BY ?f`))).then((r) => r.flat()),
    entidadesWD(ids, "labels|sitelinks", "enwiki"),
  ]);
  const L = [];
  for (const b of datos) {
    if (!b.peli) continue;
    const f = b.f.value.split("/").pop(), e = nombres[f], t = etiqueta(e);
    if (!t) continue;
    L.push({ q: f, t, anio: b.anio ? +b.anio.value : null, roles: roles.get(f), i: b.imdb ? b.imdb.value : null, sl: b.n ? +b.n.value : 0,
      w: (e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title) || null });
  }
  L.sort((a, b) => (b.anio || 0) - (a.anio || 0));
  cacheGuardar(k, L);
  return L;
}

// ---------------------------------------------------------------- página de una película
VIEWS.pelicula = async (v, qs) => {
  const q = qs.get("q");
  if (!/^Q\d+$/.test(q || "")) { v.innerHTML = `<div class="empty"><div class="h2">Película no encontrada</div></div>`; return; }
  v.innerHTML = `<div class="cargando"><span class="bobina"></span>Abriendo la ficha…</div>`;
  const yo = location.hash;
  const e = (await entidadesWD([q], "labels|descriptions|claims|sitelinks", "enwiki|eswiki"))[q];
  if (location.hash !== yo) return;
  if (!e) { v.innerHTML = `<div class="empty"><div class="h2">No se ha podido cargar</div>Comprueba tu conexión.</div>`; return; }
  const dirs = idsDe(e, "P57"), reparto = idsDe(e, "P161").slice(0, 18), guion = idsDe(e, "P58").slice(0, 4), musica = idsDe(e, "P86").slice(0, 2);
  const otros = [...idsDe(e, "P495"), ...idsDe(e, "P136"), ...idsDe(e, "P364")].slice(0, 30);
  if (!idsDe(e, "P31").some((t) => WD_FILM.has(t) || WD_TV.has(t))) { v.innerHTML = `<div class="empty"><div class="h2">Esto no es una película</div>${esc(etiqueta(e))}</div>`; return; }
  // solo los nombres (rápido); las fotos del reparto llegan después
  const refs = await entidadesWD([...dirs, ...reparto, ...guion, ...musica, ...otros], "labels", "enwiki");
  if (location.hash !== yo) return;
  const titulo = etiqueta(e), original = (valores(e, "P1476")[0] || {}).text;
  const anio = anioDe(e), dur = valores(e, "P2047")[0];
  const P = { imdb: "P345", filmaffinity: "P480", rt: "P1258", letterboxd: "P6127", tmdb: "P4947", allocine: "P1265" };
  const ids = { wikidata: q };
  for (const [k, p] of Object.entries(P)) { const x = valores(e, p)[0]; if (x) ids[k] = String(x); }
  const generos = [];
  for (const g of idsDe(e, "P136").map((x) => [etiqueta(refs[x]), ((refs[x] || {}).labels || {}).en?.value || ""].join(" ").toLowerCase())) for (const [rx, n] of WD_GEN) if (rx.test(g) && !generos.includes(n)) generos.push(n);
  const pais = idsDe(e, "P495").map((x) => etiqueta(refs[x])).filter(Boolean);
  const peli = { titulo, tituloOriginal: original || titulo, anio, duracion: dur ? Math.round(+dur.amount) : null, director: dirs.map((x) => etiqueta(refs[x])).filter(Boolean).join(" / "),
    pais: pais[0] || "", generos: generos.slice(0, 3), ids };
  const mia = indiceColeccion()(ids.imdb, titulo);
  const enw = e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title, esw = e.sitelinks && e.sitelinks.eswiki && e.sitelinks.eswiki.title;
  const persona = (x, papel) => { const r = refs[x]; if (!r) return "";
    return `<a class="pe-pers" href="#/persona?q=${x}"><span class="pe-foto" data-pq="${x}"><b>${esc(etiqueta(r).split(" ").map((w) => w[0]).slice(0, 2).join(""))}</b></span><span class="pe-n">${esc(etiqueta(r))}</span>${papel ? `<span class="pe-r">${papel}</span>` : ""}</a>`; };
  peli.poster = enw ? (await cartelesWiki([enw]))[enw] || null : null;
  if (location.hash !== yo) return;
  v.innerHTML = `
  <section class="pe-hero">
    ${peli.poster ? `<div class="ps-fondo" style="background-image:url('${esc(peli.poster)}')"></div>` : ""}
    <div class="pe-hero-in">
      <div class="pe-cartel">${posterHTML(peli)}</div>
      <div>
        <div class="eyebrow">${esc([anio, pais.join(" · ")].filter(Boolean).join(" · "))}</div>
        <h1 class="ps-nombre">${esc(titulo)}</h1>
        ${original && norm(original) !== norm(titulo) ? `<div class="orig" style="margin:-8px 0 12px">${esc(original)}</div>` : ""}
        <div class="facts">${anio ? `<span>${icon("calendar")}${anio}</span>` : ""}${peli.duracion ? `<span>${icon("clock")}${Math.floor(peli.duracion / 60)} h ${peli.duracion % 60} min</span>` : ""}
          ${dirs.length ? `<span>${icon("user")}${dirs.map((x) => `<a href="#/persona?q=${x}" class="pr-persona">${esc(etiqueta(refs[x]))}</a>`).join(", ")}</span>` : ""}</div>
        ${peli.generos.length ? `<div class="chips" style="margin:6px 0 16px">${peli.generos.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>` : ""}
        <div class="pe-acciones">
          ${mia ? `<button class="btn btn-primary" data-open="${mia.id}">${icon("check")}La has visto · ${fmt1(mia.nota)} · abrir tu ficha</button>`
            : ro() ? "" : `<button class="btn btn-primary" id="peVista">${icon("plus")}La he visto</button><button class="btn" id="pePend">${icon("bookmark")}A pendientes</button>`}
        </div>
        ${!mia ? `<div class="pe-pred" id="pePred"></div>` : ""}
      </div>
    </div>
  </section>
  <section class="ps-bio-w"><p class="ps-bio" id="peSin">${esc((e.descriptions && (e.descriptions.es || e.descriptions.en || {}).value) || "")}</p></section>
  <div id="fExtras" class="extras-ficha section"><div class="sub">Notas en otras webs</div><div class="dim cargando-mini">Consultando…</div></div>
  <div class="sub" style="margin-top:22px">Ver en</div>${linksHTML(peli)}
  ${dirs.length || reparto.length ? `<section class="section">${sectionHead("Equipo y reparto")}<div class="pe-equipo">
    ${dirs.map((x) => persona(x, "Dirección")).join("")}${guion.map((x) => persona(x, "Guion")).join("")}${musica.map((x) => persona(x, "Música")).join("")}${reparto.map((x) => persona(x, "")).join("")}</div></section>` : ""}`;
  // sinopsis de Wikipedia
  const tw = esw ? ["es", esw] : enw ? ["en", enw] : null;
  if (tw) fetch(`https://${tw[0]}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tw[1])}`).then((r) => r.json()).then((d) => { const b = $("#peSin"); if (b && d.extract) b.textContent = d.extract; }).catch(() => {});
  // predicción y notas/premios
  if (!mia && S.db.peliculas.length) {
    if (!peli.imdbNota && ids.imdb) try { const r = await notaIMDb(ids.imdb); if (r) peli.imdbNota = [r.v, r.n]; } catch (er) { /* */ }
    const m = predict(peli), box = $("#pePred");
    if (box) box.innerHTML = `${matchTag(m.pct)}<div><div class="lbl">Te encajaría</div><div>Predicción: <b>${fmt1(m.nota)}</b>${m.why.length ? ` · ${esc(m.why[0])}` : ""}</div></div>`;
  }
  cargarExtras(peli);
  // fotos del equipo
  entidadesWD([...dirs, ...guion, ...musica, ...reparto], "claims", "enwiki").then((F) => {
    for (const el of document.querySelectorAll(".pe-foto[data-pq]")) { const f = valores(F[el.dataset.pq], "P18")[0]; if (f) el.innerHTML = `<img src="${fotoCommons(f, 200)}" alt="" loading="lazy" referrerpolicy="no-referrer">`; }
  });
  const vista = $("#peVista"), pend = $("#pePend");
  if (vista) vista.onclick = () => openForm(null, { ...peli, poster: peli.poster });
  if (pend) pend.onclick = async () => { pend.disabled = true; await addPending(peli, "Desde su ficha"); };
};

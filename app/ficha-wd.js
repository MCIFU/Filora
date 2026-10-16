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

// ---------------------------------------------------------------- película aún sin estrenar (FilmAffinity o IMDb)
const estrenoDe = (titulo, original, anio) => ((S.est && S.est.estrenos) || []).find((e) => [norm(e.titulo), norm(e.original)].some((x) => x && (x === norm(titulo) || x === norm(original))) && (!anio || Math.abs(+e.fecha.slice(0, 4) - anio) <= 1));
function paginaProxima(v, f) {
  const fecha = f.fecha && f.fecha > todayISO() ? f.fecha : null;
  const estrenada = !fecha && ((f.enCines && f.enCines.length) || (f.fecha && f.fecha <= todayISO()) || (f.anio && f.anio < new Date().getFullYear()));
  const yaPend = S.db.pendientes.find((w) => norm(w.titulo) === norm(f.titulo) || (f.original && norm(w.tituloOriginal) === norm(f.original)));
  const reparto = Array.isArray(f.reparto) ? f.reparto.map((x) => x.n || x) : String(f.reparto || "").split(/,\s*/).filter(Boolean);
  const peli = { titulo: f.titulo, tituloOriginal: f.original || f.titulo, anio: f.anio || (fecha ? +fecha.slice(0, 4) : null), director: f.director || "", pais: f.pais || "", generos: f.generos || [], duracion: f.duracion || null, poster: f.poster || null, ids: f.ids || {} };
  const m = S.db.peliculas.length ? predict({ ...peli, reparto: reparto.join(", "), fecha: fecha || "" }) : null;
  const credito = (l, val) => (val ? `<div><dt>${l}</dt><dd>${val}</dd></div>` : "");
  v.innerHTML = `
  <section class="pe-hero">
    ${peli.poster ? `<div class="ps-fondo" style="background-image:url('${esc(peli.poster)}')"></div>` : ""}
    <div class="pe-hero-in">
      <div class="pe-cartel">${posterHTML(peli)}</div>
      <div>
        <div class="eyebrow">${estrenada ? (f.enCines && f.enCines.length ? "En cines" : "Estrenada") : "Próximamente"}${peli.pais ? ` · ${esc(peli.pais)}` : ""}</div>
        <h1 class="ps-nombre">${esc(peli.titulo)}</h1>
        ${f.original && norm(f.original) !== norm(f.titulo) ? `<div class="orig" style="margin:-8px 0 12px">${esc(f.original)}</div>` : ""}
        ${estrenada ? (f.enCines && f.enCines.length ? `<div class="px-cuenta en-cines"><b>En cartelera</b><span>${esc(f.enCines.slice(0, 3).join(" · "))} · <a href="#/cartelera">ver sesiones</a></span></div>` : "") : `<div class="px-cuenta"><b>${fecha ? `${fechaLarga(fecha)} ${fecha.slice(0, 4)}` : peli.anio ? `En ${peli.anio}` : "Sin fecha"}</b><span>${fecha ? `Estreno en cines en España · ${faltaPara(fecha)}` : "Fecha de estreno aún sin confirmar"}</span></div>`}
        ${peli.generos.length ? `<div class="chips" style="margin:6px 0 16px">${peli.generos.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>` : ""}
        <div class="pe-acciones">${ro() ? "" : `${estrenada ? `<button class="btn btn-primary" id="pxVista">${icon("plus")}La he visto</button>` : ""}${yaPend ? `<a class="btn" href="#/pendientes">${icon("bookmark")}Ya está en tus pendientes</a>` : `<button class="btn ${estrenada ? "" : "btn-primary"}" id="pxPend">${icon("bookmark")}Guardar en pendientes</button>`}`}</div>
        ${m ? `<div class="pe-pred">${matchTag(m.pct)}<div><div class="lbl">Te encajaría</div><div>Predicción: <b>${fmt1(m.nota)}</b>${m.why.length ? ` · ${esc(m.why[0])}` : ""}</div></div></div>` : ""}
      </div>
    </div>
  </section>
  <div class="pe-cuerpo">
    <div class="pe-main">
      ${f.sinopsis ? `<section><div class="sub">Sinopsis</div><p class="ps-bio pe-sin">${esc(f.sinopsis)}</p></section>` : ""}
      <section>${trailerHTML(peli)}</section>
      ${estrenada ? `<div id="fExtras" class="extras-ficha"><div class="sub">Notas en otras webs</div><div class="dim cargando-mini">Consultando…</div></div>` : ""}
      ${reparto.length ? `<section><div class="sub">Reparto</div><div class="fx-reparto">${reparto.slice(0, 12).map((n) => `<a class="pe-pers" href="#/persona?n=${encodeURIComponent(n)}"><span class="pe-foto"><b>${esc(n.split(" ").map((w) => w[0]).slice(0, 2).join(""))}</b></span><span class="pe-n">${esc(n)}</span></a>`).join("")}</div></section>` : ""}
    </div>
    <aside class="pe-aside">
      <dl class="fx-cred">
        ${credito("Dirección", peli.director ? splitDir(peli.director).map((d) => `<a href="#/persona?n=${encodeURIComponent(d)}">${esc(d)}</a>`).join("<br>") : "")}
        ${credito("Duración", peli.duracion ? durTxt(peli.duracion) : "")}${credito("Estreno", fecha ? `${fechaLarga(fecha)} ${fecha.slice(0, 4)}` : peli.anio || "")}
        ${credito("País", esc(peli.pais))}${credito("Género", esc(peli.generos.join(" · ")))}
      </dl>
      <div class="sub">Ver en</div>${linksHTML(peli)}
    </aside>
  </div>`;
  if (estrenada) cargarExtras(peli);
  const vb = $("#pxVista");
  if (vb) vb.onclick = () => openForm(null, { ...peli });
  const b = $("#pxPend");
  if (b) b.onclick = async () => { b.disabled = true; await addPending({ ...peli, original: f.original, fecha }, fecha ? `Se estrena el ${fechaLarga(fecha)} ${fecha.slice(0, 4)}` : "Próximamente"); VIEWS.pelicula(v, new URLSearchParams(location.hash.split("?")[1] || "")); };
}

// ---------------------------------------------------------------- página de una película
VIEWS.pelicula = async (v, qs) => {
  // estreno de la lista de FilmAffinity
  if (qs.get("fa")) {
    const fa = qs.get("fa");
    const e = ((S.est && S.est.estrenos) || []).find((x) => String(x.fa) === fa);
    const c = typeof carteleraIdx === "function" ? carteleraIdx().get(fa) || carteleraIdx().get(+fa) : null;
    if (e || c) return paginaProxima(v, { ...(c || {}), ...(e || {}), enCines: c ? c.cines.map((x) => x.nombre) : null, ids: { filmaffinity: String(fa) } });
  }
  v.innerHTML = `<div class="cargando"><span class="bobina"></span>Abriendo la ficha…</div>`;
  const yo = location.hash;
  let q = qs.get("q");
  const tt = qs.get("imdb");
  if (!q && tt) {
    const mia0 = S.db.peliculas.find((p) => p.ids && p.ids.imdb === tt);
    if (mia0) { location.hash = "#/coleccion"; setTimeout(() => openFilm(mia0.id), 50); return; }
    try { q = await qPorImdb(tt); } catch (e) { /* sin Wikidata */ }
    if (location.hash !== yo) return;
    if (!q) {
      // sin ficha en Wikidata (lo normal en películas anunciadas): página con lo que saben IMDb y FilmAffinity
      const r = typeof buscarWeb === "function" ? (await buscarWeb(tt)).pelis.find((x) => x.imdb === tt) : null;
      if (location.hash !== yo) return;
      if (r) { const e = estrenoDe(r.titulo, r.titulo, r.anio) || {};
        return paginaProxima(v, { ...e, titulo: e.titulo || r.titulo, original: e.original || r.titulo, anio: r.anio, poster: e.poster || r.poster, reparto: e.reparto || r.reparto, ids: { imdb: tt, ...(e.fa ? { filmaffinity: String(e.fa) } : {}) } }); }
      v.innerHTML = `<div class="empty"><div class="h2">No he podido abrir su ficha</div><a href="https://www.imdb.com/es-es/title/${esc(tt)}/" target="_blank" rel="noopener" style="text-decoration:underline">Verla en IMDb</a></div>`; return;
    }
  }
  if (!/^Q\d+$/.test(q || "")) { v.innerHTML = `<div class="empty"><div class="h2">Película no encontrada</div></div>`; return; }
  const e = (await entidadesWD([q], "labels|descriptions|claims|sitelinks", "enwiki|eswiki"))[q];
  if (location.hash !== yo) return;
  if (!e) { v.innerHTML = `<div class="empty"><div class="h2">No se ha podido cargar</div>Comprueba tu conexión.</div>`; return; }
  const R = repartoWD(e, 18), dirs = idsDe(e, "P57"), reparto = R.map((r) => r.q), guion = idsDe(e, "P58").slice(0, 4), musica = idsDe(e, "P86").slice(0, 2);
  const otros = [...idsDe(e, "P495"), ...idsDe(e, "P136"), ...idsDe(e, "P364"), ...R.map((r) => r.pq).filter(Boolean)].slice(0, 50);
  if (!idsDe(e, "P31").some((t) => WD_FILM.has(t) || WD_TV.has(t))) { v.innerHTML = `<div class="empty"><div class="h2">Esto no es una película</div>${esc(etiqueta(e))}</div>`; return; }
  // solo los nombres (rápido); las fotos del reparto llegan después
  const refs = await entidadesWD([...dirs, ...reparto, ...guion, ...musica, ...otros], "labels", "enwiki");
  if (location.hash !== yo) return;
  const titulo = etiqueta(e), original = (valores(e, "P1476")[0] || {}).text;
  const anio = anioDe(e), dur = valores(e, "P2047")[0];
  const fechas = valores(e, "P577").map((x) => (/^\+(\d{4}-\d\d-\d\d)/.exec(x.time || "") || [])[1]).filter((x) => x && !x.endsWith("-00")).sort();
  const futura = (fechas[0] && fechas[0] > todayISO()) || (anio && anio > new Date().getFullYear()) || (!fechas.length && !anio);
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
  if (!peli.poster && STATIC) peli.poster = (await posterWeb(peli)).poster || null;
  if (location.hash !== yo) return;
  const credito = (l, val) => (val ? `<div><dt>${l}</dt><dd>${val}</dd></div>` : "");
  const gente = (L) => L.map((x) => refs[x] ? `<a href="#/persona?q=${x}">${esc(etiqueta(refs[x]))}</a>` : "").filter(Boolean).join("<br>");
  const idiomas = idsDe(e, "P364").map((x) => etiqueta(refs[x])).filter(Boolean);
  v.innerHTML = `
  <section class="pe-hero">
    ${peli.poster ? `<div class="ps-fondo" style="background-image:url('${esc(peli.poster)}')"></div>` : ""}
    <div class="pe-hero-in">
      <div class="pe-cartel">${posterHTML(peli)}</div>
      <div>
        <div class="eyebrow">${esc([anio, pais.join(" · ")].filter(Boolean).join(" · "))}</div>
        <h1 class="ps-nombre">${esc(titulo)}</h1>
        ${original && norm(original) !== norm(titulo) ? `<div class="orig" style="margin:-8px 0 12px">${esc(original)}</div>` : ""}
        <div class="facts">${peli.duracion ? `<span>${icon("clock")}${Math.floor(peli.duracion / 60)} h ${String(peli.duracion % 60).padStart(2, "0")} min</span>` : ""}
          ${dirs.length ? `<span>${icon("user")}${dirs.map((x) => `<a href="#/persona?q=${x}" class="pr-persona">${esc(etiqueta(refs[x]))}</a>`).join(", ")}</span>` : ""}</div>
        ${futura ? `<div class="px-cuenta"><b>${fechas[0] && fechas[0] > todayISO() ? `${fechaLarga(fechas[0])} ${fechas[0].slice(0, 4)}` : anio ? `En ${anio}` : "Sin fecha"}</b><span>${fechas[0] && fechas[0] > todayISO() ? `Estreno · ${faltaPara(fechas[0])}` : "Fecha de estreno aún sin confirmar"}</span></div>` : ""}
        ${peli.generos.length ? `<div class="chips" style="margin:6px 0 16px">${peli.generos.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>` : ""}
        <div class="pe-acciones">
          ${mia ? `<button class="btn btn-primary" data-open="${mia.id}">${icon("check")}La has visto · ${fmt1(mia.nota)} · abrir tu ficha</button>`
            : ro() ? "" : futura ? `<button class="btn btn-primary" id="pePend">${icon("bookmark")}Guardar en pendientes</button>` : `<button class="btn btn-primary" id="peVista">${icon("plus")}La he visto</button><button class="btn" id="pePend">${icon("bookmark")}A pendientes</button>`}
        </div>
        ${!mia ? `<div class="pe-pred" id="pePred"></div>` : ""}
      </div>
    </div>
  </section>
  <div class="pe-cuerpo">
    <div class="pe-main">
      <section id="peTrama"><div class="sub">Sobre la película</div><p class="ps-bio pe-sin">${esc((e.descriptions && (e.descriptions.es || e.descriptions.en || {}).value) || "")}</p></section>
      <section>${trailerHTML(peli, valores(e, "P1651")[0])}</section>
      <div id="fExtras" class="extras-ficha"><div class="sub">Notas en otras webs</div><div class="dim cargando-mini">Consultando…</div></div>
      ${reparto.length ? `<section><div class="sub">Reparto</div><div class="fx-reparto">${R.map((r) => persona(r.q, esc(r.ps || (r.pq ? etiqueta(refs[r.pq]) : "")))).join("")}</div></section>` : ""}
    </div>
    <aside class="pe-aside">
      <dl class="fx-cred">
        ${credito("Dirección", gente(dirs))}${credito("Guion", gente(guion))}${credito("Música", gente(musica))}
        ${credito("Duración", peli.duracion ? `${Math.floor(peli.duracion / 60)} h ${String(peli.duracion % 60).padStart(2, "0")} min` : "")}
        ${credito("Estreno", anio || "")}${credito("País", esc(pais.join(", ")))}${credito("Idioma", esc(idiomas.slice(0, 3).join(", ")))}
        ${credito("Género", esc(peli.generos.join(" · ")))}
      </dl>
      <section id="peTaquilla"></section>
      <div class="sub">Ver en</div>${linksHTML(peli)}
    </aside>
  </div>`;
  if (ids.imdb && STATIC) fetch(`${API}/api/taquilla?imdb=${ids.imdb}`).then((r) => r.json()).then((r) => {
    const { presupuesto, ...t } = r || {}; const box = $("#peTaquilla");
    if (box && (t.mundial || presupuesto)) box.innerHTML = taquillaHTML({ ids, taquilla: t, presupuesto });
  }).catch(() => {});
  // trama de Wikipedia
  tramaWiki(esw, enw).then((tr) => { const b = $("#peTrama"); if (b && tr) b.innerHTML = tramaHTML(tr); });
  // predicción y notas/premios
  if (!mia && S.db.peliculas.length) {
    if (!peli.imdbNota && ids.imdb) try { const r = await notaIMDb(ids.imdb); if (r) peli.imdbNota = [r.v, r.n]; } catch (er) { /* */ }
    const m = predict(peli), box = $("#pePred");
    if (box) box.innerHTML = `${matchTag(m.pct)}<div><div class="lbl">Te encajaría</div><div>Predicción: <b>${fmt1(m.nota)}</b>${m.why.length ? ` · ${esc(m.why[0])}` : ""}</div></div>`;
  }
  cargarExtras({ ...peli, futura });
  // fotos del equipo
  entidadesWD([...dirs, ...guion, ...musica, ...reparto], "claims", "enwiki").then((F) => {
    for (const el of document.querySelectorAll(".pe-foto[data-pq]")) { const f = valores(F[el.dataset.pq], "P18")[0]; if (f) el.innerHTML = `<img src="${fotoCommons(f, 200)}" alt="" loading="lazy" referrerpolicy="no-referrer">`; }
  });
  const vista = $("#peVista"), pend = $("#pePend");
  if (vista) vista.onclick = () => openForm(null, { ...peli, poster: peli.poster });
  if (pend) pend.onclick = async () => { pend.disabled = true; await addPending({ ...peli, fecha: futura && fechas[0] > todayISO() ? fechas[0] : null }, futura ? "Próximamente" : "Desde su ficha"); pend.innerHTML = `${icon("check")}En tus pendientes`; };
};

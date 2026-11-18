// Filora · Inicio, colección, ficha, avisos de pendientes, tu año en cine, completar y formulario de película. Comparte el ámbito global con app.js (se cargan en orden desde index.html).
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
  <section class="hero ${vacia || ro() ? "" : "hero-corto"}">
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

  ${vacia || ro() ? "" : peliHoyHTML(recs)}
  <div id="avisosInicio">${avisosInicioHTML()}</div>
  ${hoyHTML()}

  ${vacia ? "" : `<section class="section">${sectionHead("El Olimpo", "#/coleccion?min=9", ((n) => n ? `${n === 1 ? "La única" : `Las ${n}`} con un 9 o más` : "Tus mejores notas")(pr.P.filter((p) => p.nota >= 9).length))}
    <ol class="olimpo">${olimpo.map((p) => `<li data-open="${p.id}"><div class="mini">${posterHTML(p)}</div>
      <div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="s">${esc([splitDir(p.director).join(" y "), p.anio].filter(Boolean).join(", "))}</div></div>${scoreBadge(p.nota)}</li>`).join("")}</ol></section>

  <section class="section">${sectionHead(recientes.length >= 4 ? "Lo último que has añadido" : "Lo último que has visto", "#/coleccion", "Toda la colección")}
    <div class="strip">${ultimas.map((p) => pcard(p)).join("")}</div></section>`}

  <section class="section">${sectionHead("Podrían gustarte", "#/recomendaciones", "Todas las recomendaciones")}
    <div class="strip">${recs.filter((r) => vacia || ro() || r !== (recs.find((x) => !x.pend) || recs[0])).map((r) => pcard(r, { match: r.m.pct, cat: r._i })).join("")}</div></section>

  ${prox.length ? `<section class="section">${sectionHead("Próximos estrenos", "#/cartelera?t=estrenos", "Calendario completo")}
    <div class="rels">${prox.map(relCard).join("")}</div></section>` : ""}

  ${vacia ? "" : `<section class="section">${sectionHead("Cómo ves el cine", "#/estadisticas?t=gustos", "Tu perfil completo")}
    <div class="insights">${insights().slice(0, 4).map(insightCard).join("")}</div></section>`}`;
};

// ---------------------------------------------------------------- Colección (películas y series, con panel lateral)
const FILTROS_P = { q: "", generos: [], decade: "", country: "", saga: "", min: 0, fav: false };
for (const [k, v] of Object.entries(FILTROS_P)) if (S.coll[k] === undefined || (k === "generos" && !Array.isArray(S.coll[k]))) S.coll[k] = Array.isArray(v) ? [] : v;
S.collS = { q: "", tipos: [], min: 0, country: "", sort: "nota" };
function filtered() {
  const c = S.coll;
  const q = norm(c.q);
  let L = S.db.peliculas.filter((p) => {
    if (q && ![p.titulo, p.tituloOriginal, p.tituloEn, p.director, ...(p.reparto || []).map((x) => x.n)].some((x) => x && norm(x).includes(q))) return false;
    if (c.generos.length && !(p.generos || []).some((g) => c.generos.includes(g))) return false;
    if (c.decade && Math.floor((p.anio || 0) / 10) * 10 !== +c.decade) return false;
    if (c.country && p.pais !== c.country) return false;
    if (c.saga && p.saga !== c.saga) return false;
    if (c.min && !(notaFinal(p) >= +c.min)) return false;
    if (c.fav && !p.favorita) return false;
    return true;
  });
  const by = {
    nota: (a, b) => (notaFinal(b) ?? -1) - (notaFinal(a) ?? -1) || (b.nota ?? -1) - (a.nota ?? -1) || (b.anio || 0) - (a.anio || 0),
    peor: (a, b) => (notaFinal(a) ?? 99) - (notaFinal(b) ?? 99),
    tunota: (a, b) => (b.nota ?? -1) - (a.nota ?? -1) || (b.anio || 0) - (a.anio || 0),
    nuevo: (a, b) => (b.anio || 0) - (a.anio || 0) || (b.nota || 0) - (a.nota || 0),
    viejo: (a, b) => (a.anio || 0) - (b.anio || 0),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, "es"),
    duracion: (a, b) => (b.duracion || 0) - (a.duracion || 0),
    taquilla: (a, b) => ((b.taquilla || {}).mundial || 0) - ((a.taquilla || {}).mundial || 0),
    registro: (a, b) => String(b.añadido || "").localeCompare(String(a.añadido || "")) || b.id.localeCompare(a.id),
  };
  return L.sort(by[c.sort] || by.nota);
}
const tipoSerie = (s) => (s.animacion ? "Animación" : s.tipo || "Serie");
function seriesFiltradas() {
  const c = S.collS, q = norm(c.q);
  const L = S.db.series.filter((s) => (!q || [s.titulo, s.tituloOriginal, s.pais].some((x) => x && norm(x).includes(q)))
    && (!c.tipos.length || c.tipos.includes(tipoSerie(s))) && (!c.country || s.pais === c.country) && (!c.min || (s.nota != null && s.nota >= c.min)));
  const by = { nota: (a, b) => (b.nota ?? -1) - (a.nota ?? -1), peor: (a, b) => (a.nota ?? 99) - (b.nota ?? 99), titulo: (a, b) => a.titulo.localeCompare(b.titulo, "es"),
    nuevo: (a, b) => String(b.anios || "").localeCompare(String(a.anios || "")), viejo: (a, b) => String(a.anios || "").localeCompare(String(b.anios || "")) };
  return L.sort(by[c.sort] || by.nota);
}
const serieCard = (s) => `<div class="pcard" data-serie="${s.id}"><div class="frame">${posterHTML({ ...s, anio: s.anios, generos: serieGen(s) })}${scoreBadge(s.nota)}</div>
  <div class="meta"><div class="t">${esc(s.titulo)}</div><div class="s">${esc([s.anios, tipoSerie(s)].filter(Boolean).join(" · "))}</div></div></div>`;
VIEWS.coleccion = (v, qs) => {
  const series = qs.get("t") === "series";
  const c = series ? S.collS : S.coll;
  if (!series) {
    for (const k of ["q", "decade", "country", "saga"]) if (qs.has(k)) c[k] = qs.get(k);
    if (qs.has("genre")) c.generos = qs.get("genre") ? [qs.get("genre")] : [];
    if (qs.has("min")) c.min = +qs.get("min") || 0;
  }
  const BASE = series ? S.db.series : S.db.peliculas;
  const cuenta = (fn) => { const m = new Map(); BASE.forEach((p) => [].concat(fn(p)).forEach((k) => k != null && k !== "" && m.set(k, (m.get(k) || 0) + 1))); return m; };
  const gC = series ? cuenta(tipoSerie) : cuenta((p) => p.generos || []);
  const cC = cuenta((p) => p.pais), dC = series ? new Map() : cuenta((p) => (p.anio ? Math.floor(p.anio / 10) * 10 : null));
  const sel = series ? c.tipos : c.generos;
  const generos = [...gC].sort((a, b) => b[1] - a[1]);
  const checkG = ([g, n]) => `<label class="cl-check"><input type="checkbox" data-g="${esc(g)}" ${sel.includes(g) ? "checked" : ""}><span>${esc(g)}</span><small>${n}</small></label>`;
  const ordenes = series ? [["nota", "Mejor nota"], ["peor", "Peor nota"], ["nuevo", "Más recientes"], ["viejo", "Más antiguas"], ["titulo", "Título A–Z"]]
    : [["nota", "Mejor nota final"], ["peor", "Peor nota final"], ["tunota", "Mejor nota tuya"], ["nuevo", "Más recientes"], ["viejo", "Más antiguas"], ["titulo", "Título A–Z"], ["duracion", "Más largas"], ["taquilla", "Mayor taquilla"], ["registro", "Últimas registradas"]];
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Colección</h1></div>${!series && !ro() ? `<div id="completarBox">${botonCompletar()}</div>` : series && !ro() ? `<button class="btn btn-primary" id="sAdd">${icon("plus")}Añadir serie</button>` : ""}</div>
  <div class="col">
    <aside class="col-lado">
      <nav class="col-pest"><a class="${series ? "" : "on"}" href="#/coleccion">${icon("film")}Películas <small>${S.db.peliculas.length}</small></a><a class="${series ? "on" : ""}" href="#/coleccion?t=series">${icon("tv")}Series <small>${S.db.series.length}</small></a></nav>
      <details class="col-filtros" ${matchMedia("(min-width: 861px)").matches ? "open" : ""}><summary>${icon("spark")}Filtros<span id="nFiltros"></span></summary>
        <div class="cl-grupo"><h4>${series ? "Tipo" : "Género"}</h4>${generos.slice(0, 8).map(checkG).join("")}
          ${generos.length > 8 ? `<details class="cl-mas"><summary>${generos.length - 8} más</summary>${generos.slice(8).map(checkG).join("")}</details>` : ""}</div>
        <div class="cl-grupo"><h4>${series ? "Nota mínima" : "Nota final mínima"} <b id="minV">${c.min ? `desde ${fmt1(c.min)}` : "cualquiera"}</b></h4>
          <input type="range" id="fmin" min="0" max="10" step="0.5" value="${c.min || 0}" aria-label="Nota mínima"><div class="cl-ndx"><span>0</span><span>5</span><span>10</span></div></div>
        ${!series ? `<div class="cl-grupo"><h4>Década</h4><div class="cl-decadas">${[...dC].sort((a, b) => a[0] - b[0]).map(([d, n]) => `<button class="${String(c.decade) === String(d) ? "on" : ""}" data-dec="${d}" title="${n} películas">${String(d).slice(2)}s</button>`).join("")}</div></div>` : ""}
        <div class="cl-grupo"><h4>País</h4><select class="select" id="fcountry"><option value="">Todos</option>${[...cC].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<option value="${esc(k)}" ${c.country === k ? "selected" : ""}>${esc(k)} (${n})</option>`).join("")}</select></div>
        ${!series ? `<label class="cl-check cl-fav"><input type="checkbox" id="ffav" ${c.fav ? "checked" : ""}><span>Solo favoritas ★</span></label>` : ""}
        <button class="btn btn-sm btn-ghost" id="fclear">Quitar filtros</button>
      </details>
    </aside>
    <div class="col-main">
      <div class="col-barra">
        <label class="search">${icon("search")}<input class="input" id="fq" placeholder="${series ? "Buscar serie o país…" : "Buscar película, director o actor…"}" value="${esc(c.q)}" autocomplete="off"></label>
        <select class="select" id="fsort">${ordenes.map(([k, l]) => `<option value="${k}" ${c.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        ${!series ? `<div class="seg"><button data-mode="grid" class="${c.mode === "grid" ? "on" : ""}" title="Carátulas">${icon("grid")}</button><button data-mode="list" class="${c.mode === "list" ? "on" : ""}" title="Lista">${icon("list")}</button></div>` : ""}
      </div>
      <div id="collRes"></div>
    </div>
  </div>`;
  if (!series) pintarCompletar();
  const activos = () => (c.q ? 1 : 0) + sel.length + (c.min ? 1 : 0) + (c.country ? 1 : 0) + (!series && c.decade ? 1 : 0) + (!series && c.fav ? 1 : 0) + (!series && c.saga ? 1 : 0);
  const draw = () => {
    const n = activos();
    $("#nFiltros").textContent = n ? ` · ${n}` : "";
    const quita = (k, val, txt) => `<button class="chip on cl-quita" data-quita="${k}" ${val != null ? `data-v="${esc(val)}"` : ""}>${esc(txt)} ×</button>`;
    const chips = [...sel.map((g) => quita("g", g, g)), c.min ? quita("min", null, `desde ${fmt1(c.min)}`) : "", c.country ? quita("country", null, c.country) : "",
      !series && c.decade ? quita("decade", null, `años ${String(c.decade).slice(2)}`) : "", !series && c.fav ? quita("fav", null, "favoritas") : "", !series && c.saga ? quita("saga", null, c.saga) : ""].join("");
    if (series) {
      const L = seriesFiltradas(), con = L.filter((x) => x.nota != null);
      $("#collRes").innerHTML = `<div class="result-line"><b>${L.length}</b> ${L.length === 1 ? "serie" : "series"}${con.length ? ` · media <b>${fmt2(mean(con.map((x) => x.nota)))}</b>` : ""}</div>${chips ? `<div class="chips cl-activos">${chips}</div>` : ""}
        ${L.length ? `<div class="posters">${L.map(serieCard).join("")}</div>` : `<div class="empty"><div class="h2">Nada por aquí</div>Prueba con otros filtros.</div>`}`;
    } else {
      const L = filtered(), shown = L.slice(0, c.limit), avg = mean(L.filter((p) => p.nota != null).map(notaFinal));
      $("#collRes").innerHTML = `
        <div class="result-line"><b>${L.length}</b> ${L.length === 1 ? "película" : "películas"}${L.length ? ` · nota final media <b>${fmt2(avg)}</b>` : ""}</div>${chips ? `<div class="chips cl-activos">${chips}</div>` : ""}
        ${!L.length ? `<div class="empty"><div class="h2">Nada por aquí</div>Prueba con otros filtros.</div>` : c.mode === "grid"
          ? `<div class="posters">${shown.map((p) => pcard(p, { final: true })).join("")}</div>`
          : `<div class="list card" style="padding:6px">${shown.map((p) => `<div class="row" data-open="${p.id}"><div class="mini">${posterHTML(p)}</div>
              <div style="min-width:0"><div class="t">${esc(p.titulo)}${p.favorita ? ` <span style="color:var(--gold)">★</span>` : ""}</div><div class="s">${esc([p.tituloOriginal !== p.titulo ? p.tituloOriginal : null, p.director].filter(Boolean).join(" · "))}</div></div>
              <div class="c">${esc((p.generos || []).slice(0, 2).join(", "))}</div><div class="c">${esc(p.pais || "")}</div><div class="c num">${p.anio || ""}</div><div class="c dim num" title="Tu nota">tú ${fmt1(p.nota)}</div><span data-tip="${esc(desgloseFinal(p))}">${scoreBadge(notaFinal(p))}</span></div>`).join("")}</div>`}
        ${L.length > c.limit ? `<div class="more"><button class="btn" id="fmore">Mostrar más (${L.length - c.limit})</button></div>` : ""}`;
      const fm = $("#fmore");
      if (fm) fm.onclick = () => { c.limit += 240; render._keep = true; draw(); };
    }
    $$("[data-quita]", v).forEach((b) => (b.onclick = () => {
      const k = b.dataset.quita;
      if (k === "g") { const i = sel.indexOf(b.dataset.v); if (i >= 0) sel.splice(i, 1); const cb = v.querySelector(`[data-g="${CSS.escape(b.dataset.v)}"]`); if (cb) cb.checked = false; }
      else if (k === "min") { c.min = 0; $("#fmin").value = 0; $("#minV").textContent = "cualquiera"; }
      else if (k === "fav") { c.fav = false; $("#ffav").checked = false; }
      else { c[k] = ""; if (k === "country") $("#fcountry").value = ""; if (k === "decade") $$("[data-dec]", v).forEach((x) => x.classList.remove("on")); }
      draw();
    }));
  };
  const otra = () => { c.limit = 120; draw(); };
  let t;
  $("#fq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { c.q = e.target.value; otra(); }, 120); };
  $$("[data-g]", v).forEach((cb) => (cb.onchange = () => { const g = cb.dataset.g, i = sel.indexOf(g); if (cb.checked && i < 0) sel.push(g); if (!cb.checked && i >= 0) sel.splice(i, 1); otra(); }));
  $("#fmin").oninput = (e) => { c.min = +e.target.value; $("#minV").textContent = c.min ? `desde ${fmt1(c.min)}` : "cualquiera"; otra(); };
  $("#fcountry").onchange = (e) => { c.country = e.target.value; otra(); };
  $("#fsort").onchange = (e) => { c.sort = e.target.value; if (!series) saveUI(); otra(); };
  $$("[data-dec]", v).forEach((b) => (b.onclick = () => { c.decade = String(c.decade) === b.dataset.dec ? "" : b.dataset.dec; $$("[data-dec]", v).forEach((x) => x.classList.toggle("on", String(c.decade) === x.dataset.dec)); otra(); }));
  const fav = $("#ffav"); if (fav) fav.onchange = () => { c.fav = fav.checked; otra(); };
  $("#fclear").onclick = () => { Object.assign(c, { q: "", min: 0, country: "" }, series ? { tipos: [] } : { generos: [], decade: "", saga: "", fav: false }); if (location.hash !== (series ? "#/coleccion?t=series" : "#/coleccion")) location.hash = series ? "#/coleccion?t=series" : "#/coleccion"; else { render._keep = true; render(); } };
  $$("[data-mode]", v).forEach((b) => (b.onclick = () => { c.mode = b.dataset.mode; saveUI(); $$("[data-mode]", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  const sa = $("#sAdd"); if (sa) sa.onclick = () => openSerieForm();
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
  const dirs = p.director ? splitDir(p.director).map((d) => `<a href="#/persona?n=${encodeURIComponent(d)}" data-close>${esc(d)}</a>`).join(", ") : "";
  const meta = [p.anio, p.duracion ? `${Math.floor(p.duracion / 60)} h ${String(p.duracion % 60).padStart(2, "0")} min` : "", esc(p.pais || ""), dirs].filter(Boolean).join("<i>·</i>");
  const fin = p.nota != null && notasWebDe(p).length ? notaFinal(p) : null;
  // Ficha compacta: lo esencial arriba (cartel, datos y notas) y el resto en bloques cortos
  modal(`
    <div class="sheet-body fc">
      <header class="fc-hero">
        ${p.poster ? `<div class="fc-fondo"><img src="${esc(p.poster)}" alt="" referrerpolicy="no-referrer"></div>` : ""}
        <div class="fc-cartel">${posterHTML(p)}</div>
        <div class="fc-cab">
          <h2>${esc(p.titulo)}${p.favorita ? ` <span class="fc-fav" title="Favorita">★</span>` : ""}</h2>
          ${p.tituloOriginal && norm(p.tituloOriginal) !== norm(p.titulo) ? `<div class="fc-orig">${esc(p.tituloOriginal)}</div>` : p.tituloEn && norm(p.tituloEn) !== norm(p.titulo) ? `<div class="fc-orig">${esc(p.tituloEn)}</div>` : ""}
          <div class="fc-meta">${meta}</div>
          ${(p.generos || []).length ? `<div class="fc-gen">${p.generos.map((g) => `<a href="#/coleccion?genre=${encodeURIComponent(g)}" data-close>${esc(g)}</a>`).join("")}</div>` : ""}
          <div class="fc-notas">
            <div class="fc-n">${scoreBadge(p.nota, "lg")}<span><small>Tu nota</small><b>${veredicto(p.nota)}</b></span></div>
            ${fin != null ? `<div class="fc-n" data-tip="${esc(desgloseFinal(p))}">${scoreBadge(fin)}<span><small>Nota final</small><b>${((d) => Math.abs(d) < 0.25 ? "como las webs" : `${d > 0 ? "+" : "−"}${fmt1(Math.abs(d))} que las webs`)(p.nota - mean(notasWebDe(p).map((x) => x[1])))}</b></span></div>` : ""}
            ${pct ? `<div class="fc-n"><em>${rank}º</em><span><small>de ${pr.N}</small><b>top ${Math.max(1, 101 - pct)} %</b></span></div>` : ""}
          </div>
        </div>
      </header>
      <div class="fc-barra">
        <span class="fc-vista">${visto ? `${icon("eye")}${esc(visto)}` : ""}</span>
        <span class="fc-acts">
          <button class="icon-btn" data-edit="${p.id}" title="Editar">${icon("edit")}</button>
          <button class="icon-btn ${p.favorita ? "on" : ""}" data-fav="${p.id}" title="${p.favorita ? "Quitar de favoritas" : "Marcar como favorita"}">${icon("star", p.favorita)}</button>
          <button class="icon-btn btn-danger" data-del="${p.id}" title="Eliminar">${icon("trash")}</button>
        </span>
      </div>
      ${p.resena ? `<blockquote class="review">${esc(p.resena)}</blockquote>` : ""}
      <div id="fExtras" class="extras-ficha"><div class="dim cargando-mini">Consultando notas de IMDb, FilmAffinity, Letterboxd y SensaCine…</div></div>
      <section id="fTrama" class="fx-sec" hidden></section>
      <section id="fReparto" class="fx-sec" hidden></section>
      <section id="fTrailer" class="fx-sec">${trailerHTML(p)}</section>
      <section id="fTaquilla" class="fx-sec">${taquillaHTML(p)}</section>
      <div class="sub">Ver en</div>
      ${linksHTML(p)}
      ${similares.length ? `<div class="sub">Del mismo director en tu colección</div><div class="strip">${similares.map((x) => pcard(x)).join("")}</div>` : ""}
    </div>`, "narrow fc-sheet");
  if (typeof cargarExtras === "function") cargarExtras(p);
  $("#modal").dataset.film = p.id;
  cargarTrama(p);
  completarFicha(p).then((n) => { if (n) { cargarReparto(n); cargarTaquilla(n); } else { cargarReparto(p); cargarTaquilla(p); } });
}
// Cuánto falta para un estreno: «faltan 3 días», «faltan 2 meses», «falta más de un año»
function faltaPara(fecha) {
  if (!fecha) return "";
  const d = Math.round((Date.parse(fecha + "T12:00") - Date.parse(todayISO() + "T12:00")) / 864e5);
  if (d < 0) return "ya estrenada";
  if (d === 0) return "se estrena hoy";
  if (d === 1) return "se estrena mañana";
  if (d < 45) return `faltan ${d} días`;
  if (d < 365) return `faltan ${Math.round(d / 30.4)} meses`;
  return "falta más de un año";
}
// ---------------------------------------------------------------- Avisos de pendientes: cartelera, estreno o plataforma
S.avisos = null;
const PLAT_DIAS = 1;
function mismaPeli(w, titulo, original, anio) {
  const t = [norm(w.titulo), norm(w.tituloOriginal)].filter(Boolean);
  return t.some((x) => x === norm(titulo) || (original && x === norm(original))) && (!w.anio || !anio || Math.abs(w.anio - anio) <= 1);
}
async function plataformasDe(w) {
  const k = `filora.plat.${w.id}`;
  try { const c = JSON.parse(localStorage.getItem(k) || "null"); if (c && reciente(c.d, PLAT_DIAS)) return c.l; } catch (e) { /* */ }
  const r = await fetch(`${API_WEB}/api/plataformas?t=${encodeURIComponent(w.titulo)}${w.anio ? `&y=${w.anio}` : ""}`);
  if (!r.ok) throw new Error("sin JustWatch");
  const l = await r.json();
  try { localStorage.setItem(k, JSON.stringify({ d: new Date().toISOString(), l })); } catch (e) { /* */ }
  return l;
}
async function calcularAvisos() {
  const W = S.db.pendientes || [];
  if (!W.length) { S.avisos = new Map(); return; }
  const out = new Map(), add = (id, a) => out.set(id, [...(out.get(id) || []), a]);
  const hoy = todayISO();
  for (const w of W) {
    const cines = ((S.cart && S.cart.cines) || []).filter((c) => (c.peliculas || []).some((p) => mismaPeli(w, p.titulo, p.original, p.anio)));
    if (cines.length) add(w.id, { tipo: "cine", txt: `En cartelera en ${cines.map((c) => c.nombre).slice(0, 2).join(" y ")}` });
    const e = ((S.est && S.est.estrenos) || []).find((x) => x.fecha >= hoy && mismaPeli(w, x.titulo, x.original, +x.fecha.slice(0, 4)));
    if (e) add(w.id, { tipo: "estreno", txt: `Se estrena el ${new Date(e.fecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" })}` });
  }
  S.avisos = out; pintarAvisos();
  if (!STATIC) return;
  const cola = W.slice(0, 60);
  for (let i = 0; i < cola.length; i += 4) {
    await Promise.all(cola.slice(i, i + 4).map(async (w) => {
      try {
        const l = (await plataformasDe(w)).filter((x) => x.tipo === "suscripcion" || x.tipo === "gratis");
        if (l.length) add(w.id, { tipo: "plataforma", txt: `En ${[...new Set(l.map((x) => x.plataforma))].slice(0, 3).join(", ")}` });
      } catch (e) { /* sin JustWatch: solo cartelera y estrenos */ }
    }));
  }
  S.avisos = out; pintarAvisos(); avisarNovedades();
}
// Aviso discreto, como mucho una vez al día y solo por pendientes que antes no se podían ver
function avisarNovedades() {
  const k = "filora.avisos.vistos", kd = "filora.avisos.dia";
  let vistos; try { vistos = new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch (e) { vistos = new Set(); }
  const nuevos = [];
  for (const [id, L] of S.avisos) for (const a of L) { const c = `${id}|${a.tipo}`; if (!vistos.has(c)) { nuevos.push([id, a]); vistos.add(c); } }
  try { localStorage.setItem(k, JSON.stringify([...vistos].slice(-500))); } catch (e) { /* */ }
  const ahora = nuevos.filter(([, a]) => a.tipo !== "estreno");
  let dia = ""; try { dia = localStorage.getItem(kd) || ""; } catch (e) { /* */ }
  if (!ahora.length || dia === todayISO()) return;
  try { localStorage.setItem(kd, todayISO()); } catch (e) { /* */ }
  const w = S.db.pendientes.find((x) => x.id === ahora[0][0]);
  toast(ahora.length === 1 && w ? `«${w.titulo}» de tus pendientes: ${ahora[0][1].txt.toLowerCase()}` : `${ahora.length} pendientes ya se pueden ver`, "bookmark", "#/pendientes");
}
const avisoChip = (a) => `<span class="aviso aviso-${a.tipo}">${icon(a.tipo === "cine" ? "ticket" : a.tipo === "estreno" ? "calendar" : "tv")}${esc(a.txt)}</span>`;
function avisosInicioHTML() {
  if (!S.avisos || !S.avisos.size) return "";
  const L = [...S.avisos].map(([id, a]) => [S.db.pendientes.find((w) => w.id === id), a]).filter(([w]) => w);
  const ya = L.filter(([, a]) => a.some((x) => x.tipo !== "estreno"));
  if (!L.length) return "";
  return `<section class="section avisos-ini">${sectionHead(ya.length ? `${ya.length} ${ya.length === 1 ? "pendiente ya se puede ver" : "pendientes ya se pueden ver"}` : "Tus pendientes llegan pronto", "#/pendientes", "Ver pendientes")}
    <div class="avisos-l">${L.slice(0, 6).map(([w, a]) => `<a class="aviso-fila" href="#/pendientes"><b>${esc(w.titulo)}</b>${a.map(avisoChip).join("")}</a>`).join("")}</div></section>`;
}
function pintarAvisos() {
  const escribiendo = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (route().name === "pendientes" && $("#modal").hidden && !escribiendo) { render._keep = true; render(); return; } // recuenta filtros y ordena
  const ini = document.getElementById("avisosInicio");
  if (ini) ini.innerHTML = avisosInicioHTML();
  for (const el of document.querySelectorAll("[data-avisos]")) el.innerHTML = ((S.avisos && S.avisos.get(el.dataset.avisos)) || []).map(avisoChip).join("");
}

// ---------------------------------------------------------------- Tu año en cine
const fechaDe = (p) => p.fechaVisto || String(p["añadido"] || "").slice(0, 10) || null;
function resumenAnio(P, y) {
  const L = P.filter((p) => String(fechaDe(p) || "").startsWith(String(y)));
  const conNota = L.filter((p) => p.nota != null);
  const meses = Array.from({ length: 12 }, (_, i) => L.filter((p) => +fechaDe(p).slice(5, 7) === i + 1));
  const cuenta = (fn) => { const m = new Map(); for (const p of L) for (const k of [].concat(fn(p) || [])) if (k) m.set(k, [...(m.get(k) || []), p]); return [...m].sort((a, b) => b[1].length - a[1].length || mean(b[1].map((x) => x.nota || 0)) - mean(a[1].map((x) => x.nota || 0))); };
  const cines = new Set(misCines().map((c) => norm(c.nombre)));
  const enCine = (p) => p.lugar && (cines.has(norm(p.lugar)) || /cine|ocine|yelmo|kinepolis|cinesa|odeon|mk2|renoir|verdi|golem/i.test(p.lugar));
  return {
    y, L, n: L.length, horas: L.reduce((t, p) => t + (p.duracion || 0), 0) / 60, media: conNota.length ? mean(conNota.map((p) => p.nota)) : null,
    meses, mejor: [...conNota].sort((a, b) => b.nota - a.nota)[0], peor: [...conNota].sort((a, b) => a.nota - b.nota)[0],
    top: [...conNota].sort((a, b) => b.nota - a.nota).slice(0, 5),
    directores: cuenta((p) => splitDir(p.director)), generos: cuenta((p) => p.generos), paises: cuenta((p) => p.pais),
    cine: L.filter(enCine).length, casa: L.filter((p) => p.lugar && !enCine(p)).length,
    taquilla: [...L].filter((p) => (p.taquilla || {}).mundial).sort((a, b) => b.taquilla.mundial - a.taquilla.mundial)[0],
    larga: [...L].filter((p) => p.duracion).sort((a, b) => b.duracion - a.duracion)[0],
  };
}
SUB.anio = (v, qs) => {
  const P = S.db.peliculas;
  const anios = [...new Set(P.map(fechaDe).filter(Boolean).map((f) => +f.slice(0, 4)))].filter((a) => a > 1900).sort((a, b) => b - a);
  if (!anios.length) { v.innerHTML = `<div class="page-head"><div><h1 class="h1">Tu año en cine</h1></div></div><div class="empty"><div class="h2">Aún no hay películas con fecha</div>Cuando registres películas con el día en que las viste, aquí tendrás tu resumen de cada año.</div>`; return; }
  const y = anios.includes(+qs.get("a")) ? +qs.get("a") : anios[0];
  const R = resumenAnio(P, y), A = anios.includes(y - 1) ? resumenAnio(P, y - 1) : null;
  const maxMes = Math.max(1, ...R.meses.map((m) => m.length));
  const mesTop = R.meses.map((m, i) => [i, m.length]).sort((a, b) => b[1] - a[1])[0];
  const dif = A ? R.n - A.n : null;
  const peli = (p, etiqueta) => p ? `<div class="an-peli" data-open="${p.id}"><div class="an-cartel">${posterHTML(p)}</div><div><div class="lbl">${etiqueta}</div><div class="an-t">${esc(p.titulo)}</div><div class="dim">${esc([p.anio, splitDir(p.director)[0]].filter(Boolean).join(" · "))}</div>${p.nota != null ? scoreBadge(p.nota) : ""}</div></div>` : "";
  const ranking = (L, titulo, enlace) => L.length ? `<div class="an-rank"><div class="sub">${titulo}</div><ol>${L.slice(0, 5).map(([k, X]) => `<li><span>${enlace ? enlace(k) : esc(k)}</span><b>${X.length}</b></li>`).join("")}</ol></div>` : "";
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Tu año en cine</h1></div>
    <div class="an-acc"><div class="chips">${anios.slice(0, 8).map((a) => `<a class="chip ${a === y ? "on" : ""}" href="#/estadisticas?t=anio&a=${a}">${a}</a>`).join("")}</div>
    <button class="btn" id="anCompartir">${icon("upload")}Compartir mi ${y}</button></div></div>
  <section class="an-hero">
    <div class="an-anio">${y}</div>
    <div class="an-cifras">
      <div><b>${R.n}</b><span>${R.n === 1 ? "película" : "películas"}${dif != null ? ` · <em class="${dif >= 0 ? "sube" : "baja"}">${dif >= 0 ? "+" : ""}${dif} que en ${y - 1}</em>` : ""}</span></div>
      <div><b>${Math.round(R.horas)}</b><span>horas delante de la pantalla${R.horas >= 24 ? ` · ${fmt1(R.horas / 24)} días seguidos` : ""}</span></div>
      <div><b>${R.media != null ? fmt1(R.media) : "–"}</b><span>tu nota media${A && A.media != null && R.media != null ? ` · ${R.media >= A.media ? "más generoso" : "más exigente"} que en ${y - 1} (${fmt1(A.media)})` : ""}</span></div>
      ${R.cine + R.casa ? `<div><b>${R.cine}</b><span>en el cine y ${R.casa} en casa</span></div>` : ""}
    </div>
  </section>
  <section class="section an-meses-w"><div class="sub">Mes a mes${mesTop[1] ? ` · tu mes más cinéfilo fue ${MESES[mesTop[0]]} (${mesTop[1]})` : ""}</div>
    <div class="an-meses">${R.meses.map((m, i) => `<div class="an-mes ${i === mesTop[0] && m.length ? "top" : ""}" title="${MESES[i]}: ${m.length}"><b>${m.length || ""}</b><i style="height:${(100 * m.length / maxMes).toFixed(0)}%"></i><span>${MESES[i].slice(0, 3)}</span></div>`).join("")}</div></section>
  ${diarioHTML(R)}
  <section class="section an-dos">${peli(R.mejor, "La mejor del año")}${R.peor && R.peor !== R.mejor ? peli(R.peor, "La que menos te gustó") : ""}</section>
  ${R.top.length >= 3 ? `<section class="section">${sectionHead(`Tus ${R.top.length} mejores de ${y}`)}<div class="posters">${R.top.map((p) => pcard(p)).join("")}</div></section>` : ""}
  <section class="section an-rankings">
    ${ranking(R.directores, "Directores", (d) => `<a href="#/persona?n=${encodeURIComponent(d)}">${esc(d)}</a>`)}
    ${ranking(R.generos, "Géneros", (g) => `<a href="#/coleccion?genre=${encodeURIComponent(g)}">${esc(g)}</a>`)}
    ${ranking(R.paises, "Países")}
  </section>
  <section class="section an-dos">${peli(R.taquilla, `La más taquillera · ${R.taquilla ? money(R.taquilla.taquilla.mundial) : ""}`)}${peli(R.larga, `La más larga · ${R.larga ? durTxt(R.larga.duracion) : ""}`)}</section>`;
  $("#anCompartir").onclick = async (ev) => { const b = ev.currentTarget; b.disabled = true; try { await compartirAnio(R); } catch (e) { toast(`No se pudo crear la imagen: ${e.message}`, "x"); } b.disabled = false; };
};
// Tu año en una imagen vertical (1080×1920) para Instagram o WhatsApp: cifras, top 5 con carteles y mes más cinéfilo
async function imagenAnio(R) {
  const W = 1080, H = 1920, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const css = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;
  const SALA = "#13102e", PAPEL = "#efeaff", TELON = css("--telon", "#ff6b4a"), BOMB = "#8f7cff", TENUE = "rgba(239,234,255,.62)";
  await document.fonts.ready;
  g.fillStyle = SALA; g.fillRect(0, 0, W, H);
  // perforaciones de película arriba y abajo
  g.fillStyle = "rgba(239,234,255,.12)";
  for (let x = 30; x < W; x += 70) { g.fillRect(x, 34, 34, 22); g.fillRect(x, H - 56, 34, 22); }
  const txt = (t, x, y, font, color, align = "left") => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); };
  const corta = (t, max) => { let u = String(t); while (g.measureText(u).width > max && u.length > 3) u = u.slice(0, -2); return u === String(t) ? u : u.trimEnd() + "…"; };
  txt("FILORA · TU AÑO EN CINE", 80, 150, "700 34px 'Sofia Sans Extra Condensed', sans-serif", TENUE);
  txt(String(R.y), 70, 360, "800 250px Montserrat, sans-serif", TELON);
  const cifras = [[R.n, R.n === 1 ? "película" : "películas"], [Math.round(R.horas), "horas"], [R.media != null ? fmt1(R.media) : "–", "nota media"]];
  cifras.forEach(([v, l], i) => { const x = 80 + i * 320; txt(String(v), x, 520, "800 96px Montserrat, sans-serif", PAPEL); txt(l.toUpperCase(), x, 568, "600 34px 'Sofia Sans Extra Condensed', sans-serif", TENUE); });
  const mesTop = R.meses.map((m, i) => [i, m.length]).sort((a, b) => b[1] - a[1])[0];
  if (mesTop && mesTop[1]) { txt("TU MES MÁS CINÉFILO", 80, 680, "600 34px 'Sofia Sans Extra Condensed', sans-serif", TENUE); txt(`${MESES[mesTop[0]][0].toUpperCase() + MESES[mesTop[0]].slice(1)} · ${mesTop[1]} ${mesTop[1] === 1 ? "película" : "películas"}`, 80, 740, "700 54px Montserrat, sans-serif", BOMB); }
  txt(`TU TOP ${Math.min(5, R.top.length)}`, 80, 860, "600 34px 'Sofia Sans Extra Condensed', sans-serif", TENUE);
  const carga = (u) => new Promise((ok) => { if (!u) return ok(null); const im = new Image(); im.crossOrigin = "anonymous"; im.referrerPolicy = "no-referrer"; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u; setTimeout(() => ok(null), 6000); });
  const top = R.top.slice(0, 5);
  const imgs = await Promise.all(top.map((p) => carga(p.poster)));
  top.forEach((p, i) => {
    const y = 900 + i * 176, x = 80;
    g.fillStyle = "rgba(239,234,255,.08)"; g.fillRect(x, y, 104, 156);
    if (imgs[i]) g.drawImage(imgs[i], x, y, 104, 156); // si algún cartel no permite exportarse, toBlob falla y se repite sin carteles
    txt(String(i + 1), x + 140, y + 70, "800 56px Montserrat, sans-serif", TENUE);
    g.font = "700 44px Montserrat, sans-serif"; txt(corta(p.titulo.toUpperCase(), 600), x + 210, y + 66, g.font, PAPEL);
    txt([p.anio, splitDir(p.director)[0]].filter(Boolean).join(" · "), x + 210, y + 114, "500 32px 'Instrument Sans', sans-serif", TENUE);
    g.fillStyle = scoreColor(p.nota); g.fillRect(W - 200, y + 34, 120, 84);
    txt(fmt1(p.nota), W - 140, y + 95, "800 52px Montserrat, sans-serif", "#fff", "center");
  });
  txt("filora", W / 2, H - 100, "700 34px Montserrat, sans-serif", TENUE, "center");
  try { return await new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("sin imagen"))), "image/png")); }
  catch (e) { // algún cartel contaminó el lienzo: se repite sin carteles
    return imagenAnio({ ...R, top: R.top.map((p) => ({ ...p, poster: null })) });
  }
}
async function compartirAnio(R) {
  const b = await imagenAnio(R);
  const f = new File([b], `filora-${R.y}.png`, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: `Mi ${R.y} en cine` }); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Imagen guardada: ${f.name}`);
}
// Diario del año: cada mes con los carteles de lo que viste, en orden y con el día
function diarioHTML(R) {
  const meses = R.meses.map((L, i) => [i, [...L].sort((a, b) => String(fechaDe(a)).localeCompare(String(fechaDe(b))))]).filter(([, L]) => L.length).reverse();
  if (!meses.length) return "";
  return `<section class="section"><details class="pliegue diario" ${R.n <= 40 ? "open" : ""}><summary><span class="pl-t">Tu diario</span><span class="pl-c">${R.n} ${R.n === 1 ? "película" : "películas"} día a día</span></summary>
    <div class="pl-cuerpo">${meses.map(([i, L]) => `<div class="dia-mes"><div class="dia-m">${MESES[i]}<small>${L.length}</small></div>
      <div class="dia-fila ${L.length > 14 ? "dia-corta" : ""}">${L.map((p) => `<a class="dia-p" data-open="${p.id}" href="#" title="${esc(p.titulo)}${p.lugar ? ` · ${esc(p.lugar)}` : ""}"><span class="dia-c">${posterHTML(p)}</span><span class="dia-d">${+String(fechaDe(p)).slice(8, 10) || ""}</span>${p.nota != null ? `<span class="dia-n" style="background:${scoreColor(p.nota)}">${fmt1(p.nota)}</span>` : ""}</a>`).join("")}${L.length > 14 ? `<button class="dia-mas" type="button" onclick="this.parentNode.classList.remove('dia-corta');this.remove()">+${L.length - 14}</button>` : ""}</div></div>`).join("")}</div></details></section>`;
}
// ---------------------------------------------------------------- Completar la colección entera, poco a poco
S.completando = null;
function botonCompletar() {
  if (S.completando) return progresoCompletar();
  const n = S.db.peliculas.filter((p) => faltaDatos(p) || faltaTaquilla(p)).length;
  return n ? `<button class="btn" id="completarGo" title="Busca cartel, géneros, reparto, títulos y taquilla de las que no los tienen">${icon("refresh")}Completar mi colección · ${n}</button>` : "";
}
function progresoCompletar() {
  const c = S.completando;
  return `<div class="completar"><div class="completar-t"><b>Completando ${c.hechas} de ${c.total}</b><span>${esc(c.actual || "")}</span></div>
    <div class="completar-barra"><i style="width:${(100 * c.hechas / c.total).toFixed(1)}%"></i></div><button class="btn btn-sm btn-ghost" id="completarStop">Detener</button></div>`;
}
function pintarCompletar() {
  const box = document.getElementById("completarBox");
  if (!box) return;
  box.innerHTML = botonCompletar();
  const go = document.getElementById("completarGo"), stop = document.getElementById("completarStop");
  if (go) go.onclick = completarColeccion;
  if (stop) stop.onclick = () => { if (S.completando) S.completando.parar = true; };
}
// Guarda varias películas de una vez (una sola escritura en el servidor en vez de una por película)
const modNuevo = (p) => { const t = new Date().toISOString().slice(0, 19); return p.mod && p.mod >= t ? new Date(Date.parse(p.mod + "Z") + 1000).toISOString().slice(0, 19) : t; };
async function guardarLote(ids) {
  const items = ids.map((id) => S.db.peliculas.find((x) => x.id === id)).filter(Boolean); // la versión de ahora
  if (!items.length) return;
  await api("sync", { method: "POST", body: { peliculas: items } });
}
// Completa una lista de películas por lotes de 10; avisa(progreso) tras cada una. Devuelve cuántas mejoraron.
async function completarVarias(ids, avisa = () => {}, parar = () => false) {
  let lote = [], mejoradas = 0;
  for (const id of ids) {
    if (parar()) break;
    const p = S.db.peliculas.find((x) => x.id === id);
    if (p) {
      avisa(p);
      const c1 = faltaDatos(p) ? await cambiosFicha(p) : null;
      const c2 = faltaTaquilla({ ...p, ...(c1 || {}), ids: { ...(p.ids || {}), ...((c1 || {}).ids || {}) } }) ? await cambiosTaquilla({ ...p, ...(c1 || {}), ids: { ...(p.ids || {}), ...((c1 || {}).ids || {}) } }) : null;
      if (c1 || c2) {
        const nuevo = { ...p, ...(c1 || {}), ...(c2 || {}) };
        nuevo.mod = modNuevo(p);
        const i = S.db.peliculas.findIndex((x) => x.id === id);
        if (i >= 0) S.db.peliculas[i] = nuevo; // se ve al momento
        lote.push(id);
        if (Object.keys({ ...(c1 || {}), ...(c2 || {}) }).some((k) => !["intento", "completado", "ids"].includes(k))) mejoradas++;
      }
      if (lote.length >= 10) { try { await guardarLote(lote); } catch (e) { /* se reintentará */ } lote = []; }
      await new Promise((r) => setTimeout(r, 500)); // sin saturar Wikidata ni Box Office Mojo
    }
    avisa(null);
  }
  try { await guardarLote(lote); } catch (e) { /* */ }
  S.prof = null;
  return mejoradas;
}
// Al abrir la web: las últimas añadidas a las que les falte algo se completan solas (hasta 8 por visita)
async function completarRecientes() {
  if (S.completando) return;
  const ids = [...S.db.peliculas].filter((p) => faltaDatos(p) || faltaTaquilla(p))
    .sort((a, b) => String(b["añadido"] || "").localeCompare(String(a["añadido"] || ""))).slice(0, 8).map((p) => p.id);
  if (!ids.length) return;
  S.completandoFondo = true;
  const n = await completarVarias(ids, () => {}, () => !!S.completando);
  S.completandoFondo = false;
  if (n) { toast(`${n} ${n === 1 ? "película completada" : "películas completadas"} con cartel y datos`); if (VISTAS_VIVAS.includes(route().name) && $("#modal").hidden) { render._keep = true; render(); } }
}
async function completarColeccion() {
  if (S.completando) return;
  const cola = S.db.peliculas.filter((p) => faltaDatos(p) || faltaTaquilla(p)).map((p) => p.id);
  S.completando = { total: cola.length, hechas: 0, actual: "", parar: false };
  pintarCompletar();
  const n = await completarVarias(cola, (p) => { const c = S.completando; if (!c) return; if (p) c.actual = p.titulo; else c.hechas++; pintarCompletar(); }, () => !S.completando || S.completando.parar);
  const parada = S.completando && S.completando.parar;
  S.completando = null;
  const quedan = S.db.peliculas.filter((p) => faltaDatos(p) || faltaTaquilla(p)).length;
  toast(`${n} ${n === 1 ? "película mejorada" : "películas mejoradas"}${parada ? " (detenido)" : ""}${quedan ? ` · ${quedan} sin datos que encontrar ahora (se reintentarán en unos días)` : ""}`);
  if (route().name === "coleccion") { render._keep = true; render(); } else pintarCompletar();
}
// Películas añadidas antes (o sin reconocer): al abrir la ficha se buscan y se rellena lo que falte
const reciente = (d, dias) => d && Date.now() - Date.parse(d) < dias * 864e5;
const faltaDatos = (p) => !p.completado && !reciente(p.intento, 30) && (!p.poster || !(p.generos || []).length || !(p.ids || {}).wikidata || !(p.reparto || []).length || !p.tituloEn);
const faltaTaquilla = (p) => !!(p.ids || {}).imdb && !(p.taquilla || {}).consultado;
// Lo que le falta a una película (datos, cartel, reparto…), sin guardarlo: null si no hay nada que cambiar
async function cambiosFicha(p) {
  try {
    const m = await identificar({ titulo: p.tituloOriginal || p.titulo, anio: p.anio, director: p.director, duracion: p.duracion })
      || (p.tituloOriginal && p.tituloOriginal !== p.titulo ? await identificar({ titulo: p.titulo, anio: p.anio, director: p.director, duracion: p.duracion }) : null);
    const c = m && m.ids.wikidata ? { completado: todayISO() } : { intento: todayISO() }; // sin Wikidata: se reintenta en 30 días
    if (m) {
      c.ids = { ...m.ids, ...(p.ids || {}) };
      for (const k of ["poster", "tituloOriginal", "tituloEn", "director", "pais", "duracion", "anio"]) if (!p[k] && m[k]) c[k] = m[k];
      if (!(p.generos || []).length && (m.generos || []).length) c.generos = m.generos;
      if (!(p.reparto || []).length && (m.reparto || []).length) c.reparto = m.reparto;
    }
    if (!(c.poster || p.poster)) { const r = await posterWeb({ ...p, ...c }); if (r.poster) { c.poster = r.poster; c.ids = { ...(c.ids || p.ids || {}), imdb: (c.ids || p.ids || {}).imdb || r.imdb }; } }
    if (c.ids && JSON.stringify(c.ids) === JSON.stringify(p.ids || {})) delete c.ids;
    return Object.keys(c).length ? c : null;
  } catch (e) { return null; }
}
async function cambiosTaquilla(p) {
  const imdb = (p.ids || {}).imdb;
  if (!imdb || (p.taquilla || {}).consultado) return null;
  try {
    const r = await fetch(`${API_WEB}/api/taquilla?imdb=${imdb}`);
    if (!r.ok) return null;
    const { presupuesto, ...taq } = (await r.json()) || {};
    return { taquilla: { ...(p.taquilla || {}), ...taq, fuente: "boxofficemojo", consultado: todayISO() }, ...(presupuesto ? { presupuesto } : {}) };
  } catch (e) { return null; }
}
async function completarFicha(p, forzar = false) {
  const falta = faltaDatos(p);
  if (ro() || (!falta && !forzar) || (p.completado && !forzar)) return null;
  try {
    const c = await cambiosFicha(p);
    if (!c) return null;
    const n = await api(`peliculas/${p.id}`, { method: "PUT", body: c });
    const i = S.db.peliculas.findIndex((x) => x.id === p.id); if (i >= 0) S.db.peliculas[i] = { ...S.db.peliculas[i], ...n };
    if (Object.keys(c).some((k) => !["completado", "intento", "ids"].includes(k)) && fichaAbierta(p.id)) { openFilm(p.id); toast("Ficha completada"); return null; }
    return S.db.peliculas[i];
  } catch (e) { return null; }
}
// Taquilla: cifra total con veredicto y barras comparables (presupuesto, EE. UU., resto del mundo, total)
function taquillaHTML(p) {
  const t = p.taquilla || {};
  if (!t.mundial && !p.presupuesto) return "";
  const dom = t.domestica || 0, int = t.internacional || Math.max(0, (t.mundial || 0) - dom), tot = t.mundial || dom + int;
  const max = Math.max(tot, p.presupuesto || 0, 1);
  const x = p.presupuesto && tot ? tot / p.presupuesto : null;
  const ver = x == null ? null : x >= 4 ? ["Exitazo", "exito"] : x >= 2 ? ["Rentable", "exito"] : x >= 1 ? ["Recuperó lo invertido", "justo"] : ["Fracaso en taquilla", "fracaso"];
  const conTaq = S.db.peliculas.filter((y) => (y.taquilla || {}).mundial).sort((a, b) => b.taquilla.mundial - a.taquilla.mundial);
  const puesto = tot ? conTaq.findIndex((y) => y.id === p.id) + 1 : 0;
  const fila = (cls, l, v, extra = "") => (v ? `<div class="tq-fila ${cls}"><span class="tq-l">${l}</span><span class="tq-b"><i style="width:${Math.max(1, (100 * v) / max).toFixed(1)}%"></i></span><b>${money(v)}</b>${extra}</div>` : "");
  return `<div class="sub">Taquilla${(p.ids || {}).imdb ? ` · <a href="https://www.boxofficemojo.com/title/${p.ids.imdb}/" target="_blank" rel="noopener">Box Office Mojo</a>` : ""}</div>
    <div class="tq">
      ${tot ? `<div class="tq-cab"><div><b class="tq-cifra">${money(tot)}</b><span>recaudados en todo el mundo</span></div>
        ${ver ? `<div class="tq-ver tq-${ver[1]}"><b>${fmt1(x)}×</b><span>${ver[0]}</span></div>` : ""}</div>` : ""}
      <div class="tq-filas">
        ${fila("tq-pre", "Presupuesto", p.presupuesto)}
        ${fila("tq-ap", "Primer fin de semana en EE. UU.", t.apertura)}
        ${fila("tq-dom", "EE. UU. y Canadá", dom, tot ? `<small>${Math.round((100 * dom) / tot)} %</small>` : "")}
        ${fila("tq-int", "Resto del mundo", int, tot ? `<small>${Math.round((100 * int) / tot)} %</small>` : "")}
        ${fila("tq-tot", "Total", tot)}
      </div>
      ${puesto && conTaq.length > 1 ? `<div class="tq-pie">Puesto ${puesto} de ${conTaq.length} en tu colección por taquilla${puesto === 1 ? " · la más taquillera que has visto" : ""}</div>` : ""}
    </div>`;
}
// Si aún no se consultó, la taquilla se pide una vez a Box Office Mojo y se guarda en la película
async function cargarTaquilla(p) {
  if (ro()) return;
  try {
    const cambios = await cambiosTaquilla(p);
    if (!cambios) return;
    const n = await api(`peliculas/${p.id}`, { method: "PUT", body: cambios });
    const i = S.db.peliculas.findIndex((x) => x.id === p.id); if (i >= 0) S.db.peliculas[i] = { ...S.db.peliculas[i], ...n };
    const box = document.getElementById("fTaquilla");
    if (box && fichaAbierta(p.id)) box.innerHTML = taquillaHTML({ ...p, ...cambios });
  } catch (e) { /* sin conexión: se intentará otra vez al abrirla */ }
}
async function cargarTrama(p) {
  const q = (p.ids || {}).wikidata;
  if (!q || typeof entidadesWD !== "function") return;
  try {
    const e = (await entidadesWD([q], "sitelinks|claims", "eswiki|enwiki"))[q];
    const sl = (e && e.sitelinks) || {};
    const yt = valores(e, "P1651")[0];
    const t = document.getElementById("fTrailer"); if (t && yt && fichaAbierta(p.id)) t.innerHTML = trailerHTML(p, yt);
    const tr = await tramaWiki(sl.eswiki && sl.eswiki.title, sl.enwiki && sl.enwiki.title);
    const box = document.getElementById("fTrama");
    if (box && tr && fichaAbierta(p.id)) { box.innerHTML = tramaHTML(tr); box.hidden = false; const t = box.querySelector(".trama"); if (t) t.onclick = () => t.classList.add("abierta"); }
  } catch (e) { /* sin trama */ }
}
// Reparto con fotos y personajes (Wikidata): el guardado, completado con su ficha de Wikidata
async function cargarReparto(p) {
  const box = document.getElementById("fReparto");
  if (!box || typeof entidadesWD !== "function") return;
  let lista = Array.isArray(p.reparto) ? p.reparto.map((x) => ({ ...x })) : [];
  const q = (p.ids || {}).wikidata;
  const pintar = (fotos = {}) => {
    if (!lista.length || !document.body.contains(box) || !fichaAbierta(p.id)) return;
    box.hidden = false;
    box.innerHTML = `<div class="sub">Reparto</div><div class="fx-reparto">${lista.slice(0, 12).map((x) => `<a class="pe-pers" href="#/persona?${x.q ? `q=${x.q}` : `n=${encodeURIComponent(x.n)}`}" data-close>
      <span class="pe-foto">${fotos[x.q] ? `<img src="${fotoCommons(fotos[x.q], 200)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${esc(x.n.split(" ").map((w) => w[0]).slice(0, 2).join(""))}</b>`}</span>
      <span class="pe-n">${esc(x.n)}</span>${x.p ? `<span class="pe-r">${esc(x.p)}</span>` : ""}</a>`).join("")}</div>`;
  };
  pintar();
  try {
    if (q) {
      const e = (await entidadesWD([q], "claims"))[q];
      const R = repartoWD(e, 12);
      const L = await entidadesWD(R.flatMap((r) => [r.q, r.pq].filter(Boolean)), "labels");
      const wd = R.map((r) => ({ n: etiqueta(L[r.q]), q: r.q, p: r.ps || (r.pq ? etiqueta(L[r.pq]) : "") || undefined })).filter((x) => x.n);
      if (!lista.length) lista = wd;
      else for (const x of lista) { const m = wd.find((y) => (x.q && y.q === x.q) || norm(y.n) === norm(x.n)); if (m) { x.p = x.p || m.p; x.q = x.q || m.q; } }
      // guarda los personajes la primera vez
      if (!ro() && lista.some((x, i) => x.p && !(p.reparto || [])[i]?.p)) api(`peliculas/${p.id}`, { method: "PUT", body: { reparto: lista.slice(0, 12) } }).then((n) => { const i = S.db.peliculas.findIndex((y) => y.id === p.id); if (i >= 0) S.db.peliculas[i] = { ...S.db.peliculas[i], ...n }; }).catch(() => {});
    }
    pintar();
    const F = await entidadesWD(lista.map((x) => x.q).filter(Boolean), "claims");
    pintar(Object.fromEntries(lista.filter((x) => x.q).map((x) => [x.q, valores(F[x.q], "P18")[0]]).filter(([, f]) => f)));
  } catch (e) { /* sin Wikidata: lo guardado */ }
}

// ---------------------------------------------------------------- Modal genérico
function modal(html, cls = "") {
  const m = $("#modal");
  delete m.dataset.film;
  m.innerHTML = `<div class="sheet ${cls}"><button class="icon-btn sheet-close" data-close title="Cerrar (Esc)">${icon("x")}</button>${html}</div>`;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  m.onclick = (e) => { if (e.target === m) closeModal(); };
}
const fichaAbierta = (id) => { const m = $("#modal"); return !!m && !m.hidden && m.dataset.film === id; };
function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; delete m.dataset.film; document.body.style.overflow = ""; }

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
        cambiarLocal("peliculas", p.id, data); // se ve ya; se guarda por detrás
        closeModal(); render._keep = true; render();
        toast(STATIC ? "Cambios guardados" : "Cambios guardados · Excel actualizado");
        enFondo(api(`peliculas/${p.id}`, { method: "PUT", body: data }), "No se guardaron los cambios");
        return;
      } else {
        const body = { ...data, ids: d.ids || {}, poster: d.poster || null, taquilla: {} };
        if (preset._pendiente) body.desdePendiente = preset._pendiente;
        closeModal();
        toast(`«${body.titulo}» añadida con un ${fmt1(body.nota)}${STATIC ? "" : " · Excel actualizado"}`);
        try {
          const r = await api("peliculas", { method: "POST", body: await completarAntes(body) });
          S.db.peliculas.push(r); S.prof = null;
          if (body.desdePendiente) S.db.pendientes = S.db.pendientes.filter((x) => x.id !== body.desdePendiente);
          renderChrome(); render._keep = true; render();
        } catch (e) { toast(`No se guardó «${body.titulo}»: ${e.message}`, "x"); }
        return;
      }
      await refreshDB();
      closeModal();
      render._keep = true;
      render();
    } catch (e) { toast(e.message, "x"); btn.disabled = false; }
  };
}

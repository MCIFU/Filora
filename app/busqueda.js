// Filora · Wikidata, cuentas, añadir y buscador. Comparte el ámbito global con app.js (se cargan en orden desde index.html).
// ---------------------------------------------------------------- Búsqueda en Wikidata desde el navegador (web publicada)
const WD_FILM = new Set(["Q11424", "Q202866", "Q24869", "Q229390", "Q506240", "Q17517379", "Q93204", "Q20650540", "Q226730", "Q1261214", "Q336144", "Q110956863", "Q24862"]);
const WD_TV = new Set(["Q5398426", "Q1259759", "Q15416", "Q526877", "Q63952888", "Q117467246", "Q3464665", "Q21191270", "Q1366112", "Q581714"]);
const WD_GEN = [[/superh[ée]ro|superhero/, "Superhéroes"], [/terror|horror|slasher/, "Terror"], [/ciencia ficci|science fiction/, "Ciencia ficción"],
  [/animaci|animad|animated|anime/, "Animación"], [/document/, "Documental"], [/comedia|comedy|parod|sátira|satire/, "Comedia"],
  [/suspense|thriller/, "Thriller"], [/acci[óo]n|action|artes marciales/, "Acción"], [/aventura|adventure/, "Aventura"], [/fant[áa]s/, "Fantasía"],
  [/rom[áa]n|romance|romantic/, "Romance"], [/musical/, "Musical"], [/b[ée]lic|guerra|war film/, "Bélico"], [/western|w[ée]stern|del oeste/, "Western"],
  [/misterio|mystery|detectiv/, "Misterio"], [/biogr/, "Biográfico"], [/hist[óo]ric|period/, "Histórico"], [/famil|infantil|children/, "Familiar"],
  [/crim|polic|g[áa]ngster|noir|heist|atracos/, "Crimen"], [/drama/, "Drama"]];
// Reparto de una entidad de Wikidata con su personaje (P453 «papel» o P4633 «nombre del personaje»)
function repartoWD(e, n = 12) {
  return (((e && e.claims) || {}).P161 || []).filter((c) => c.rank !== "deprecated" && c.mainsnak && c.mainsnak.datavalue).slice(0, n).map((c) => {
    const ql = c.qualifiers || {}, v = (k) => ((ql[k] || [])[0] || {}).datavalue;
    return { q: c.mainsnak.datavalue.value.id, pq: (v("P453") || {}).value?.id || null, ps: (v("P4633") || {}).value || null };
  });
}
// Trama de una película: sección «Argumento» de Wikipedia (es, si no en) o, si no hay, el resumen inicial
const SECC_TRAMA = /^(argumento|sinopsis|trama|historia|plot|synopsis|premise)$/i;
async function tramaWiki(esw, enw) {
  for (const [l, t] of [["es", esw], ["en", enw]]) {
    if (!t) continue;
    try {
      const d = await (await wmFetch(`https://${l}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: "query", prop: "extracts", explaintext: "1", titles: t, redirects: "1", format: "json", origin: "*" }))).json();
      const txt = (Object.values((d.query || {}).pages || {})[0] || {}).extract || "";
      const partes = txt.split(/\n(==+) ?([^=\n]+?) ?==+\n/);
      for (let i = 1; i < partes.length; i += 3) if (SECC_TRAMA.test(partes[i + 1].trim()) && partes[i + 2].trim().length > 80) return { texto: partes[i + 2].trim(), lengua: l, titulo: t, completa: true };
      if (l === "es" && partes[0].trim().length > 80) return { texto: partes[0].trim(), lengua: l, titulo: t, completa: false };
    } catch (e) { /* esa Wikipedia no responde */ }
  }
  return null;
}
function tramaHTML(tr) {
  if (!tr) return "";
  const parr = tr.texto.split(/\n+/).filter((x) => x.trim());
  const corto = parr.join(" ").length > 900;
  return `<div class="sub">${tr.completa ? "Trama" : "Sobre la película"}${tr.lengua === "en" ? " · en inglés" : ""}</div>
    <div class="trama ${corto ? "plegada" : ""}">${parr.map((x) => `<p>${esc(x)}</p>`).join("")}</div>
    ${corto ? `<button class="btn btn-sm btn-ghost trama-mas" onclick="this.previousElementSibling.classList.remove('plegada');this.remove()">Leer la trama completa</button>` : ""}
    <div class="dim trama-fuente">Fuente: <a href="https://${tr.lengua}.wikipedia.org/wiki/${encodeURIComponent(tr.titulo)}" target="_blank" rel="noopener">Wikipedia</a></div>`;
}
// Tráiler en YouTube: el oficial de Wikidata (P1651) si lo hay, y búsquedas en versión original y en español
function trailerHTML(p, ytId) {
  const vo = `${p.tituloOriginal || p.tituloEn || p.titulo} ${p.anio || ""} official trailer`.trim();
  const es = `${p.titulo} ${p.anio || ""} tráiler español`.trim();
  const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  return `<div class="sub">Tráiler</div><div class="trailers">
    <a class="trailer" href="${ytId ? `https://www.youtube.com/watch?v=${esc(ytId)}` : yt(vo)}" target="_blank" rel="noopener">${ytId ? `<img src="https://i.ytimg.com/vi/${esc(ytId)}/mqdefault.jpg" alt="" loading="lazy">` : ""}<span class="yt">▶</span><span><b>Versión original</b><small>YouTube</small></span></a>
    <a class="trailer" href="${yt(es)}" target="_blank" rel="noopener"><span class="yt">▶</span><span><b>En español</b><small>YouTube</small></span></a></div>`;
}
// Wikidata y Wikipedia: en la web, a través de Vercel (caché de una semana); si falla, directo
async function wmFetch(url) {
  if (STATIC) {
    try { const r = await fetch(`${API}/api/wm?u=${encodeURIComponent(url)}`); if (r.ok) return r; } catch (e) { /* directo */ }
  }
  return fetch(url);
}
async function wdApi(params, host = "www.wikidata.org") {
  const u = `https://${host}/w/api.php?` + new URLSearchParams({ ...params, format: "json", origin: "*" });
  const r = await wmFetch(u);
  return r.json();
}
async function wikiBuscar(q) {
  const s = await wdApi({ action: "wbsearchentities", search: q, language: "es", uselang: "es", type: "item", limit: "12" });
  return wikiDesdeQ((s.search || []).map((x) => x.id));
}
// Películas de Wikidata con sus ids de IMDb (tt…): así se cruza lo que reconoce IMDb
async function wikiPorImdb(tts) {
  tts = tts.filter((t) => /^tt\d+$/.test(t)).slice(0, 6);
  if (!tts.length) return [];
  const s = await wdApi({ action: "query", list: "search", srsearch: `haswbstatement:${tts.map((t) => `P345=${t}`).join("|")}`, srlimit: "10" });
  return wikiDesdeQ(((s.query || {}).search || []).map((x) => x.title));
}
async function wikiDesdeQ(ids) {
  if (!ids.length) return [];
  const ents = (await wdApi({ action: "wbgetentities", ids: ids.join("|"), props: "claims|labels|sitelinks", languages: "es|en", sitefilter: "enwiki" })).entities || {};
  const cv = (e, p) => ((e.claims || {})[p] || []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value)
    .filter((v) => v != null).map((v) => (typeof v === "object" ? v.id || v.time || v.amount || v.text : v));
  const esPeli = (e) => { const t = cv(e, "P31"); return t.some((x) => WD_FILM.has(x)) || (cv(e, "P345").some((x) => String(x).startsWith("tt")) && !t.some((x) => WD_TV.has(x)) && cv(e, "P57").length > 0); };
  const pelis = ids.map((i) => ents[i]).filter((e) => e && !e.missing && esPeli(e)).slice(0, 8);
  if (!pelis.length) return [];
  const refs = [...new Set(pelis.flatMap((e) => [...cv(e, "P57").slice(0, 3), ...cv(e, "P495").slice(0, 1), ...cv(e, "P136"), ...repartoWD(e, 10).flatMap((r) => [r.q, r.pq].filter(Boolean))]))];
  const labs = {};
  for (let i = 0; i < refs.length; i += 50) Object.assign(labs, (await wdApi({ action: "wbgetentities", ids: refs.slice(i, i + 50).join("|"), props: "labels", languages: "es|en" })).entities || {});
  const lab = (e, l = "es") => (e && e.labels && ((e.labels[l] || e.labels.en || {}).value)) || "";
  const titulos = pelis.map((e) => e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title).filter(Boolean);
  const posters = {};
  if (titulos.length) try { // si Wikipedia no responde, se sigue sin carteles (los pone IMDb)
    const d = await wdApi({ action: "query", titles: titulos.join("|"), prop: "pageimages", piprop: "thumbnail", pithumbsize: "342", pilicense: "any", redirects: "1" }, "en.wikipedia.org");
    const q2 = d.query || {};
    const back = Object.fromEntries([...(q2.redirects || []), ...(q2.normalized || [])].map((r) => [r.to, r.from]));
    for (const p of Object.values(q2.pages || {})) if (p.thumbnail) posters[back[p.title] || p.title] = p.thumbnail.source.split("?")[0];
  } catch (e) { /* sin carteles de Wikipedia */ }
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
      titulo: lab(e, "es"), tituloOriginal: cv(e, "P1476")[0] || lab(e, "en"), tituloEn: lab(e, "en") || null, anio: anio ? +anio : null,
      duracion: dur ? Math.round(+dur) : null, director: cv(e, "P57").slice(0, 3).map((d) => lab(labs[d])).filter(Boolean).join(" / "),
      pais: lab(labs[cv(e, "P495")[0]]), generos: generos.slice(0, 3), ids: idsExt,
      reparto: repartoWD(e, 10).map((r) => ({ n: lab(labs[r.q]), q: r.q, p: r.ps || (r.pq ? lab(labs[r.pq]) : "") || undefined })).filter((x) => x.n), poster: posters[enw] || null,
    };
  });
}
// Póster por IMDb (función de Vercel): el respaldo cuando Wikipedia no tiene cartel
async function posterWeb(p) {
  try {
    const q = new URLSearchParams(p.ids && p.ids.imdb ? { imdb: p.ids.imdb } : { t: p.tituloOriginal || p.titulo, ...(p.anio ? { y: p.anio } : {}) });
    const r = await fetch(`${API_WEB}/api/poster?${q}`, { signal: AbortSignal.timeout(6000) });
    return r.ok ? r.json() : {};
  } catch (e) { return {}; }
}
// Completa datos y póster ANTES de guardar: una sola escritura y la película entra ya con su cartel
async function completarAntes(body) {
  if (!STATIC) return body; // el servidor del PC lo completa él solo
  const b = { ...body, ids: { ...(body.ids || {}) } };
  if (!b.ids.wikidata) {
    try {
      const m = (await wikiBuscar(b.titulo)).find((r) => !b.anio || !r.anio || Math.abs(r.anio - b.anio) <= 1);
      if (m) {
        b.ids = { ...m.ids, ...b.ids };
        if (!b.poster && m.poster) b.poster = m.poster;
        for (const k of ["tituloOriginal", "tituloEn", "director", "pais", "duracion", "anio"]) if (!b[k] && m[k]) b[k] = m[k];
        if (!(b.generos || []).length && m.generos.length) b.generos = m.generos;
        if (!(b.reparto || []).length && (m.reparto || []).length) b.reparto = m.reparto;
      }
    } catch (e) { /* sin Wikidata */ }
  }
  if (!b.poster) {
    const r = await posterWeb(b);
    if (r.poster) { b.poster = r.poster; if (r.imdb && !b.ids.imdb) b.ids.imdb = r.imdb; }
  }
  // notas de las webs ya consultadas (p. ej. al ver su ficha antes de añadirla): la nota final sale completa al momento
  if (!b.notasWeb && typeof cacheLeer === "function") {
    const n = cacheLeer("notas." + (b.ids.imdb || b.ids.wikidata || norm(b.titulo)), 30);
    if (n) {
      b.notasWeb = { ...(n.fa ? { fa: [n.fa.v, n.fa.n] } : {}), ...(n.lb ? { lb: [n.lb.v, n.lb.n] } : {}), ...(n.sc ? { sc: n.sc } : {}), t: todayISO() };
      if (n.imdb && !b.imdbNota) b.imdbNota = [n.imdb.v, n.imdb.n];
    }
  }
  if (b.ids.imdb && !(b.taquilla || {}).consultado) {
    try {
      const { presupuesto, ...taq } = await (await fetch(`${API_WEB}/api/taquilla?imdb=${b.ids.imdb}`, { signal: AbortSignal.timeout(9000) })).json();
      b.taquilla = { ...(b.taquilla || {}), ...taq, fuente: "boxofficemojo", consultado: todayISO() };
      if (presupuesto) b.presupuesto = presupuesto;
    } catch (e) { /* se consultará al abrir la ficha */ }
  }
  return b;
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
  if (!ses && typeof nubeActiva === "function" && nubeActiva()) {
    const c = nubeCfg();
    modal(`<div class="sheet-body"><div class="eyebrow">Sincronizada con GitHub</div><h2 class="h2" style="margin:6px 0 10px">${esc(c.repo)}</h2>
      <p class="muted" style="margin:0 0 18px">${fmtInt(S.db.peliculas.length)} películas. Se guardan en tu repositorio privado de GitHub, sin Vercel; el PC se sincroniza con el mismo repositorio.</p>
      <button class="btn" id="nubeOff" style="width:100%;justify-content:center">${icon("x")}Desconectar este dispositivo</button></div>`, "narrow");
    $("#nubeOff").onclick = async () => { nubeGuardarCfg(null); document.documentElement.classList.toggle("ro", ro()); closeModal(); await refreshDB(); render(); toast("Desconectado de GitHub"); };
    return;
  }
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
    <button type="button" class="btn btn-ghost" id="cNube" style="width:100%;justify-content:center;margin-top:10px">${icon("refresh")}Sin Vercel: conectar con GitHub</button>
    </div>`, "narrow");
  $("#cNube").onclick = () => openNube();
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
      const r = await fetch(`${API}/api/${crear ? "registro" : "entrar"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, clave, ...(pin ? { pin } : {}) }) });
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
// Sin Vercel: tu colección en un repositorio privado de GitHub, con una clave personal guardada solo en este dispositivo
function openNube() {
  const c = (typeof nubeCfg === "function" && nubeCfg()) || { repo: "MCIFU/filora-datos" };
  modal(`<div class="sheet-body"><div class="eyebrow">Sincronizar sin Vercel</div><h2 class="h2" style="margin:6px 0 10px">Conectar con GitHub</h2>
    <p class="muted" style="margin:0 0 14px">Tu colección se guarda en un repositorio <b>privado</b> tuyo de GitHub. Pon aquí el mismo repositorio y la misma clave que en Ajustes de Filora en el PC.</p>
    <form id="nubeF" novalidate>
      <label class="lbl" for="nRepo">Repositorio privado</label><input class="input" id="nRepo" value="${esc(c.repo || "")}" placeholder="MCIFU/filora-datos" autocapitalize="none" spellcheck="false">
      <label class="lbl" for="nTok" style="margin-top:12px">Clave de GitHub</label><input class="input" id="nTok" type="password" autocomplete="off" placeholder="github_pat_…">
      <p id="nErr" role="alert" style="color:var(--red);min-height:22px;margin:10px 0 6px"></p>
      <button class="btn btn-primary" id="nBtn" style="width:100%;justify-content:center">${icon("check")}Conectar</button>
    </form></div>`, "narrow");
  $("#nubeF").onsubmit = async (ev) => {
    ev.preventDefault();
    const cfg = { repo: $("#nRepo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""), token: $("#nTok").value.trim() };
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo) || !cfg.token) { $("#nErr").textContent = "Pon el repositorio (usuario/nombre) y la clave."; return; }
    $("#nBtn").disabled = true;
    try {
      await nubeProbar(cfg);
      nubeGuardarCfg(cfg); setSes(null);
      try { localStorage.removeItem(PIN_KEY); } catch (e) { /* */ }
      document.documentElement.classList.toggle("ro", ro());
      closeModal(); await refreshDB(); location.hash = "#/inicio"; render();
      toast(`Conectado a ${cfg.repo}: ${fmtInt(S.db.peliculas.length)} películas`, "check");
    } catch (e) { $("#nErr").textContent = e.message; } finally { $("#nBtn").disabled = false; }
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
    const r = await fetch(`${API}/api/login`, { method: "POST", headers: { "X-Pin": pin } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { $("#loginErr").textContent = j.error || "No se pudo entrar"; return; }
    setSes(null);
    try { localStorage.setItem(PIN_KEY, pin); } catch (e) { /* */ }
    document.documentElement.classList.toggle("ro", ro());
    closeModal(); await refreshDB(); render(); toast("Modo edición activado en este dispositivo");
  };
}
async function logout() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("filora.copia.")) localStorage.removeItem(k); } catch (e) { /* */ }
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
// ---------------------------------------------------------------- Buscador: películas, personas y tu colección
// IMDb responde en ~1 s con películas y personas (con foto); Wikidata solo se usa al abrir una ficha.
const CACHE_BQ = new Map();
async function buscarWeb(q) {
  const k = norm(q);
  if (CACHE_BQ.has(k)) return CACHE_BQ.get(k);
  const pr = (fetch(`${API_WEB}/api/imdb?todo=1&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(7000) }).then((r) => (r.ok ? r.json() : null)))
    .then((r) => r || { pelis: [], personas: [] }).catch(() => { CACHE_BQ.delete(k); return { pelis: [], personas: [] }; });
  CACHE_BQ.set(k, pr);
  return pr;
}
// Q de Wikidata a partir de un id de IMDb (tt… o nm…)
async function qPorImdb(id) {
  if (!/^(tt|nm)\d+$/.test(id || "")) return null;
  const s = await wdApi({ action: "query", list: "search", srsearch: `haswbstatement:P345=${id}`, srlimit: "1" });
  return (((s.query || {}).search || [])[0] || {}).title || null;
}
const inicialesDe = (n) => esc(String(n || "").split(/\s+/).map((w) => w[0]).slice(0, 2).join(""));
VIEWS.buscar = (v, qs) => {
  const q0 = qs.get("q") || "";
  v.innerHTML = `<div class="page-head"><div><h1 class="h1">Buscar</h1><p>Películas, directores, actores y actrices. También busca en tu colección.</p></div></div>
    <label class="search bq-caja">${icon("search")}<input class="input" id="bq" placeholder="Crepúsculo, Bayona, Penélope Cruz…" value="${esc(q0)}" autocomplete="off" enterkeyhint="search"></label>
    <div id="bqRes"></div>`;
  const inp = $("#bq"), out = $("#bqRes");
  let t, seq = 0;
  const seccion = (titulo, html) => (html ? `<h2 class="h2 bq-h">${titulo}</h2>${html}` : "");
  const mias = (q) => {
    const nq = [...palabras(q)];
    if (!nq.length) return [];
    return S.db.peliculas.filter((p) => { const txt = [p.titulo, p.tituloOriginal, p.tituloEn, p.director, p.pais, ...(p.reparto || []).map((x) => x.n)].filter(Boolean).join(" ");
      const w = palabras(txt); return nq.every((x) => w.has(x) || [...w].some((y) => y.startsWith(x))); }).slice(0, 24);
  };
  const pintar = (q, M, web) => {
    const tengo = new Map(S.db.peliculas.filter((p) => p.ids && p.ids.imdb).map((p) => [p.ids.imdb, p]));
    const htmlMias = M.length ? `<div class="posters">${M.map((p) => pcard(p)).join("")}</div>` : "";
    let resto = `<div class="bq-cargando"><span class="bobina"></span>Buscando películas y personas…</div>`;
    if (web) {
      const pers = web.personas.length ? `<div class="bq-pers">${web.personas.map((x) => `<a class="pe-pers" href="#/persona?imdb=${x.imdb}&n=${encodeURIComponent(x.nombre)}"><span class="pe-foto">${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${inicialesDe(x.nombre)}</b>`}</span><span class="pe-n">${esc(x.nombre)}</span><span class="pe-r">${esc(x.desc)}</span></a>`).join("")}</div>` : "";
      const pelis = web.pelis.length ? `<div class="posters">${web.pelis.map((r) => { const m = tengo.get(r.imdb);
        return m ? pcard(m) : `<a class="pcard" href="#/pelicula?imdb=${r.imdb}"><div class="frame">${posterHTML(r)}${r.anio && r.anio > new Date().getFullYear() ? `<span class="pronto">Próximamente</span>` : ""}</div><div class="meta"><div class="t">${esc(r.titulo)}</div><div class="s">${esc([r.anio, r.reparto].filter(Boolean).join(" · "))}</div></div></a>`; }).join("")}</div>` : "";
      resto = seccion("Personas", pers) + seccion("Películas", pelis);
      if (!resto && !M.length) resto = `<div class="empty">No encuentro nada con «${esc(q)}».</div>`;
    }
    out.innerHTML = seccion(`En tu colección · ${M.length}`, htmlMias) + resto;
  };
  const buscar = async () => {
    const q = inp.value.trim();
    history.replaceState(null, "", `#/buscar${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const my = ++seq;
    if (q.length < 2) { out.innerHTML = ""; return; }
    const M = mias(q);
    pintar(q, M, null); // tu colección, al instante
    const web = await buscarWeb(q);
    if (my === seq) pintar(q, M, web);
  };
  inp.oninput = () => { clearTimeout(t); t = setTimeout(buscar, 180); };
  inp.onkeydown = (e) => { if (e.key === "Enter") { clearTimeout(t); buscar(); } };
  if (q0) buscar();
  setTimeout(() => inp.focus(), 60);
};
const durTxt = (m) => (m > 0 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : "");
async function imdbBuscar(q) {
  try { const r = await fetch(`${API_WEB}/api/imdb?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) }); return r.ok ? r.json() : []; } catch (e) { return []; }
}
const palabras = (t) => new Set(String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !["la", "el", "los", "las", "de", "del", "the", "of", "y", "and", "a"].includes(w)));
function parecido(a, b) { const A = palabras(a), B = palabras(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; }
// Candidatos de Wikidata (título exacto) e IMDb (entiende títulos aproximados en español), cruzados por id de IMDb
async function candidatosPeli(titulo) {
  const [wd, im] = await Promise.all([wikiBuscar(titulo).catch(() => []), imdbBuscar(titulo)]);
  const tengo = new Set(wd.map((r) => r.ids.imdb).filter(Boolean));
  const extra = await wikiPorImdb(im.map((x) => x.imdb).filter((t) => !tengo.has(t))).catch(() => []);
  const todos = [...wd, ...extra];
  const porImdb = new Map(todos.filter((r) => r.ids.imdb).map((r) => [r.ids.imdb, r]));
  im.forEach((x, i) => {
    const r = porImdb.get(x.imdb);
    if (r) { r.rangoImdb = i; if (!r.poster) r.poster = x.poster; if (!r.tituloEn) r.tituloEn = x.titulo; }
    else todos.push({ titulo: x.titulo, tituloEn: x.titulo, tituloOriginal: x.titulo, anio: x.anio, duracion: null, director: "", pais: "", generos: [], ids: { imdb: x.imdb }, poster: x.poster, reparto: x.reparto ? x.reparto.split(", ").map((n) => ({ n })) : [], rangoImdb: i });
  });
  return todos;
}
// Reconoce la película con todo lo que escribes: título (aunque no sea exacto), año, director y duración
function puntuar(r, { titulo, anio, director, duracion }) {
  let p = Math.max(parecido(titulo, r.titulo), parecido(titulo, r.tituloEn), parecido(titulo, r.tituloOriginal)) * 3;
  if (r.rangoImdb != null) p += Math.max(0, 2 - r.rangoImdb * 0.5);
  if (anio && r.anio) p += r.anio === anio ? 4 : Math.abs(r.anio - anio) <= 1 ? 2 : -4;
  if (director && r.director) { const ap = palabras(director); p += [...palabras(r.director)].some((w) => ap.has(w)) ? 4 : -2; }
  if (duracion && r.duracion) p += Math.abs(r.duracion - duracion) <= 5 ? 2 : -1;
  if (!anio && r.anio && r.anio > new Date().getFullYear()) p -= 3; // sin año, mejor la ya estrenada que una futura
  if (r.ids && r.ids.wikidata) p += 0.5;
  return p;
}
async function identificar(d) {
  const c = await candidatosPeli(d.titulo);
  const orden = c.map((r) => [puntuar(r, d), r]).sort((x, y) => y[0] - x[0]);
  return orden.length && orden[0][0] > 0.5 ? orden[0][1] : null;
}
VIEWS.anadir = (v) => {
  if (ro()) { location.hash = "#/inicio"; return; }
  const recientes = [...S.db.peliculas].sort((a, b) => String(b.añadido || "").localeCompare(String(a.añadido || ""))).slice(0, 24);
  // tus sitios habituales (los más usados) y tus cines, para elegir con un toque
  const usos = {};
  for (const p of S.db.peliculas) if (p.lugar) usos[p.lugar] = (usos[p.lugar] || 0) + 1;
  const lugares = [...new Set([...Object.entries(usos).sort((a, b) => b[1] - a[1]).map(([l]) => l), ...misCines().map((c) => c.nombre)])].slice(0, 12);
  const campo = (k, l, extra = "") => `<label class="rg-f rg-${k}"><span>${l}</span><input class="input" id="rg_${k}" autocomplete="off" ${extra}></label>`;
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Añadir película</h1>
    <p>Escribe el título y tu nota. Reconozco la película y le añado sola el cartel, la duración, el director, el género y el reparto.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-importar>${icon("download")}Importar de Letterboxd, IMDb…</button><button class="btn" id="xlPaste">${icon("upload")}Pegar filas de Excel</button></div></div>
  <form class="registro" id="rgForm" autocomplete="off">
    <div class="rg-campos">
      <div class="rg-f rg-titulo ac"><label for="rg_titulo"><span>Película</span></label><input class="input" id="rg_titulo" autocomplete="off" placeholder="Escribe el título: te propongo la película con su cartel" role="combobox" aria-controls="rgAc" aria-expanded="false"><div class="ac-list" id="rgAc" role="listbox" hidden></div></div>
      ${campo("nota", "Tu nota", 'inputmode="decimal" placeholder="0–10"')}
      ${campo("fecha", "La viste el", `type="date" value="${todayISO()}" max="${todayISO()}"`)}
      <label class="rg-f rg-lugar"><span>Dónde</span><input class="input" id="rg_lugar" autocomplete="off" placeholder="Cine, Netflix, en casa…" list="rgLugares">
        <datalist id="rgLugares">${lugares.map((l) => `<option value="${esc(l)}">`).join("")}</datalist></label>
      <label class="rg-f rg-resena"><span>Reseña <em class="rg-opc">opcional</em></span><input class="input" id="rg_resena" autocomplete="off" maxlength="280" placeholder="En una línea: qué te pareció"></label>
      ${lugares.length ? `<div class="rg-chips">${lugares.slice(0, 6).map((l) => `<button type="button" class="chip" data-lugar="${esc(l)}">${esc(l)}</button>`).join("")}</div>` : ""}
      <details class="rg-mas" id="rgMas"><summary>Corregir datos <span class="dim">duración, año, director y país: se rellenan solos</span></summary>
        <div class="rg-mas-c">
        ${campo("duracion", "Duración (min)", 'inputmode="numeric" placeholder="144"')}
        ${campo("anio", "Año de estreno", 'inputmode="numeric" placeholder="2023"')}
        ${campo("director", "Director", 'placeholder="J. A. Bayona"')}
        ${campo("pais", "País", 'placeholder="España"')}
        </div></details>
    </div>
    <div class="rg-match" id="rgMatch"><div class="rg-vacio">Escribe el título y te digo qué película es.</div></div>
    <button class="btn btn-primary rg-go" id="rgSave" type="submit">${icon("check")}Añadir a mi colección</button>
  </form>
  <h2 class="h2" style="margin:34px 0 16px">Últimas añadidas</h2>
  <div class="posters" id="rgRecientes">${recientes.map((p) => pcard(p)).join("")}</div>`;

  const F = (k) => $(`#rg_${k}`);
  const leer = () => ({
    titulo: F("titulo").value.trim(), duracion: parseInt(F("duracion").value, 10) || null, anio: parseInt(F("anio").value, 10) || null,
    director: F("director").value.trim() || null, pais: F("pais").value.trim() || null,
    nota: F("nota").value.trim() ? Math.round(clamp(parseFloat(F("nota").value.replace(",", ".")), 0, 10) * 10) / 10 : null,
    fecha: F("fecha").value || todayISO(), lugar: F("lugar").value.trim() || null, resena: F("resena").value.trim(),
  });
  let match = null, t, seq = 0;
  const pintar = (m, d) => {
    const box = $("#rgMatch");
    if (!d.titulo) { box.innerHTML = `<div class="rg-vacio">Escribe el título y te digo qué película es.</div>`; return; }
    if (!m) { $("#rgMas").open = true; box.innerHTML = `<div class="rg-vacio">No la reconozco todavía. Prueba a añadir el año o el director (se guardará igualmente tal cual).</div>`; return; }
    box.innerHTML = `<div class="rg-mini">${m.poster ? `<img src="${esc(m.poster)}" alt="" referrerpolicy="no-referrer">` : ""}</div>
      <div class="rg-info"><div class="eyebrow">Es esta</div><div class="rg-t">${esc(m.titulo)}</div>
      <div class="dim">${esc(m.tituloEn && norm(m.tituloEn) !== norm(m.titulo) ? m.tituloEn : "")}</div>
      <div class="s">${esc([m.anio, durTxt(d.duracion || m.duracion), m.director, m.pais].filter(Boolean).join(" · "))}</div>
      <div class="s">${esc((m.generos || []).join(" · "))}</div></div>`;
  };
  const buscar = () => {
    clearTimeout(t);
    const d = leer();
    $("#rgSave").disabled = !d.titulo;
    t = setTimeout(async () => {
      if (d.titulo.length < 2) { match = null; return pintar(null, d); }
      const my = ++seq;
      $("#rgMatch").classList.add("cargando");
      const m = await identificar(d);
      if (my !== seq) return;
      $("#rgMatch").classList.remove("cargando");
      match = m; pintar(m, d);
      if (m) for (const k of ["anio", "duracion", "director", "pais"]) {
        const el = F(k);
        if ((!el.value.trim() || el.classList.contains("auto")) && m[k]) { el.value = m[k]; el.classList.add("auto"); }
      }
      if (m && m.duracion) $(".rg-duracion span").textContent = `Duración · ${durTxt(parseInt(F("duracion").value, 10))}`;
    }, 450);
  };
  ["titulo", "anio", "director", "duracion"].forEach((k) => F(k).addEventListener("input", () => {
    F(k).classList.remove("auto");
    if (k === "titulo") $$(".rg-f .auto").forEach((el) => { el.value = ""; el.classList.remove("auto"); }); // otra película: fuera lo rellenado
    buscar();
  }));
  F("duracion").addEventListener("input", () => {
    const d = leer();
    const s = $(".rg-duracion span"); s.textContent = d.duracion ? `Duración · ${durTxt(d.duracion)}` : "Duración (min)";
  });
  // propuestas con cartel mientras escribes el título (IMDb): ↑/↓ para moverte, Intro o clic para elegir;
  // si no eliges ninguna, Intro añade la película tal cual la has escrito
  const acL = $("#rgAc"), tit = F("titulo");
  let acRes = [], acSel = -1, acT, acSeq = 0;
  const acCerrar = () => { acL.hidden = true; acSel = -1; tit.setAttribute("aria-expanded", "false"); };
  const acPintar = () => {
    acL.innerHTML = acRes.map((r, i) => `<div class="ac-item ${i === acSel ? "sel" : ""}" role="option" data-i="${i}"><div class="mini">${r.poster ? `<img src="${esc(r.poster)}" referrerpolicy="no-referrer" alt="">` : ""}</div><div><div style="font-weight:600">${esc(r.titulo)} <span class="dim">${r.anio || ""}</span></div><div class="s">${esc(r.reparto || "")}</div></div></div>`).join("")
      + `<div class="ac-empty">¿No está? Pulsa Intro y se añade tal cual.</div>`;
    $$(".ac-item", acL).forEach((el) => (el.onmousedown = (ev) => { ev.preventDefault(); acElegir(acRes[+el.dataset.i]); }));
  };
  const acElegir = (r) => {
    acCerrar();
    tit.value = r.titulo;
    if (r.anio) { F("anio").value = r.anio; F("anio").classList.remove("auto"); }
    $$(".rg-f .auto").forEach((el) => { if (el !== F("anio")) { el.value = ""; el.classList.remove("auto"); } });
    buscar();
    F("nota").focus();
  };
  tit.addEventListener("input", () => {
    clearTimeout(acT);
    const q = tit.value.trim();
    if (q.length < 2) return acCerrar();
    acT = setTimeout(async () => {
      const my = ++acSeq;
      const r = typeof buscarWeb === "function" ? await buscarWeb(q) : { pelis: [] };
      if (my !== acSeq || tit.value.trim() !== q) return;
      acRes = (r.pelis || []).slice(0, 6); acSel = -1;
      if (!acRes.length) return acCerrar();
      acPintar(); acL.hidden = false; tit.setAttribute("aria-expanded", "true");
    }, 250);
  });
  tit.addEventListener("keydown", (ev) => {
    if (acL.hidden) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); acSel = ev.key === "ArrowDown" ? Math.min(acSel + 1, acRes.length - 1) : Math.max(acSel - 1, -1); acPintar(); }
    else if (ev.key === "Enter" && acSel >= 0) { ev.preventDefault(); acElegir(acRes[acSel]); }
    else if (ev.key === "Escape") acCerrar();
  });
  tit.addEventListener("blur", () => setTimeout(acCerrar, 150));
  $("#rgSave").disabled = true;
  $("#rgForm").onsubmit = async (ev) => {
    acCerrar();
    ev.preventDefault();
    const d = leer();
    if (!d.titulo) return F("titulo").focus();
    const dup = S.db.peliculas.find((x) => (norm(x.titulo) === norm(d.titulo) || norm(x.tituloOriginal) === norm(d.titulo)) && (!d.anio || !x.anio || Math.abs(x.anio - d.anio) <= 1));
    if (dup && !confirm(`Ya tienes «${dup.titulo}» (${dup.anio || "s/a"}). ¿Añadirla otra vez?`)) return;
    const m = match;
    // lo que escribes manda; lo reconocido rellena el resto
    const body = {
      titulo: (m && m.titulo) || d.titulo, tituloOriginal: m ? m.tituloOriginal : null, tituloEn: m ? m.tituloEn : null,
      anio: d.anio || (m && m.anio) || null, duracion: d.duracion || (m && m.duracion) || null,
      director: d.director || (m && m.director) || null, pais: d.pais || (m && m.pais) || null, nota: d.nota,
      generos: m ? m.generos : [], ids: m ? m.ids : {}, poster: m ? m.poster : null, reparto: m ? m.reparto || [] : [],
      taquilla: {}, resena: d.resena, favorita: false, fechaVisto: d.fecha, ...(d.lugar ? { lugar: d.lugar } : {}),
    };
    const tmp = { ...body, id: `tmp${Date.now()}` };
    $("#rgRecientes").insertAdjacentHTML("afterbegin", pcard(tmp));
    const card = () => document.querySelector(`#rgRecientes [data-open="${tmp.id}"]`);
    card().classList.add("xl-guardando");
    toast(`«${body.titulo}» añadida${body.nota != null ? ` con un ${fmt1(body.nota)}` : ""}`);
    $("#rgForm").reset(); F("fecha").value = d.fecha; F("lugar").value = d.lugar || ""; $("#rgMas").open = false; $$(".rg-f .auto").forEach((el) => el.classList.remove("auto")); match = null; pintar(null, { titulo: "" }); $("#rgSave").disabled = true; $(".rg-duracion span").textContent = "Duración (min)"; F("titulo").focus();
    try {
      const p = await api("peliculas", { method: "POST", body: await completarAntes(body) });
      S.db.peliculas.push(p); S.prof = null;
      const c = card(); if (c) c.outerHTML = pcard(p);
      renderChrome();
    } catch (e) { const c = card(); if (c) c.remove(); toast(`No se guardó «${body.titulo}»: ${e.message}`, "x"); }
  };
  const marcarLugar = () => $$("[data-lugar]", v).forEach((x) => x.classList.toggle("on", x.dataset.lugar === F("lugar").value));
  $$("[data-lugar]", v).forEach((b) => (b.onclick = () => { F("lugar").value = F("lugar").value === b.dataset.lugar ? "" : b.dataset.lugar; marcarLugar(); }));
  F("lugar").addEventListener("input", marcarLugar);
  $("#xlPaste").onclick = openPegar;
  setTimeout(() => F("titulo").focus(), 80);
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
    if (["series", "coleccion"].includes(route().name)) { render._keep = true; render(); }
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

// Filora · Tus cines, cartelera y menú «Más». Comparte el ámbito global con app.js (se cargan en orden desde index.html).
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
  if (typeof nubeActiva === "function" && nubeActiva()) { nubeAvisarCines({ cines: misCines() }).catch(() => {}); return; } // sin Vercel: GitHub
  try {
    const r = await fetch(`${API}/api/demanda`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cines: ids }) });
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
      const varios = Array.isArray(dia);
      const dias = Object.keys(v.dias).sort().filter((d) => (varios ? dia.includes(d) : dia ? d === dia : d >= hoy)).slice(0, varios ? dia.length : maxDias);
      return dias.map((d) => `<div class="ses-row"><span class="ses-v">${esc(versionCorta(v.nombre))}${!dia || varios ? ` · <span class="dim">${d === hoy ? "hoy" : `${diaSemana(d).slice(0, 3)} ${+d.slice(8)}`}</span>` : ""}</span>
        <span class="ses-times">${v.dias[d].map((x) => { const pasada = d === hoy && x.hora < ahora; return `<a class="time ${pasada ? "past" : ""}" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.sala || "Comprar entradas")}">${x.hora}</a>`; }).join("")}</span></div>`).join("");
    }).join("");
    return bloques ? `<div class="ses-cine"><div class="ses-name">${icon("pin")}${esc(c.nombre.replace("Premium ", ""))}</div><div class="ses-filas">${bloques}</div></div>` : "";
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
    const enDia = (v) => (Array.isArray(dia) ? dia.some((d) => v.dias[d]) : v.dias[dia]);
    if (p.cines.some((c) => (!cineId || c.id === cineId) && c.versiones.some(enDia))) out.push({ ...p, info: infoCartelera(p) });
  }
  return out.sort((a, b) => (a.info.vista ? 1 : 0) - (b.info.vista ? 1 : 0) || b.info.m.pct - a.info.m.pct);
}
function carteleraCard(p, dia, cineId) {
  const i = p.info;
  const g = i.generos.length ? i.generos : ["Drama"];
  return `<div class="card cfilm">
    <a class="frame" href="${i.vista ? `#/coleccion?ficha=${i.vista.id}` : p.fa ? `#/pelicula?fa=${p.fa}` : `#/buscar?q=${encodeURIComponent(p.titulo)}`}">${posterHTML({ titulo: p.titulo, anio: p.anio, poster: p.poster, generos: g })}</a>
    <div style="min-width:0">
      <div class="cfilm-head">
        <div style="min-width:0"><a class="t" href="${i.vista ? `#/coleccion?ficha=${i.vista.id}` : p.fa ? `#/pelicula?fa=${p.fa}` : `#/buscar?q=${encodeURIComponent(p.titulo)}`}">${esc(p.titulo)}</a><div class="s">${esc([p.director, p.pais].filter(Boolean).join(" · ") || "—")}</div></div>
        ${i.vista ? `<span class="chip on" title="Ya la tienes en tu colección">${icon("check")}Vista · ${fmt1(i.vista.nota)}</span>` : matchTag(i.m.pct)}
      </div>
      ${i.generos.length ? `<div class="chips" style="margin:8px 0 2px">${i.generos.slice(0, 3).map((x) => `<span class="chip">${x}</span>`).join("")}</div>` : ""}
      ${sesionesHTML(p, dia, 1, cineId)}
    </div></div>`;
}
// Inicio: la película que más te encaja hoy, con su porqué, a un toque de la ficha
function peliHoyHTML(recs) {
  const hoy = recs.find((r) => !r.pend) || recs[0];
  if (!hoy) return "";
  return `<section class="section"><div class="rec-hoy rec-hoy-ini">
    <a class="rec-hoy-cartel" href="${fichaDe(hoy)}">${posterHTML(hoy)}</a>
    <div><div class="eyebrow">Tu película para hoy</div><a class="rec-hoy-t" href="${fichaDe(hoy)}">${esc(hoy.titulo)}</a>
      <div class="dim">${esc([hoy.anio, hoy.director, hoy.pais].filter(Boolean).join(" · "))}</div>
      <div class="rec-hoy-n">${scoreBadge(hoy.m.nota, "lg")}<div><b>${gustaraTxt(hoy.m.pct)}</b><small class="rec-hoy-por">${esc(hoy.m.why.slice(0, 2).join(" · ") || "Nota que predigo que le darías")}</small></div></div>
      <div class="rec-hoy-acc"><a class="btn btn-primary" href="${fichaDe(hoy)}">Ver ficha</a><a class="btn btn-ghost" href="#/recomendaciones">Otras para ti</a></div>
    </div></div></section>`;
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
SUB.cartelera = (v) => {
  const st = S.cart_;
  const dias = diasCartelera();
  const finde = (() => { const sab = dias.find((d) => new Date(d + "T12:00").getDay() === 6); const dom = sab ? addDays(sab, 1) : dias.find((d) => new Date(d + "T12:00").getDay() === 0); return [sab, dom].filter((d) => d && dias.includes(d)); })();
  if (!st.dia || (st.dia !== "finde" && !dias.includes(st.dia)) || (st.dia === "finde" && !finde.length)) st.dia = dias[0];
  const diaSel = st.dia === "finde" ? finde : st.dia;
  const cines = ((S.cart && S.cart.cines) || []).filter((c) => (c.peliculas || []).length);
  const act = S.cart && S.cart.actualizado ? new Date(S.cart.actualizado) : null;
  const viejo = act && Date.now() - act.getTime() > 2.5 * 864e5;
  const L = st.dia ? enCartelera(diaSel, st.cine) : [];
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
    <div class="chips">${dias.map((d) => `<button class="chip ${d === st.dia ? "on" : ""}" data-cday="${d}">${etiqueta(d)}</button>`).join("")}${finde.length ? `<button class="chip chip-finde ${st.dia === "finde" ? "on" : ""}" data-cday="finde">Fin de semana</button>` : ""}</div>
    <div class="seg"><button data-ccine="" class="${!st.cine ? "on" : ""}">Todos</button>${cines.map((c) => `<button data-ccine="${c.id}" class="${st.cine === c.id ? "on" : ""}">${esc(cineCorto(c.nombre))}</button>`).join("")}</div>
  </div>
  <div class="result-line"><b>${L.length}</b> películas ${st.dia === "finde" ? "este fin de semana" : st.dia === hoy ? "hoy" : `el ${etiqueta(st.dia).toLowerCase()}`} · ordenadas por lo que encajan contigo</div>
  <div class="cfilms cartel-fija">${L.map((p) => carteleraCard(p, diaSel, st.cine)).join("")}</div>`
  : pendientes.length === mis.length ? "" : `<div class="empty"><div class="h2">Sin sesiones cargadas</div>${STATIC ? "Vuelve a intentarlo más tarde." : "Pulsa «Actualizar ahora» para descargarlas."}</div>`}
  ${preventa.length ? `<section class="section">${sectionHead("Entradas ya a la venta (preventa)")}<div class="cfilms cartel-fija">${preventa.map(({ p }) => carteleraCard({ ...p, info: infoCartelera(p) }, null, "")).join("")}</div></section>` : ""}`;
  const up = $("#cartUpd");
  if (up) up.onclick = async () => {
    up.disabled = true; up.innerHTML = `${icon("refresh")}Descargando… (1-2 min)`;
    try { await api("estrenos/actualizar", { method: "POST" }); await loadAll(); toast("Cartelera y estrenos actualizados"); SUB.cartelera(v); }
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

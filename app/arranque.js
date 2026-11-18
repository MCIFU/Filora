// Filora · Eventos globales, tema, PWA y arranque: va el último, cuando ya están todas las vistas. Comparte el ámbito global con app.js (se cargan en orden desde index.html).
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
  if (d.cday) { S.cart_.dia = d.cday; render._keep = true; return render(); }
  if (d.ccine !== undefined) { S.cart_.cine = d.ccine; render._keep = true; return render(); }
  if (d.close !== undefined) { if (t.tagName !== "A" || t.getAttribute("href") === "#") e.preventDefault(); closeModal(); return; }
  if (d.action === "add") return openForm();
  if (d.open) return openFilm(d.open);
  if (d.cat !== undefined && !d.open) return openCat(+d.cat);
  if (d.rel) return openRel(d.rel);
  if (d.edit) { e.preventDefault(); return openForm(S.db.peliculas.find((p) => p.id === d.edit)); }
  if (d.fav) {
    const p = S.db.peliculas.find((x) => x.id === d.fav);
    cambiarLocal("peliculas", p.id, { favorita: !p.favorita });
    openFilm(p.id); render._keep = true; render();
    enFondo(api(`peliculas/${p.id}`, { method: "PUT", body: { favorita: !p.favorita } })); return;
  }
  if (d.del) {
    const p = S.db.peliculas.find((x) => x.id === d.del);
    if (!confirm(`¿Eliminar «${p.titulo}» de tu colección?`)) return;
    S.db.peliculas = S.db.peliculas.filter((x) => x.id !== p.id); S.prof = null;
    closeModal(); toast("Película eliminada"); render._keep = true; render();
    enFondo(api(`peliculas/${p.id}`, { method: "DELETE" }), "No se pudo eliminar"); return;
  }
  if (d.want !== undefined) { const c = S.cat[+d.want]; await addPending(c, `Recomendada · ${predict(c).pct}% afinidad`); if ($("#modal").hidden) { render._keep = true; render(); } else closeModal(); return; }
  if (d.seen !== undefined) { const c = S.cat[+d.seen]; return openForm(null, { titulo: c.titulo, tituloOriginal: c.tituloOriginal, anio: c.anio, director: c.director, pais: c.pais, generos: c.generos, poster: c.poster || null, ids: c.ids || {} }); }
  if (d.nope !== undefined) {
    const c = S.cat[+d.nope]; const s = descartadas(); s.add(norm(c.tituloOriginal));
    try { localStorage.setItem("cine.desc", JSON.stringify([...s])); } catch (err) { /* */ }
    toast("Vale, no te la volveré a sugerir", "eyeoff"); render._keep = true; render(); return;
  }
  if (d.relwant) { const x = S.est.estrenos.find((y) => y.fecha + "|" + y.titulo === d.relwant); await addPending({ ...x, anio: +x.fecha.slice(0, 4), estreno: x.fecha }, `Estreno en cines el ${fechaLarga(x.fecha)}`); if ($("#modal").hidden) { render._keep = true; render(); } else closeModal(); return; }
  if (d.relseen) { const x = S.est.estrenos.find((y) => y.fecha + "|" + y.titulo === d.relseen); return openForm(null, { titulo: x.titulo, tituloOriginal: x.original || null, anio: +x.fecha.slice(0, 4), director: x.director || "", pais: x.pais || "", generos: x.generos || [], saga: x.saga || "", poster: x.poster || null, lugar: (S.est.cines || [])[0]?.nombre || "" }); }
  if (d.wseen) { const w = S.db.pendientes.find((x) => x.id === d.wseen); return openForm(null, { titulo: w.titulo, tituloOriginal: w.tituloOriginal || null, anio: w.anio || "", _pendiente: w.id }); }
  if (d.wdel && String(d.wdel).startsWith("tmp")) return; // aún guardándose
  if (d.wdel) { const w = S.db.pendientes.find((x) => x.id === d.wdel); S.db.pendientes = S.db.pendientes.filter((x) => x.id !== d.wdel); render._keep = true; render();
    toast(`«${w ? w.titulo : "Película"}» quitada de pendientes`, "x"); enFondo(api(`pendientes/${d.wdel}`, { method: "DELETE" }), "No se pudo quitar"); return; }
  if (d.serie) return openSerie(d.serie);
  if (d.sedit) return openSerieForm(S.db.series.find((s) => s.id === d.sedit));
  if (d.sdel) { if (!confirm("¿Eliminar esta serie?")) return; await api(`series/${d.sdel}`, { method: "DELETE" }); await refreshDB(); closeModal(); render(); }
});
// Atajos de teclado (PC): / buscar · n añadir · Esc cerrar · ? ayuda
const ATAJOS = [["/", "Buscar películas, personas y tu colección"], ["n", "Añadir una película"], ["c", "Ir a tu colección"], ["p", "Para ti"], ["Esc", "Cerrar la ficha o salir del campo de texto"], ["?", "Ver estos atajos"]];
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const el = document.activeElement;
  const typing = /INPUT|TEXTAREA|SELECT/.test(el?.tagName) || el?.isContentEditable;
  if (e.key === "Escape") {
    if (!$("#modal").hidden) { closeModal(); return; }
    if (typing) { el.blur(); return; }
  }
  if (typing || !$("#modal").hidden) return;
  const ir = (h) => { e.preventDefault(); if (location.hash !== h) location.hash = h; };
  if (e.key === "/") { ir("#/buscar"); setTimeout(() => $("#bq")?.focus(), 80); }
  else if (e.key === "n" && !ro()) { ir("#/anadir"); setTimeout(() => $("#rg_titulo")?.focus(), 80); }
  else if (e.key === "c") ir("#/coleccion");
  else if (e.key === "p") ir("#/recomendaciones");
  else if (e.key === "?") { e.preventDefault(); modal(`<div class="sheet-body"><div class="eyebrow">Teclado</div><h2 class="h2" style="margin:6px 0 16px">Atajos</h2>
    <dl class="atajos">${ATAJOS.map(([k, t]) => `<div><dt><kbd>${k}</kbd></dt><dd>${t}</dd></div>`).join("")}</dl></div>`, "narrow"); }
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
// Arranque instantáneo: se pinta con la última copia guardada en este navegador y se actualiza por detrás.
const COPIA_KEY = () => `filora.copia.${(getSes() || {}).usuario || (getPin() ? "pin" : "anon")}`;
function guardarCopia() {
  if (!STATIC || !S.db) return;
  try { localStorage.setItem(COPIA_KEY(), JSON.stringify({ t: Date.now(), db: S.db, est: S.est, cat: S.cat, cart: S.cartTodo })); }
  catch (e) { try { localStorage.removeItem(COPIA_KEY()); } catch (e2) { /* sin sitio */ } }
}
function leerCopia() {
  if (!STATIC) return null;
  try { const c = JSON.parse(localStorage.getItem(COPIA_KEY()) || "null"); return c && Date.now() - c.t < 30 * 864e5 && c.db && c.est && c.cat ? c : null; } catch (e) { return null; }
}
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") guardarCopia(); });
(async function init() {
  const copia = leerCopia();
  if (copia) {
    S.db = copia.db; S.est = copia.est; S.cat = copia.cat; S.cartTodo = copia.cart || { cines: [] }; S.prof = null;
    filtrarCartelera();
    render();
    try {
      const antes = JSON.stringify(S.db);
      await loadAll();
      guardarCopia();
      const escribiendo = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (JSON.stringify(S.db) !== antes && $("#modal").hidden && !escribiendo) { render._keep = true; render(); }
    } catch (e) { /* sin conexión: se queda la copia */ }
    return;
  }
  try {
    await loadAll();
    guardarCopia();
    render();
  } catch (e) {
    $("#view").innerHTML = STATIC
      ? `<div class="empty"><div class="h2">No se han podido cargar los datos</div>Prueba a recargar la página.<br><span class="dim">${esc(e.message)}</span></div>`
      : e.sinServidor
      ? `<div class="empty"><div class="h2">Falta el servidor de Filora</div>Esta dirección sirve los archivos, pero no ejecuta <code>server.py</code>, que es quien guarda tu colección.<br>En DeployHub pon <b>Servir como: Comando</b> con <code>npm start</code> (o <code>python server.py --no-browser</code>) y vuelve a desplegar.</div>`
      : `<div class="empty"><div class="h2">No puedo conectar con la app</div>Arranca el servidor con <code>Iniciar.bat</code> (o <code>python server.py</code>) y recarga.<br><span class="dim">${esc(e.message)}</span></div>`;
  }
})();
// Cartelera y Estadísticas agrupan varias páginas en pestañas; las rutas antiguas siguen funcionando
VIEWS.cartelera = (v, qs) => conPestanas(v, "cartelera", VIEWS_PESTANAS.cartelera, qs);
VIEWS.estadisticas = (v, qs) => conPestanas(v, "estadisticas", VIEWS_PESTANAS.estadisticas, qs);
VIEWS.estrenos = () => location.replace("#/cartelera?t=estrenos");
VIEWS.gustos = () => location.replace("#/estadisticas?t=gustos");
VIEWS.anio = (v, qs) => location.replace(`#/estadisticas?t=anio${qs.get("a") ? `&a=${qs.get("a")}` : ""}`);

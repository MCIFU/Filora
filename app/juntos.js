// Filora · Ver con alguien: cada persona comparte un código con sus notas (sin cuentas ni servidor)
// y Filora propone películas que no ha visto ninguno de los dos y que encajan a ambos.
// Comparte el ámbito global con app.js (se carga después de descubrir.js).

const JUNTOS_KEY = "filora.juntos";
function juntosLeer() { try { return JSON.parse(localStorage.getItem(JUNTOS_KEY) || "[]"); } catch (e) { return []; } }
function juntosGuardar(L) { try { localStorage.setItem(JUNTOS_KEY, JSON.stringify(L.slice(0, 8))); } catch (e) { toast("No se pudo guardar en este navegador", "x"); } }

// Código: notas compactas → deflate → base64. Prefijo FJ1 para reconocerlo.
async function codigoMio(nombre) {
  const P = S.db.peliculas.filter((p) => p.nota != null).map((p) => [p.titulo, p.anio || 0, p.nota, (p.generos || []).join("|"), p.director || "", p.pais || "", (p.ids || {}).imdb || "", ...(p.imdbNota || [])]);
  const bytes = new TextEncoder().encode(JSON.stringify({ n: nombre, P }));
  const z = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  let bin = ""; new Uint8Array(z).forEach((b) => (bin += String.fromCharCode(b)));
  return "FJ1" + btoa(bin);
}
async function leerCodigo(txt) {
  const t = String(txt || "").replace(/\s+/g, "");
  if (!t.startsWith("FJ1")) throw new Error("Eso no parece un código de Filora");
  const bin = atob(t.slice(3)), u = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const j = JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text());
  if (!Array.isArray(j.P) || !j.P.length) throw new Error("El código no trae notas");
  return { nombre: j.n || "Tu acompañante", P: j.P.map(([titulo, anio, nota, g, director, pais, imdb, iv, in_]) => ({ titulo, anio: anio || null, nota, generos: g ? g.split("|") : [], director, pais, ids: imdb ? { imdb } : {}, ...(iv ? { imdbNota: [iv, in_] } : {}) })) };
}
// Predicciones con la colección de otra persona: se cambia un momento la colección y el perfil
function conColeccion(P, fn) {
  const db = S.db, prof = S.prof;
  S.db = { ...db, peliculas: P }; S.prof = null;
  try { return fn(); } finally { S.db = db; S.prof = prof; }
}
function recsJuntos(otro) {
  const vistasOtro = new Set(otro.P.map((p) => norm(p.titulo)));
  const mias = topRecs(400, { variedad: 99 }).filter((c) => !vistasOtro.has(norm(c.titulo)) && !vistasOtro.has(norm(c.tituloOriginal)));
  const suyas = conColeccion(otro.P, () => mias.map((c) => predict(c)));
  return mias.map((c, i) => ({ ...c, m2: suyas[i], juntos: Math.min(c.m.pct, suyas[i].pct) + (c.m.pct + suyas[i].pct) / 100 }))
    .sort((a, b) => b.juntos - a.juntos).filter(diversify(2)).slice(0, 12);
}
function cartaJuntos(r, nombre) {
  return `<article class="rm">
    <a class="rm-cartel" href="${fichaDe(r)}">${posterHTML(r)}</a>
    <a class="rm-t" href="${fichaDe(r)}">${esc(r.titulo)}</a>
    <div class="rm-s">${esc([r.anio, splitDir(r.director)[0]].filter(Boolean).join(" · "))}</div>
    <div class="jt-pcts"><span><b>${r.m.pct}%</b>tú</span><span><b>${r.m2.pct}%</b>${esc(nombre)}</span></div>
  </article>`;
}

VIEWS.juntos = (v, qs) => {
  const amigos = juntosLeer();
  const sel = amigos.find((a) => a.nombre === qs.get("con")) || amigos[0];
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Ver con alguien</h1>
    <p>Pega el código de Filora de la otra persona y te propongo películas que no ha visto ninguno de los dos y que os encajan a ambos. Para que te lo pida a ti, mándale el tuyo.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="jtCopiar">${icon("upload")}Copiar mi código</button></div></div>
  <section class="jt-anadir card">
    <label class="jt-f"><span>Su nombre</span><input class="input" id="jtNombre" placeholder="Ana" autocomplete="off"></label>
    <label class="jt-f jt-cod"><span>Su código</span><textarea class="input" id="jtCodigo" rows="2" placeholder="Empieza por FJ1…"></textarea></label>
    <button class="btn btn-primary" id="jtAdd">${icon("plus")}Añadir</button>
  </section>
  ${amigos.length ? `<div class="chips jt-amigos">${amigos.map((a) => `<a class="chip ${a === sel ? "on" : ""}" href="#/juntos?con=${encodeURIComponent(a.nombre)}">${esc(a.nombre)} <small>${a.P.length}</small></a>`).join("")}
    ${sel ? `<button class="chip" id="jtQuitar" title="Olvidar su código en este navegador">${icon("x")}Quitar a ${esc(sel.nombre)}</button>` : ""}</div>` : ""}
  <div id="jtRes">${sel ? `<div class="dim cargando-mini">Buscando películas para los dos…</div>` : `<div class="empty"><div class="h2">Aún no has añadido a nadie</div>Pídele su código: en su Filora, Para ti → Ver con alguien → Copiar mi código.</div>`}</div>`;

  $("#jtCopiar").onclick = async () => {
    try {
      const yo = (typeof getSes === "function" && getSes() || {}).usuario || "Alguien";
      const c = await codigoMio(yo);
      if (navigator.share && matchMedia("(max-width: 860px)").matches) await navigator.share({ title: "Mi código de Filora", text: c }).catch(() => {});
      else { await navigator.clipboard.writeText(c); toast("Tu código está copiado: pégaselo por WhatsApp o correo"); }
    } catch (e) { toast(`No se pudo copiar: ${e.message}`, "x"); }
  };
  $("#jtAdd").onclick = async () => {
    try {
      const o = await leerCodigo($("#jtCodigo").value);
      o.nombre = $("#jtNombre").value.trim() || o.nombre;
      juntosGuardar([o, ...juntosLeer().filter((a) => a.nombre !== o.nombre)]);
      toast(`${o.nombre}: ${o.P.length} películas con nota`);
      location.hash = `#/juntos?con=${encodeURIComponent(o.nombre)}`;
      if (route().name === "juntos") { render._keep = true; render(); }
    } catch (e) { toast(e.message, "x"); }
  };
  const q = $("#jtQuitar");
  if (q) q.onclick = () => { juntosGuardar(juntosLeer().filter((a) => a.nombre !== sel.nombre)); location.hash = "#/juntos"; render._keep = true; render(); };
  if (sel) setTimeout(() => {
    const L = recsJuntos(sel), box = $("#jtRes");
    if (!box) return;
    box.innerHTML = L.length ? `${sectionHead(`Para ver con ${esc(sel.nombre)}`)}<div class="rms">${L.map((r) => cartaJuntos(r, sel.nombre)).join("")}</div>
      <p class="dim" style="font-size:12.5px;margin-top:14px">Primero las que más gustan al que menos le va a gustar: así ninguno de los dos se aburre.</p>`
      : `<div class="empty"><div class="h2">No encuentro ninguna que os encaje a los dos</div>Prueba con más notas en vuestras colecciones.</div>`;
  }, 30);
};

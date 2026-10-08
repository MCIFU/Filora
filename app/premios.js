/* ============================================================
   Filora · Premios (historia completa) y páginas de directores e intérpretes
   Datos: data/premios/<premio>.json (tools/premios.py, desde Wikidata).
   ============================================================ */
const PREMIOS_ORDEN = [["oscar", "Óscar"], ["globo", "Globo de Oro"], ["emmy", "Emmy"], ["bafta", "BAFTA"], ["cannes", "Cannes"],
  ["cesar", "César"], ["europeo", "Cine Europeo"], ["feroz", "Feroz"], ["goya", "Goya"]];
const PREMIOS_INFO = {
  oscar: ["Academia de las Artes y las Ciencias Cinematográficas · Los Ángeles", "El premio más famoso del cine. La estatuilla, un caballero sobre un rollo de película, se entrega desde 1929."],
  globo: ["Beverly Hills · cine y televisión", "Los premios que abren la temporada en Hollywood. Separan drama y comedia o musical, y premian también la televisión."],
  emmy: ["Academia de la Televisión · Los Ángeles", "Los Óscar de la televisión: series, miniseries y sus intérpretes. La estatuilla es una mujer alada que sostiene un átomo."],
  bafta: ["Academia Británica de las Artes del Cine y la Televisión · Londres", "Los premios del cine británico. La máscara teatral de su trofeo es una de las imágenes más reconocibles de la temporada."],
  cannes: ["Festival de Cannes · Francia", "El festival más prestigioso del mundo. Su premio mayor, la Palma de Oro, lo decide un jurado internacional."],
  cesar: ["Academia de las Artes y Técnicas del Cine · París", "Los premios del cine francés. El trofeo es una «compresión» de metal del escultor César Baldaccini."],
  europeo: ["Academia del Cine Europeo · Berlín", "Lo mejor del cine europeo de cada año, votado por los miembros de la Academia Europea."],
  feroz: ["Asociación de Informadores Cinematográficos de España", "Los premios de la prensa cinematográfica española, que también reconocen las series. Su trofeo es un lobo con antifaz."],
  goya: ["Academia de las Artes y las Ciencias Cinematográficas de España · Madrid", "Los premios del cine español. Su estatuilla es un busto del pintor Francisco de Goya."],
};
S.premios = {};
S.premio_ = { id: "oscar", cat: {}, anios: 12 };

async function cargarPremio(id) {
  if (!S.premios[id]) {
    const r = await fetch(`data/premios/${id}.json`);
    if (!r.ok) throw new Error("Aún no están los datos de este premio");
    S.premios[id] = limpiarPremio(await r.json());
  }
  return S.premios[id];
}
// En las categorías de películas, Wikidata añade a veces productores como candidatos (y al revés):
// cada categoría se queda solo con lo que le toca. También limpia «(película de 2024)».
function limpiarPremio(D) {
  const titulo = (t) => (t || "").replace(/\s*\((?:película|film|serie)[^)]*\)$/i, "");
  // ¿la categoría premia películas/series o personas? Primero por el nombre; si no, por mayoría
  const dePeli = (c) => /pel[ií]cula|palma|film|documental|programa|serie|cortometraje|largometraje|corto\b|animaci/i.test(c.n) && !/actor|actriz|direc|interpret|guion|gui[oó]n|m[uú]sica|fotograf|montaje|canci/i.test(c.n);
  for (const c of D.categorias) c.persona = dePeli(c) ? false : c.persona;
  // primero las principales: película, dirección, interpretación protagonista; luego por volumen
  const peso = (c) => { const n = corto(c.n).toLowerCase();
    return /^(mejor pel[ií]cula|palma de oro|mejor serie (dram[aá]tica|de drama)|mejor programa de drama)$/.test(n) ? 0
      : /^mejor (direcci[oó]n|director)$/.test(n) ? 1 : /protagonista|^mejor (actor|actriz)( - drama)?$/.test(n) ? 2 : /reparto|secundari/.test(n) ? 3 : 4; };
  D.categorias.sort((a, b) => peso(a) - peso(b) || b.total - a.total);
  const tipo = Object.fromEntries(D.categorias.map((c) => [c.id, c.persona]));
  for (const cats of Object.values(D.ediciones)) {
    for (const [cid, L0] of Object.entries(cats)) {
      const L = L0.map((e) => ({ ...e, n: titulo(e.n), o: e.o ? { ...e.o, t: titulo(e.o.t) } : e.o }));
      if (tipo[cid]) { const h = L.filter((e) => e.h); cats[cid] = h.length ? h : L; continue; }
      // categoría de películas: una entrada por película (de las propias o de la obra de sus productores)
      const pelis = new Map();
      for (const e of L) {
        const f = e.h ? (e.o && { n: e.o.t, q: e.o.q, i: e.o.i, p: e.o.p }) : { n: e.n, q: e.q, i: e.i, p: e.p };
        if (!f || !f.q || !f.n) continue;
        const x = pelis.get(f.q) || { ...f };
        if (e.g) x.g = 1;
        if (!x.p && f.p) x.p = f.p;
        pelis.set(f.q, x);
      }
      // la misma película puede venir con dos ids (la propia y la de la obra): una sola por título
      const porTitulo = new Map();
      for (const x of pelis.values()) {
        const k = norm(x.n), y = porTitulo.get(k);
        porTitulo.set(k, y ? { ...y, ...x, g: y.g || x.g, p: y.p || x.p, i: y.i || x.i } : x);
      }
      cats[cid] = [...porTitulo.values()].sort((a, b) => (b.g || 0) - (a.g || 0) || a.n.localeCompare(b.n, "es"));
    }
  }
  return D;
}
// tu colección, por id de IMDb y por título
function indiceColeccion() {
  const porImdb = new Map(), porTitulo = new Map();
  for (const p of S.db.peliculas) {
    if ((p.ids || {}).imdb) porImdb.set(p.ids.imdb, p);
    porTitulo.set(norm(p.titulo), p);
    if (p.tituloOriginal) porTitulo.set(norm(p.tituloOriginal), p);
  }
  for (const s of S.db.series) { if ((s.ids || {}).imdb) porImdb.set(s.ids.imdb, s); porTitulo.set(norm(s.titulo), s); }
  return (imdb, titulo) => (imdb && porImdb.get(imdb)) || (titulo && porTitulo.get(norm(titulo))) || null;
}
// la película de una candidatura (la propia entrada o, si es una persona, la obra por la que fue candidata)
const peliDe = (e) => (e.h ? e.o : e) || null;

function estadisticasPremio(D, mia) {
  const pelis = new Map(), personas = new Map(), porEdicion = new Map();
  for (const [anio, cats] of Object.entries(D.ediciones)) {
    for (const L of Object.values(cats)) for (const e of L) {
      const f = peliDe(e);
      if (f && f.q) {
        const o = pelis.get(f.q) || { t: f.t || f.n, q: f.q, p: f.p, i: f.i, g: 0, n: 0, anio };
        o.n++; if (e.g) o.g++; if (!o.p && f.p) o.p = f.p;
        pelis.set(f.q, o);
        const k = f.q + "|" + anio;
        porEdicion.set(k, { ...(porEdicion.get(k) || { t: f.t || f.n, anio, n: 0 }), n: (porEdicion.get(k)?.n || 0) + 1 });
      }
      if (e.h) {
        const o = personas.get(e.q) || { n: e.n, q: e.q, g: 0, c: 0 };
        o.c++; if (e.g) o.g++;
        personas.set(e.q, o);
      }
    }
  }
  const top = (m, f, n = 3) => [...m.values()].sort(f).slice(0, n);
  const P = [...pelis.values()];
  const vistas = P.filter((x) => mia(x.i, x.t));
  return {
    masPremios: top(pelis, (a, b) => b.g - a.g || b.n - a.n),
    masCandidaturas: top(porEdicion, (a, b) => b.n - a.n),
    sinGanar: top(new Map(P.filter((x) => !x.g).map((x) => [x.q, x])), (a, b) => b.n - a.n),
    personaPremios: top(personas, (a, b) => b.g - a.g || b.c - a.c),
    personaCandidaturas: top(personas, (a, b) => b.c - a.c || b.g - a.g),
    pelis: P, vistas,
  };
}

// «Óscar a la mejor película» -> «Mejor película»
const corto = (n) => { const c = n.replace(/^.*?\b(?:a la|al|a los|a las|a)\s+(?=mejor|mejores)/i, ""); return c.charAt(0).toUpperCase() + c.slice(1); };
const notaChip = (n) => (n == null ? "" : `<span class="pr-nota" style="--c:${scoreColor(n)}">${fmt1(n)}</span>`);
const enlacePersona = (e) => `<a class="pr-persona" href="#/persona?q=${e.q}">${esc(e.n)}</a>`;
// foto de una persona (Wikimedia Commons) o sus iniciales
const fotoPersona = (e, ancho = 300) => e.f
  ? `<img src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(e.f)}?width=${ancho}" alt="${esc(e.n)}" loading="lazy" referrerpolicy="no-referrer">`
  : `<div class="ph ph-persona"><b>${esc(e.n.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join(""))}</b></div>`;
const carteL = (f) => (f && f.p ? `<img src="${esc(f.p)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="ph"><b>${esc(((f && (f.t || f.n)) || "").slice(0, 40))}</b></div>`);

VIEWS.premios = async (v, qs) => {
  const st = S.premio_;
  const id = PREMIOS_ORDEN.some(([k]) => k === qs.get("p")) ? qs.get("p") : st.id;
  if (id !== st.id) st.anios = 12;
  st.id = id;
  const nombre = PREMIOS_ORDEN.find(([k]) => k === id)[1];
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">La temporada de premios</div><h1 class="h1">Premios</h1>
    <p>La historia de los grandes premios desde sus inicios: ganadores y nominados de cada categoría, récords y lo que tú has visto de todo ello.</p></div></div>
  <div class="pr-estante">${PREMIOS_ORDEN.map(([k, n]) => `<a class="pr-est ${k === id ? "on" : ""}" href="#/premios?p=${k}" aria-label="${n}">${estatuilla(k)}<span>${n}</span></a>`).join("")}</div>
  <div id="prCuerpo"><div class="cargando"><span class="bobina"></span>Abriendo el sobre…</div></div>`;
  let D;
  try { D = await cargarPremio(id); } catch (e) { $("#prCuerpo").innerHTML = `<div class="empty"><div class="h2">${esc(e.message)}</div></div>`; return; }
  if (route().name !== "premios" || S.premio_.id !== id) return;
  const mia = indiceColeccion();
  const E = estadisticasPremio(D, mia);
  const cats = D.categorias;
  const cat = cats.find((c) => c.id === (qs.get("c") || st.cat[id])) || cats[0];
  st.cat[id] = cat.id;
  const principal = cats[0];
  const anios = Object.keys(D.ediciones).map(Number).sort((a, b) => b - a);
  const conCat = anios.filter((a) => ((D.ediciones[a] || {})[cat.id] || []).length);
  const ganPrincipal = anios.map((a) => ((D.ediciones[a] || {})[principal.id] || []).find((e) => e.g)).filter(Boolean);
  const ganVistas = ganPrincipal.filter((e) => mia(peliDe(e)?.i, peliDe(e)?.t));
  const [org, txt] = PREMIOS_INFO[id];
  const lista = (L) => L.map((x) => esc(x.t || x.n)).join(", ");
  const filaAnio = (a) => {
    const L = D.ediciones[a][cat.id];
    const gan = L.filter((e) => e.g), nom = L.filter((e) => !e.g);
    // en las categorías de personas: su foto (enlaza a su página) y la película en texto
    const imagen = (e, f, m) => e.h ? `<a class="pr-foto" href="#/persona?q=${e.q}">${fotoPersona(e)}</a>` : `<div ${m ? `data-open="${m.id}"` : ""}>${carteL(f)}</div>`;
    const obra = (e, f, m) => (e.h && f && f.t ? `<div class="pr-s">${m ? `<a href="#" data-open="${m.id}">${esc(f.t)}</a> ${notaChip(m.nota)}` : esc(f.t)}</div>` : "");
    const tarjetaG = (e) => { const f = peliDe(e) || e; const m = mia(f.i, f.t);
      return `<div class="pr-ganadora ${e.h ? "es-persona" : ""}"><div class="pr-cartel">${imagen(e, f, m)}<span class="pr-sello">${estatuilla(id)}</span></div>
        <div class="pr-t">${e.h ? enlacePersona(e) : esc(e.n)}</div>${obra(e, f, m)}
        <div class="pr-g">Ganador${e.h ? "" : "a"} ${e.h ? "" : m ? `· tu nota ${notaChip(m.nota)}` : "· no la has visto"}</div></div>`; };
    return `<div class="pr-anio"><div><div class="pr-y">${a}</div><div class="pr-ed">${conCat.length - conCat.indexOf(a)}.ª entrega en tus datos</div></div>
      <div>${gan.length ? gan.map(tarjetaG).join("") : `<div class="dim" style="padding-top:8px">Sin ganador registrado</div>`}</div>
      <div>${nom.length ? `<div class="pr-lbl">Nominad${cat.persona ? "os" : "as"} · ${nom.length}</div><div class="pr-noms">${nom.map((e) => { const f = peliDe(e) || e; const m = mia(f.i, f.t);
        return `<div class="pr-nom ${m || e.h ? "vista" : ""} ${e.h ? "es-persona" : ""}"><div class="c">${imagen(e, f, m)}${m && !e.h ? notaChip(m.nota) : ""}</div><div class="t">${e.h ? enlacePersona(e) : esc(e.n)}</div>${e.h && f && f.t ? `<div class="s">${m ? `<a href="#" data-open="${m.id}">${esc(f.t)}</a> ${notaChip(m.nota)}` : esc(f.t)}</div>` : ""}</div>`; }).join("")}</div>` : ""}</div></div>`;
  };
  const media = (L) => (L.length ? mean(L) : null);
  const notasG = ganVistas.map((e) => mia(peliDe(e)?.i, peliDe(e)?.t).nota).filter((x) => x != null);
  const nomPrincipal = anios.flatMap((a) => ((D.ediciones[a] || {})[principal.id] || []).filter((e) => !e.g));
  const notasN = nomPrincipal.map((e) => mia(peliDe(e)?.i, peliDe(e)?.t)).filter(Boolean).map((m) => m.nota).filter((x) => x != null);
  const faltan = ganPrincipal.filter((e) => !mia(peliDe(e)?.i, peliDe(e)?.t)).slice(0, 8);
  const rec = (v1, l, s) => `<div class="pr-rec">${estatuilla(id)}<div><div class="v">${v1}</div><div class="l">${l}</div><div class="s">${s}</div></div></div>`;
  $("#prCuerpo").innerHTML = `
  <section class="pr-premio">
    <div class="pr-gran">${estatuilla(id)}</div>
    <div><div class="eyebrow">${esc(org)}</div><h2>${esc(nombre)}</h2><p class="muted">${esc(txt)}</p>
      <div class="pr-kpis">
        <div><div class="v">${anios.length}</div><div class="l">años con datos (${D.desde}–${D.hasta})</div></div>
        <div class="oro"><div class="v">${E.masPremios[0] ? E.masPremios[0].g : "–"}</div><div class="l">récord de premios: ${lista(E.masPremios.filter((x) => x.g === E.masPremios[0]?.g))}</div></div>
        <div><div class="v">${cats.length}</div><div class="l">categorías en su historia</div></div>
        <div class="coral"><div class="v">${ganVistas.length}<small> de ${ganPrincipal.length}</small></div><div class="l">ganadoras de «${esc(corto(principal.n))}» que has visto</div></div>
      </div></div>
  </section>
  <div class="pr-cats">${cats.slice(0, 12).map((c) => `<a class="chip ${c.id === cat.id ? "on" : ""}" href="#/premios?p=${id}&c=${c.id}">${esc(corto(c.n))}</a>`).join("")}
    ${cats.length > 12 ? `<select class="select" id="prMas"><option value="">Más categorías (${cats.length - 12})</option>${cats.slice(12).map((c) => `<option value="${c.id}" ${c.id === cat.id ? "selected" : ""}>${esc(corto(c.n))}</option>`).join("")}</select>` : ""}</div>
  <h2 class="h2 pr-cat-t">${esc(corto(cat.n))} <span class="dim">· ${conCat.length} años</span></h2>
  <div class="pr-historia">${conCat.slice(0, st.anios).map(filaAnio).join("")}</div>
  ${conCat.length > st.anios ? `<div class="more"><button class="btn" id="prMasAnios">Ver años anteriores (${conCat.length - st.anios} más, desde ${conCat[conCat.length - 1]})</button></div>` : ""}
  <section class="section">${sectionHead(`Récords · ${esc(nombre)}`)}
    <div class="pr-recs">
      ${E.masPremios[0] ? rec(E.masPremios[0].g, "Más premios para una película", lista(E.masPremios)) : ""}
      ${E.masCandidaturas[0] ? rec(E.masCandidaturas[0].n, "Más candidaturas en una sola edición", E.masCandidaturas.map((x) => `${esc(x.t)} (${x.anio})`).join(", ")) : ""}
      ${E.sinGanar[0] && E.sinGanar[0].n > 1 ? rec(E.sinGanar[0].n, "Más candidaturas sin ganar nada", lista(E.sinGanar)) : ""}
      ${E.personaPremios[0] && E.personaPremios[0].g ? rec(E.personaPremios[0].g, "Persona con más premios", E.personaPremios.filter((x) => x.g).map((x) => `<a class="pr-persona" href="#/persona?q=${x.q}">${esc(x.n)}</a>`).join(", ")) : ""}
      ${E.personaCandidaturas[0] ? rec(E.personaCandidaturas[0].c, "Persona con más candidaturas", E.personaCandidaturas.map((x) => `<a class="pr-persona" href="#/persona?q=${x.q}">${esc(x.n)}</a>`).join(", ")) : ""}
      ${rec(D.desde, "Primer año registrado", `${anios.length} años de historia en Wikidata`)}
    </div></section>
  ${S.db.peliculas.length ? `<section class="section pr-tu">
    <div class="card card-pad"><div class="eyebrow">Tú y ${esc(nombre)}</div><div class="h2" style="margin:6px 0 12px">${notasG.length && notasN.length ? (media(notasG) > media(notasN) ? "Las ganadoras te gustan más que el resto" : "Prefieres a las que no ganaron") : `Has visto ${E.vistas.length} de sus películas`}</div>
      ${notasG.length ? `<div class="pr-barra"><span>Ganadoras</span><div class="track"><div class="fill" style="width:${media(notasG) * 10}%;background:#e0b44a"></div></div><b>${fmt1(media(notasG))}</b></div>` : ""}
      ${notasN.length ? `<div class="pr-barra"><span>Nominadas</span><div class="track"><div class="fill" style="width:${media(notasN) * 10}%;background:var(--bombilla)"></div></div><b>${fmt1(media(notasN))}</b></div>` : ""}
      <p class="dim" style="font-size:13px;margin:10px 0 0">Tu nota media · «${esc(corto(principal.n))}» · ${E.vistas.length} películas de este premio en tu colección</p></div>
    ${faltan.length ? `<div class="card card-pad"><div class="eyebrow">Te falta por ver</div><div class="h2" style="margin:6px 0 12px">${ganPrincipal.length - ganVistas.length} ganadoras</div>
      <div class="pr-faltan">${faltan.map((e) => { const f = peliDe(e) || e; return `<div><div class="c">${carteL(f)}</div><div class="t">${esc(f.t || f.n)}</div>${ro() ? "" : `<button class="btn btn-sm btn-ghost" data-prpend="${esc(f.t || f.n)}">${icon("bookmark")}Pendiente</button>`}</div>`; }).join("")}</div></div>` : ""}
  </section>` : ""}`;
  const mas = $("#prMas");
  if (mas) mas.onchange = () => mas.value && (location.hash = `#/premios?p=${id}&c=${mas.value}`);
  const ma = $("#prMasAnios");
  if (ma) ma.onclick = () => { st.anios += 20; render._keep = true; render(); };
  document.querySelectorAll("[data-prpend]").forEach((b) => (b.onclick = async (ev) => { ev.stopPropagation(); b.disabled = true; await addPending({ titulo: b.dataset.prpend }, `Ganadora · ${nombre}`); }));
};

// ---------------------------------------------------------------- Persona (director, intérprete…)
async function sparqlWD(q) {
  const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q));
  if (!r.ok) throw new Error("Wikidata no responde");
  return (await r.json()).results.bindings;
}
async function resolverPersona(nombre) {
  const s = await wdApi({ action: "wbsearchentities", search: nombre, language: "es", uselang: "es", type: "item", limit: "8" });
  const ids = (s.search || []).map((x) => x.id);
  if (!ids.length) return null;
  const ents = (await wdApi({ action: "wbgetentities", ids: ids.join("|"), props: "claims" })).entities || {};
  return ids.find((i) => ((ents[i].claims || {}).P31 || []).some((c) => c.mainsnak.datavalue && c.mainsnak.datavalue.value.id === "Q5")) || null;
}
const partesFecha = (t) => { const m = /([+-]\d+)-(\d\d)-(\d\d)/.exec(t || ""); return m ? { a: +m[1], m: +m[2], d: +m[3] } : null; };
const fechaWD = (t) => { const f = partesFecha(t); if (!f) return null;
  return f.m === 0 ? String(f.a) : new Date(Date.UTC(f.a, f.m - 1, f.d || 1)).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
const edad = (n, h) => { const a = partesFecha(n); if (!a) return null; const b = h ? partesFecha(h) : (() => { const d = new Date(); return { a: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; })();
  return b.a - a.a - (b.m < a.m || (b.m === a.m && b.d < a.d) ? 1 : 0); };
S.persona_ = { rol: "" };

VIEWS.persona = async (v, qs) => {
  v.innerHTML = `<div class="cargando"><span class="bobina"></span>Buscando su ficha…</div>`;
  let q = qs.get("q");
  try { if (!q && qs.get("n")) q = await resolverPersona(qs.get("n")); } catch (e) { /* sin conexión */ }
  if (!q) { v.innerHTML = `<div class="empty"><div class="h2">No encuentro a ${esc(qs.get("n") || "esta persona")}</div>Puede que Wikidata no la tenga registrada.</div>`; return; }
  const yo = location.hash;
  let ent;
  try { ent = ((await wdApi({ action: "wbgetentities", ids: q, props: "labels|descriptions|claims|sitelinks", languages: "es|en", sitefilter: "eswiki|enwiki" })).entities || {})[q]; } catch (e) { /* */ }
  if (location.hash !== yo) return;
  if (!ent) { v.innerHTML = `<div class="empty"><div class="h2">No se ha podido cargar</div>Comprueba tu conexión.</div>`; return; }
  const lab = (e) => (e && e.labels && (e.labels.es || e.labels.en || {}).value) || "";
  const cv = (p) => ((ent.claims || {})[p] || []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
  const refs = [...new Set([...cv("P27"), ...cv("P106"), ...cv("P19"), ...cv("P20")].map((x) => x.id))].slice(0, 40);
  const labs = refs.length ? (await wdApi({ action: "wbgetentities", ids: refs.join("|"), props: "labels", languages: "es|en" })).entities || {} : {};
  const nombreP = lab(ent);
  const foto = cv("P18")[0];
  const fotoUrl = (w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(foto)}?width=${w}`;
  const tn = (cv("P569")[0] || {}).time, tm = (cv("P570")[0] || {}).time;
  const anios = edad(tn, tm);
  const lugar = (p) => lab(labs[(cv(p)[0] || {}).id]);
  const oficios = [...new Set(cv("P106").map((x) => lab(labs[x.id])).filter(Boolean))].slice(0, 4);
  const paises = [...new Set(cv("P27").map((x) => lab(labs[x.id])).filter(Boolean))].slice(0, 2);
  const titEs = ent.sitelinks && ent.sitelinks.eswiki && ent.sitelinks.eswiki.title;
  const imdbP = cv("P345")[0];
  v.innerHTML = `
  <section class="ps-hero">
    ${foto ? `<div class="ps-fondo" style="background-image:url('${fotoUrl(600)}')"></div>` : ""}
    <div class="ps-hero-in">
      <div class="ps-foto">${foto ? `<img src="${fotoUrl(520)}" alt="${esc(nombreP)}" referrerpolicy="no-referrer">` : `<div class="ph"><b>${esc(nombreP.split(" ").map((x) => x[0]).slice(0, 2).join(""))}</b></div>`}</div>
      <div class="ps-datos">
        <div class="eyebrow">${esc(oficios.join(" · ") || "Cine")}</div>
        <h1 class="ps-nombre">${esc(nombreP)}</h1>
        <div class="ps-vida">
          ${tn ? `<span><b>${tm ? "Nació" : "Nace"}</b> ${fechaWD(tn)}${lugar("P19") ? ` · ${esc(lugar("P19"))}` : ""}</span>` : ""}
          ${tm ? `<span><b>Murió</b> ${fechaWD(tm)}${lugar("P20") ? ` · ${esc(lugar("P20"))}` : ""}${anios != null ? ` · a los ${anios} años` : ""}</span>` : anios != null ? `<span><b>${anios}</b> años</span>` : ""}
          ${paises.length ? `<span><b>Nacionalidad</b> ${esc(paises.join(" y "))}</span>` : ""}
        </div>
        <div class="ps-cifras" id="psCifras"></div>
        <div class="links">${titEs ? `<a class="ext" href="https://es.wikipedia.org/wiki/${encodeURIComponent(titEs)}" target="_blank" rel="noopener"><span class="logo" style="background:#4b4573">W</span>Wikipedia</a>` : ""}${imdbP ? `<a class="ext" href="https://www.imdb.com/es-es/name/${imdbP}/" target="_blank" rel="noopener">${logoWeb("IMDb")}IMDb</a>` : ""}<a class="ext" href="https://www.filmaffinity.com/es/search.php?stype=director&stext=${encodeURIComponent(nombreP)}" target="_blank" rel="noopener">${logoWeb("FA")}FilmAffinity</a></div>
      </div>
    </div>
  </section>
  <section class="ps-bio-w"><p class="ps-bio" id="psBio">${esc((ent.descriptions && (ent.descriptions.es || ent.descriptions.en || {}).value) || "")}</p></section>
  <section class="section" id="psConocido"></section>
  <section class="section" id="psPremios"></section>
  <div id="psTuya"></div>
  <section class="section" id="psFilmoSec">${sectionHead("Filmografía")}<div id="psFilmo"><div class="cargando"><span class="bobina"></span>Cargando sus películas…</div></div></section>`;
  const cifras = { peliculas: null, ganados: null, nominaciones: null, tuyas: null };
  const pintaCifras = () => { const c = $("#psCifras"); if (!c) return;
    c.innerHTML = [[cifras.peliculas, "películas"], [cifras.ganados, "premios"], [cifras.nominaciones, "nominaciones"], [cifras.tuyas, "en tu colección"]]
      .filter(([x]) => x != null).map(([x, l]) => `<div><b>${x}</b><span>${l}</span></div>`).join(""); };
  // biografía (Wikipedia en español)
  if (titEs) fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titEs)}`).then((r) => r.json()).then((d) => {
    const b = $("#psBio"); if (b && d.extract) b.innerHTML = `${esc(d.extract)} <a href="https://es.wikipedia.org/wiki/${encodeURIComponent(titEs)}" target="_blank" rel="noopener" class="dim">Leer más</a>`; }).catch(() => {});
  // premios
  sparqlWD(`SELECT ?premio ?premioLabel ?fecha ?tipo ?obraLabel WHERE {
    { wd:${q} p:P166 ?s . ?s ps:P166 ?premio . BIND("g" AS ?tipo) } UNION { wd:${q} p:P1411 ?s . ?s ps:P1411 ?premio . BIND("n" AS ?tipo) }
    OPTIONAL { ?s pq:P585 ?fecha } OPTIONAL { ?s pq:P1686 ?obra }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } }`).then((filas) => {
    const lista = [], visto = new Set();
    let g = 0, n = 0;
    for (const b of filas) {
      const nom = b.premioLabel.value, fam = FAMILIAS.find(([, , rx]) => rx.test(nom.toLowerCase()));
      if (/^Q\d+$/.test(nom)) continue;
      const a = b.fecha ? +b.fecha.value.slice(0, 4) : null, k = `${nom}|${a}|${b.tipo.value}`;
      if (visto.has(k)) continue;
      visto.add(k);
      if (b.tipo.value === "g") g++; else n++;
      if (fam) lista.push({ f: fam[0], n: nom + (b.obraLabel ? ` (${b.obraLabel.value})` : ""), a, g: b.tipo.value === "g" });
    }
    cifras.ganados = g; cifras.nominaciones = n + g; pintaCifras();
    const box = $("#psPremios");
    if (box && lista.length) box.innerHTML = sectionHead("Premios") + premiosHTML(lista).replace('<div class="sub">Premios</div>', "");
  }).catch(() => {});
  // filmografía
  try {
    const filas = await sparqlWD(`SELECT ?f ?fLabel ?d ?rol ?imdb ?enw ?sl WHERE {
      { ?f wdt:P57 wd:${q} . BIND("Dirección" AS ?rol) } UNION { ?f wdt:P161 wd:${q} . BIND("Reparto" AS ?rol) } UNION { ?f wdt:P58 wd:${q} . BIND("Guion" AS ?rol) }
      ?f wdt:P31 ?tipo . VALUES ?tipo { ${[...WD_FILM].map((x) => "wd:" + x).join(" ")} }
      OPTIONAL { ?f wdt:P577 ?d } OPTIONAL { ?f wdt:P345 ?imdb } OPTIONAL { ?enw schema:about ?f; schema:isPartOf <https://en.wikipedia.org/> }
      OPTIONAL { ?f wikibase:sitelinks ?sl }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". } }`);
    const pelis = new Map();
    for (const b of filas) {
      const k = b.f.value, x = pelis.get(k) || { t: b.fLabel.value, anio: null, roles: new Set(), i: b.imdb && b.imdb.value, sl: b.sl ? +b.sl.value : 0,
        w: b.enw && decodeURIComponent(b.enw.value.split("/wiki/")[1]).replace(/_/g, " ") };
      const a = b.d ? +b.d.value.slice(0, 4) : null;
      if (a && (!x.anio || a < x.anio)) x.anio = a;
      x.roles.add(b.rol.value);
      pelis.set(k, x);
    }
    if (location.hash !== yo) return;
    const L = [...pelis.values()].filter((x) => !/^Q\d+$/.test(x.t)).sort((a, b) => (b.anio || 0) - (a.anio || 0));
    const mia = indiceColeccion();
    for (const x of L) x.m = mia(x.i, x.t);
    const tuyas = L.filter((x) => x.m);
    const notas = tuyas.map((x) => x.m.nota).filter((n) => n != null);
    cifras.peliculas = L.length; cifras.tuyas = tuyas.length; pintaCifras();
    const tarjeta = (x, grande) => `<div class="pcard ${x.m ? "" : "ps-no"}" ${x.m ? `data-open="${x.m.id}"` : ""}><div class="frame">${x.w ? `<div class="ph" data-w="${esc(x.w)}"><b>${esc(x.t)}</b></div>` : `<div class="ph"><b>${esc(x.t)}</b></div>`}${x.m ? scoreBadge(x.m.nota) : ""}</div>
      <div class="meta"><div class="t">${esc(x.t)}</div><div class="s">${[x.anio, grande ? null : [...x.roles].join(" · ")].filter(Boolean).join(" · ")}</div></div></div>`;
    // conocido por: sus películas más populares (en más idiomas de Wikipedia)
    const conocido = [...L].sort((a, b) => b.sl - a.sl).slice(0, 6);
    $("#psConocido").innerHTML = conocido.length ? `${sectionHead("Conocido por")}<div class="ps-conocido">${conocido.map((x) => tarjeta(x, true)).join("")}</div>` : "";
    $("#psTuya").innerHTML = tuyas.length ? `<section class="section">${sectionHead(`En tu colección · ${tuyas.length} ${tuyas.length === 1 ? "película" : "películas"}${notas.length ? ` · media ${fmt1(mean(notas))}` : ""}`)}
      <div class="strip">${tuyas.map((x) => pcard(x.m)).join("")}</div></section>` : "";
    const roles = ["Dirección", "Reparto", "Guion"].filter((r) => L.some((x) => x.roles.has(r)));
    const filmo = () => {
      const R = S.persona_.rol && roles.includes(S.persona_.rol) ? S.persona_.rol : "";
      const F = L.filter((x) => !R || x.roles.has(R));
      const dec = new Map();
      for (const x of F) { const d = x.anio ? Math.floor(x.anio / 10) * 10 : 0; dec.set(d, [...(dec.get(d) || []), x]); }
      $("#psFilmo").innerHTML = `${roles.length > 1 ? `<div class="chips" style="margin-bottom:18px"><button class="chip ${!R ? "on" : ""}" data-psrol="">Todo · ${L.length}</button>${roles.map((r) => `<button class="chip ${R === r ? "on" : ""}" data-psrol="${r}">${r} · ${L.filter((x) => x.roles.has(r)).length}</button>`).join("")}</div>` : ""}
        ${[...dec].map(([d, X]) => `<div class="ps-dec"><div class="ps-dec-t">${d ? `Años ${String(d).slice(2)}` : "Sin fecha"} <span class="dim">${X.length}</span></div><div class="posters">${X.map((x) => tarjeta(x)).join("")}</div></div>`).join("")}`;
      document.querySelectorAll("[data-psrol]").forEach((b) => (b.onclick = () => { S.persona_.rol = b.dataset.psrol; filmo(); rellenar(); }));
    };
    filmo();
    // carteles después, sin hacer esperar a la página
    const cart = {};
    const rellenar = () => document.querySelectorAll("#psConocido [data-w], #psFilmo [data-w]").forEach((ph) => { const u = cart[ph.dataset.w]; if (u) ph.outerHTML = `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`; });
    const tit = [...conocido, ...L].map((x) => x.w).filter(Boolean);
    for (let i = 0; i < Math.min(tit.length, 300); i += 50) {
      try {
        const d = await wdApi({ action: "query", titles: [...new Set(tit.slice(i, i + 50))].join("|"), prop: "pageimages", piprop: "thumbnail", pithumbsize: "300", pilicense: "any", redirects: "1" }, "en.wikipedia.org");
        const qq = d.query || {}, atras = Object.fromEntries([...(qq.redirects || []), ...(qq.normalized || [])].map((r) => [r.to, r.from]));
        for (const pg of Object.values(qq.pages || {})) if (pg.thumbnail) cart[atras[pg.title] || pg.title] = pg.thumbnail.source.split("?")[0];
      } catch (e) { /* sin carteles */ }
      if (location.hash !== yo) return;
      rellenar();
    }
  } catch (e) { const f = $("#psFilmo"); if (f) f.innerHTML = `<div class="empty">No se ha podido cargar la filmografía.</div>`; }
};

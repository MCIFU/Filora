// Filora · Estadísticas, mis gustos, recomendaciones, estrenos, pendientes, series y ajustes. Comparte el ámbito global con app.js (se cargan en orden desde index.html).
// ---------------------------------------------------------------- Estadísticas
function hbars(rows, opts = {}) {
  const max = opts.max ?? Math.max(...rows.map((r) => r.value), 1);
  return rows.map((r) => `<div class="hbar" ${r.tip ? `data-tip="${esc(r.tip)}"` : ""} ${r.href ? `onclick="location.hash='${r.href}'" style="cursor:pointer"` : ""}>
    <span class="n">${esc(r.label)}</span><div class="track"><div class="fill" style="width:${(100 * r.value) / max}%;${r.color ? `background:${r.color}` : ""}"></div></div>
    <span class="v">${r.right ?? r.value}</span></div>`).join("");
}
function histogram(P) {
  const bins = Array.from({ length: 10 }, (_, i) => P.filter((p) => (i === 9 ? p.nota >= 9 : p.nota >= i && p.nota < i + 1)).length);
  const W = 560, H = 210, pad = 26, bw = (W - pad * 2) / 10, max = Math.max(...bins);
  return `<svg viewBox="0 0 ${W} ${H + 24}" width="100%">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pad}" x2="${W - pad}" y1="${H - f * (H - 20)}" y2="${H - f * (H - 20)}" style="stroke:rgba(var(--fg-rgb),.05)"/>`).join("")}
    ${bins.map((b, i) => { const h = (b / max) * (H - 20); const x = pad + i * bw; return `<g data-tip="${b} películas entre ${i} y ${i + 1}"><rect x="${x + 5}" y="${H - h}" width="${bw - 10}" height="${h}" rx="1" fill="${scoreColor(i + 0.5)}" opacity=".9"/><text x="${x + bw / 2}" y="${H - h - 7}" text-anchor="middle" font-size="12" style="fill:var(--papel-2)">${b}</text><text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="12" style="fill:var(--papel-3)">${i}</text></g>`; }).join("")}
  </svg>`;
}
function decadeChart(pr) {
  const D = [...pr.decades.values()].sort((a, b) => a.key - b.key);
  const W = 560, H = 220, pad = 30, bw = (W - pad * 2) / D.length, max = Math.max(...D.map((d) => d.n));
  const y = (m) => H - ((m - 3) / 7) * (H - 30);
  const pts = D.map((d, i) => `${pad + i * bw + bw / 2},${y(d.mean)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H + 26}" width="100%">
    ${D.map((d, i) => { const h = (d.n / max) * (H - 40); const x = pad + i * bw; return `<g data-tip="Años ${String(d.key).slice(2)}: ${d.n} películas · media ${fmt1(d.mean)}"><rect x="${x + 6}" y="${H - h}" width="${bw - 12}" height="${h}" rx="1" style="fill:rgba(var(--fg-rgb),.16)"/><text x="${x + bw / 2}" y="${H + 18}" text-anchor="middle" font-size="11.5" style="fill:var(--papel-3)">${String(d.key).slice(2)}s</text></g>`; }).join("")}
    <polyline points="${pts}" fill="none" stroke-width="2.5" stroke-linejoin="round" style="stroke:var(--bombilla)"/>
    ${D.map((d, i) => `<circle cx="${pad + i * bw + bw / 2}" cy="${y(d.mean)}" r="4.5" stroke-width="2.5" data-tip="Años ${String(d.key).slice(2)}: media ${fmt1(d.mean)}" style="fill:var(--sala);stroke:var(--bombilla)"/>`).join("")}
  </svg><div class="legend"><span><i style="background:rgba(var(--acento-rgb),.35)"></i>Películas vistas</span><span><i style="background:var(--bombilla)"></i>Tu nota media</span></div>`;
}
function scatter(P, fx, lx, domain, opts = {}) {
  const W = 560, H = 240, pad = 34;
  const [x0, x1] = domain;
  const X = (v) => pad + ((v - x0) / (x1 - x0)) * (W - pad * 2);
  const Y = (n) => H - 10 - (n / 10) * (H - 30);
  const pts = P.filter((p) => fx(p) != null && fx(p) >= x0 && fx(p) <= x1);
  // regresión lineal
  const xs = pts.map(fx), ys = pts.map((p) => p.nota), mx = mean(xs), my = mean(ys);
  const b = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
  const a = my - b * mx;
  const ticks = lx(x0, x1);
  return `<svg viewBox="0 0 ${W} ${H + 22}" width="100%">
    ${[2, 4, 6, 8, 10].map((n) => `<line x1="${pad}" x2="${W - pad}" y1="${Y(n)}" y2="${Y(n)}" style="stroke:rgba(var(--fg-rgb),.05)"/><text x="${pad - 8}" y="${Y(n) + 4}" text-anchor="end" font-size="11" style="fill:var(--papel-3)">${n}</text>`).join("")}
    ${ticks.map((t) => `<text x="${X(t)}" y="${H + 16}" text-anchor="middle" font-size="11" style="fill:var(--papel-3)">${opts.etq ? opts.etq(t) : t}</text>`).join("")}
    ${pts.map((p) => `<circle cx="${X(fx(p)).toFixed(1)}" cy="${Y(p.nota).toFixed(1)}" r="3.6" fill="${scoreColor(p.nota)}" opacity=".7" data-tip="${esc(p.titulo)} (${p.anio}) · ${fmt1(p.nota)}" data-open="${p.id}" style="cursor:pointer"/>`).join("")}
    ${opts.diagonal ? `<line x1="${X(Math.max(x0, 0))}" y1="${Y(Math.max(x0, 0))}" x2="${X(Math.min(x1, 10))}" y2="${Y(Math.min(x1, 10))}" stroke-width="1.5" stroke-dasharray="5 5" opacity=".6" style="stroke:var(--papel)"/>`
      : `<line x1="${X(x0)}" y1="${Y(a + b * x0)}" x2="${X(x1)}" y2="${Y(a + b * x1)}" stroke-width="1.5" stroke-dasharray="5 5" opacity=".6" style="stroke:var(--papel)"/>`}
  </svg>`;
}
SUB.resumen = (v) => {
  const pr = profile();
  const P = pr.P;
  if (P.length < 2) {
    v.innerHTML = `<div class="page-head"><h1 class="h1">Estadísticas</h1></div><div class="empty"><div class="h2">Aún no hay datos</div>Cuando tengas al menos un par de películas con nota verás aquí tus números: notas, décadas, géneros, países y más.<br><a class="btn btn-primary rw" href="#/anadir" style="margin-top:18px">Añadir película</a></div>`;
    return;
  }
  const all = S.db.peliculas;
  const horas = all.reduce((a, p) => a + (p.duracion || 0), 0) / 60;
  const G = [...pr.genres.values()].sort((a, b) => b.n - a.n);
  const C = [...pr.countries.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  const Dir = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.mean - a.mean);
  const Sg = [...pr.sagas.values()].filter((s) => s.n >= 2).sort((a, b) => b.mean - a.mean);
  const ucm = all.filter((p) => p.saga === "UCM" && p.nota != null);
  const fases = [...new Set(ucm.map((p) => p.fase))].sort().map((f) => ({ f, L: ucm.filter((p) => p.fase === f) }));
  const taq = all.filter((p) => (p.taquilla || {}).mundial).sort((a, b) => b.taquilla.mundial - a.taquilla.mundial).slice(0, 10);
  const longest = [...all].filter((p) => p.duracion).sort((a, b) => b.duracion - a.duracion)[0];
  const oldest = [...all].filter((p) => p.anio).sort((a, b) => a.anio - b.anio)[0];
  // tú frente al público (IMDb)
  const conI = P.filter((p) => notaImdb(p));
  const dif = (p) => p.nota - notaImdb(p)[0];
  const corr = (() => {
    if (conI.length < 10) return null;
    const xs = conI.map((p) => notaImdb(p)[0]), ys = conI.map((p) => p.nota), mx = mean(xs), my = mean(ys);
    const sxy = xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0), sx = Math.sqrt(xs.reduce((t, x) => t + (x - mx) ** 2, 0)), sy = Math.sqrt(ys.reduce((t, y) => t + (y - my) ** 2, 0));
    return sxy / (sx * sy || 1);
  })();
  const media_dif = conI.length ? mean(conI.map(dif)) : 0;
  const defiendes = [...conI].sort((a, b) => dif(b) - dif(a)).slice(0, 6);
  const contra = [...conI].sort((a, b) => dif(a) - dif(b)).slice(0, 6);
  const coincide = conI.length ? conI.filter((p) => Math.abs(dif(p)) <= 1).length / conI.length : 0;
  const filaDif = (p) => `<tr class="click" data-open="${p.id}"><td>${esc(p.titulo)} <span class="dim">${p.anio || ""}</span></td><td class="r dim">${fmt1(notaImdb(p)[0])}</td><td class="r">${scoreBadge(p.nota)}</td><td class="r" style="color:${dif(p) >= 0 ? "var(--salida)" : "var(--telon-2)"};font-weight:700">${dif(p) >= 0 ? "+" : ""}${fmt1(dif(p))}</td></tr>`;
  const conTaq = P.filter((p) => (p.taquilla || {}).mundial > 1e6);
  const porAnio = {};
  for (const p of all) if (p.añadido && /^\d{4}/.test(p.añadido) && ["app", "web", "imdb", "letterboxd", "csv"].includes(p.origen)) porAnio[p.añadido.slice(0, 4)] = (porAnio[p.añadido.slice(0, 4)] || 0) + 1;
  const pliegue = (id, titulo, cap, html, abierto = false) => html ? `<details class="pliegue" id="pl_${id}" ${abierto ? "open" : ""}><summary><span class="pl-t">${titulo}</span><span class="pl-c">${cap}</span></summary><div class="pl-cuerpo">${html}</div></details>` : "";
  const ordenG = S.est_g || "n";
  const barrasG = () => hbars([...G].sort((a, b) => (ordenG === "n" ? b.n - a.n : b.mean - a.mean)).map((g) => ({ label: g.key, value: ordenG === "n" ? g.n : g.mean, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}`, tip: `${g.key}: ${g.n} películas, media ${fmt1(g.mean)}`, href: `#/coleccion?genre=${encodeURIComponent(g.key)}` })), ordenG === "n" ? {} : { max: 10 });
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Tus números</h1><p>Abre cada apartado para ver su gráfico. Pasa el ratón (o toca) por las barras y los puntos para ver el detalle; pulsa en ellos para ir a esas películas.</p></div></div>
  <div class="kpis kpis-4">
    <div class="kpi2"><b>${fmtInt(all.length)}</b><span>películas</span></div>
    <div class="kpi2"><b>${fmtInt(horas)}</b><span>horas de cine · ${fmt1(horas / 24)} días</span></div>
    <div class="kpi2"><b>${fmt2(pr.mu)}</b><span>tu nota media</span></div>
    <div class="kpi2"><b>${P.filter((p) => p.nota >= 9).length}</b><span>con un 9 o más</span></div>
  </div>
  <div class="pliegues">
    ${pliegue("notas", "Cómo puntúas", "Cuántas películas tienen cada nota", histogram(P), true)}
    ${pliegue("generos", "Géneros", `${G.length} géneros · el color es tu nota media`, `<div class="seg pl-seg" id="ordG"><button data-o="n" class="${ordenG === "n" ? "on" : ""}">Más vistos</button><button data-o="m" class="${ordenG === "m" ? "on" : ""}">Mejor nota</button></div><div id="barG">${barrasG()}</div>`, true)}
    ${pliegue("decadas", "Por décadas", "Cuántas de cada época y qué nota les das", decadeChart(pr))}
    ${pliegue("directores", "Tus directores", "Con 3 películas o más", `<table class="tbl"><thead><tr><th>Director</th><th class="r">Películas</th><th class="r">Media</th></tr></thead><tbody>${Dir.slice(0, 15).map((d) => `<tr class="click" onclick="location.hash='#/persona?n=${encodeURIComponent(d.key)}'"><td>${esc(d.key)}</td><td class="r dim">${d.n}</td><td class="r">${scoreBadge(d.mean)}</td></tr>`).join("")}</tbody></table>`)}
    ${pliegue("paises", "Países", "Los 10 que más ves", hbars(C.map((g) => ({ label: g.key, value: g.n, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}`, tip: `${g.key}: media ${fmt1(g.mean)}`, href: `#/coleccion?country=${encodeURIComponent(g.key)}` }))))}
    ${conI.length >= 10 ? pliegue("publico", "Tú frente al público", `Coincides con IMDb (±1 punto) en el ${Math.round(coincide * 100)} % · ${media_dif >= 0 ? `pones ${fmt1(media_dif)} más` : `pones ${fmt1(-media_dif)} menos`} de media`,
      `${scatter(conI, (p) => notaImdb(p)[0], () => [4, 5, 6, 7, 8, 9], [3.5, 9.5], { diagonal: true })}
      <div class="pl-dos"><div><div class="sub">Las defiendes más que nadie</div><table class="tbl"><thead><tr><th>Película</th><th class="r">IMDb</th><th class="r">Tú</th><th class="r">Dif.</th></tr></thead><tbody>${defiendes.map(filaDif).join("")}</tbody></table></div>
      <div><div class="sub">Vas contra corriente</div><table class="tbl"><thead><tr><th>Película</th><th class="r">IMDb</th><th class="r">Tú</th><th class="r">Dif.</th></tr></thead><tbody>${contra.map(filaDif).join("")}</tbody></table></div></div>`) : ""}
    ${pliegue("duracion", "¿Largas o cortas?", "Duración frente a tu nota · la línea es la tendencia", scatter(P, (p) => p.duracion, () => [80, 100, 120, 140, 160, 180, 200], [70, 210]))}
    ${pliegue("epoca", "¿Antiguas o modernas?", "Año de estreno frente a tu nota", scatter(P, (p) => p.anio, () => [1940, 1960, 1980, 2000, 2020], [1935, 2027]))}
    ${conTaq.length >= 15 ? pliegue("taquilla", "Taquilla", "Recaudación frente a tu nota y las más taquilleras que has visto", `${scatter(conTaq, (p) => Math.log10(p.taquilla.mundial / 1e6), () => [0, 1, 2, 3], [-0.2, 3.4], { etq: (t) => ["1 M$", "10 M$", "100 M$", "1.000 M$"][t] })}
      <table class="tbl"><thead><tr><th>Película</th><th class="r">Año</th><th class="r">Mundial</th><th class="r">Tu nota</th></tr></thead><tbody>${taq.map((p) => `<tr class="click" data-open="${p.id}"><td>${esc(p.titulo)}</td><td class="r dim">${p.anio}</td><td class="r">${money(p.taquilla.mundial)}</td><td class="r">${scoreBadge(p.nota)}</td></tr>`).join("")}</tbody></table>`) : ""}
    ${Object.keys(porAnio).length >= 2 ? pliegue("ritmo", "Tu ritmo", "Películas añadidas cada año", hbars(Object.entries(porAnio).sort().map(([a, n]) => ({ label: a, value: n })))) : ""}
    ${ucm.length >= 3 ? pliegue("ucm", "Universo Marvel", `${ucm.length} películas · media ${fmt1(mean(ucm.map((p) => p.nota)))}`, hbars(fases.map((f) => ({ label: f.f.replace(/ · .*/, ""), value: mean(f.L.map((p) => p.nota)), color: scoreColor(mean(f.L.map((p) => p.nota))), right: fmt1(mean(f.L.map((p) => p.nota))), tip: f.f })), { max: 10 })) : ""}
    ${pliegue("curiosidades", "Curiosidades", "Récords de tu colección", `<div class="curios">
      ${longest ? `<div data-open="${longest.id}"><span>La más larga</span><b>${durTxt(longest.duracion)}</b><em>${esc(longest.titulo)}</em></div>` : ""}
      ${oldest ? `<div data-open="${oldest.id}"><span>La más antigua</span><b>${oldest.anio}</b><em>${esc(oldest.titulo)}</em></div>` : ""}
      <div><span>Suspensos</span><b>${P.filter((p) => p.nota < 5).length}</b><em>${Math.round((100 * P.filter((p) => p.nota < 5).length) / P.length)} % de las que has visto</em></div>
      <div><span>Mediana de tus notas</span><b>${fmt1([...P].sort((a, b) => a.nota - b.nota)[Math.floor(P.length / 2)].nota)}</b><em>la mitad está por encima</em></div>
      <div><span>Series</span><b>${S.db.series.length}</b><em>aparte de las películas</em></div></div>`)}
  </div>`;
  // recordar qué apartados abres
  let abiertos; try { abiertos = JSON.parse(localStorage.getItem("filora.pliegues") || "null"); } catch (e) { abiertos = null; }
  if (abiertos) $$(".pliegue", v).forEach((d) => (d.open = abiertos.includes(d.id)));
  $$(".pliegue", v).forEach((d) => d.addEventListener("toggle", () => { try { localStorage.setItem("filora.pliegues", JSON.stringify($$(".pliegue[open]", v).map((x) => x.id))); } catch (e) { /* */ } }));
  $$("#ordG button", v).forEach((b) => (b.onclick = (ev) => { ev.preventDefault(); S.est_g = b.dataset.o; $$("#ordG button", v).forEach((x) => x.classList.toggle("on", x === b)); const ord = S.est_g; $("#barG").innerHTML = hbars([...G].sort((a, c) => (ord === "n" ? c.n - a.n : c.mean - a.mean)).map((g) => ({ label: g.key, value: ord === "n" ? g.n : g.mean, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}`, tip: `${g.key}: ${g.n} películas, media ${fmt1(g.mean)}`, href: `#/coleccion?genre=${encodeURIComponent(g.key)}` })), ord === "n" ? {} : { max: 10 }); }));
};

// ---------------------------------------------------------------- Mis gustos
function insights() {
  const pr = profile();
  const P = pr.P;
  const out = [];
  const G = [...pr.genres.values()].filter((g) => g.n >= 8);
  const favG = [...G].sort((a, b) => b.adj - a.adj);
  const most = [...pr.genres.values()].sort((a, b) => b.n - a.n)[0];
  const aprob = P.filter((p) => p.nota >= 5).length / P.length;
  const exig = pr.mu < 6 ? "exigente" : pr.mu < 6.8 ? "equilibrado" : "generoso";
  out.push({ big: fmt2(pr.mu), ttl: `Eres un espectador ${exig}`, txt: `Tu nota media es ${fmt2(pr.mu)} y apruebas el ${Math.round(aprob * 100)}% de lo que ves. ${((n) => n === 0 ? "Ninguna ha llegado todavía al 9." : n === 1 ? "Solo una ha llegado al 9." : `${n} han llegado al 9.`)(P.filter((p) => p.nota >= 9).length)}` });
  if (favG[0]) out.push({ big: fmt1(favG[0].mean), ttl: `Tu terreno: ${frase(favG[0].key)}`, txt: `Es donde más brillas: media de ${fmt1(favG[0].mean)} en ${favG[0].n} películas${favG[1] ? `, seguido de ${frase(favG[1].key)} (${fmt1(favG[1].mean)})` : ""}.` });
  const dirs = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.adj - a.adj);
  if (dirs[0]) out.push({ big: fmt1(dirs[0].mean), ttl: `Director de cabecera: ${dirs[0].key}`, txt: `${dirs[0].n} películas vistas con una media de ${fmt1(dirs[0].mean)}. Detrás: ${dirs.slice(1, 3).map((d) => `${d.key} (${fmt1(d.mean)})`).join(" y ")}.` });
  if (most) out.push({ big: most.n, ttl: `Lo que más ves: ${frase(most.key)}`, txt: `El ${Math.round((100 * most.n) / P.length)}% de tu colección tiene algo de ${most.key.toLowerCase()}. Le das un ${fmt1(most.mean)} de media.` });
  const decs = [...pr.decades.values()].filter((d) => d.n >= 8).sort((a, b) => b.mean - a.mean);
  if (decs[0]) out.push({ big: `${String(decs[0].key).slice(2)}s`, ttl: "Tu década dorada", txt: `Las películas de los ${decs[0].key} son las que mejor puntúas (${fmt1(decs[0].mean)}). Las que menos, las de los ${decs[decs.length - 1].key} (${fmt1(decs[decs.length - 1].mean)}).` });
  const old = P.filter((p) => p.anio < 2000), nw = P.filter((p) => p.anio >= 2015);
  if (old.length > 10 && nw.length > 10) {
    const d = mean(old.map((p) => p.nota)) - mean(nw.map((p) => p.nota));
    out.push({ big: `${d >= 0 ? "+" : ""}${fmt1(d)}`, ttl: d > 0.3 ? "Los clásicos te ganan" : d < -0.3 ? "Lo nuevo te convence más" : "Ni nostálgico ni moderno", txt: `Das ${fmt1(mean(old.map((p) => p.nota)))} a las anteriores al 2000 y ${fmt1(mean(nw.map((p) => p.nota)))} a las de 2015 en adelante. Ojo: de lo antiguo sueles ver ya lo mejor.` });
  }
  const worstG = [...G].sort((a, b) => a.adj - b.adj)[0];
  if (worstG) out.push({ big: fmt1(worstG.mean), ttl: `Tu talón de Aquiles: ${frase(worstG.key)}`, txt: `Es el género que peor puntúas (${worstG.n} películas). ${worstG.items.sort((a, b) => a.nota - b.nota).slice(0, 2).map((p) => `«${p.titulo}» (${fmt1(p.nota)})`).join(" y ")} lo dicen todo.` });
  const esp = P.filter((p) => p.pais === "España");
  const espC = esp.filter((p) => (p.generos || []).includes("Comedia"));
  const espT = esp.filter((p) => (p.generos || []).includes("Thriller") || (p.generos || []).includes("Crimen"));
  if (espC.length >= 5 && espT.length >= 5) out.push({ big: fmt1(mean(espT.map((p) => p.nota))), ttl: "Cine español: thriller sí, comedia no tanto", txt: `Al thriller y el policiaco español le das ${fmt1(mean(espT.map((p) => p.nota)))}; a la comedia española, ${fmt1(mean(espC.map((p) => p.nota)))}. En total has visto ${esp.length} películas españolas.` });
  const anime = P.filter((p) => p.pais === "Japón" && (p.generos || []).includes("Animación"));
  const ghibli = anime.filter((p) => /Miyazaki|Takahata/.test(p.director));
  if (ghibli.length >= 3) out.push({ big: fmt1(mean(ghibli.map((p) => p.nota))), ttl: "Corazón Ghibli", txt: `Miyazaki y Takahata: ${ghibli.length} películas con una media de ${fmt1(mean(ghibli.map((p) => p.nota)))}, muy por encima del resto de animación japonesa (${fmt1(mean(anime.filter((p) => !ghibli.includes(p)).map((p) => p.nota)))}).` });
  const dur = P.filter((p) => p.duracion);
  const longs = dur.filter((p) => p.duracion >= 140), shorts = dur.filter((p) => p.duracion < 100);
  if (longs.length > 10 && shorts.length > 10) {
    const dl = mean(longs.map((p) => p.nota)), ds = mean(shorts.map((p) => p.nota));
    out.push({ big: `${fmt1(dl)} / ${fmt1(ds)}`, ttl: dl > ds + 0.4 ? "Te van las películas largas" : ds > dl + 0.4 ? "Mejor si es corta" : "La duración te da igual", txt: `Las de más de 2 h 20 min se llevan un ${fmt1(dl)} de media; las de menos de 100 minutos, un ${fmt1(ds)}.` });
  }
  const ucm = P.filter((p) => p.saga === "UCM");
  if (ucm.length >= 10) {
    const a = ucm.filter((p) => p.anio <= 2019), b = ucm.filter((p) => p.anio > 2019);
    out.push({ big: fmt1(mean(ucm.map((p) => p.nota))), ttl: "Marvel: fan con reservas", txt: `${ucm.length} películas del UCM. Hasta Endgame les dabas ${fmt1(mean(a.map((p) => p.nota)))}; desde entonces, ${fmt1(mean(b.map((p) => p.nota)))}.` });
  }
  const hor = P.filter((p) => (p.generos || []).includes("Terror"));
  const horSaga = hor.filter((p) => p.saga), horNo = hor.filter((p) => !p.saga);
  if (horSaga.length >= 5 && horNo.length >= 5) out.push({ big: fmt1(mean(horNo.map((p) => p.nota))), ttl: "Terror: original mejor que franquicia", txt: `El terror de autor o independiente te da ${fmt1(mean(horNo.map((p) => p.nota)))}; las sagas de terror (Insidious, La Purga, Saw…) se quedan en ${fmt1(mean(horSaga.map((p) => p.nota)))}.` });
  return out;
}
const insightCard = (i) => `<div class="card insight"><div class="big">${esc(i.big)}</div><div class="ttl">${esc(i.ttl)}</div><p>${esc(i.txt)}</p></div>`;

function radar(pr) {
  const G = [...pr.genres.values()].filter((g) => g.n >= 6).sort((a, b) => b.n - a.n).slice(0, 10);
  const R = 150, cx = 210, cy = 190, n = G.length;
  const pt = (i, r) => [cx + r * Math.sin((2 * Math.PI * i) / n), cy - r * Math.cos((2 * Math.PI * i) / n)];
  const val = (g) => clamp((g.mean - 3) / 6, 0.05, 1);
  const poly = G.map((g, i) => pt(i, R * val(g)).join(",")).join(" ");
  const avgPoly = G.map((_, i) => pt(i, R * clamp((pr.mu - 3) / 6, 0, 1)).join(",")).join(" ");
  return `<svg viewBox="0 0 420 390" width="100%" style="max-width:440px">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${G.map((_, i) => pt(i, R * f).join(",")).join(" ")}" fill="none" stroke="rgba(var(--fg-rgb),.07)"/>`).join("")}
    ${G.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" style="stroke:rgba(var(--fg-rgb),.06)"/>`).join("")}
    <polygon points="${avgPoly}" fill="none" stroke-dasharray="4 4" style="stroke:rgba(var(--fg-rgb),.35)"/>
    <polygon points="${poly}" stroke-width="2" style="fill:rgba(var(--acento-rgb),.2);stroke:var(--bombilla)"/>
    ${G.map((g, i) => { const [x, y] = pt(i, R * val(g)); const [lx, ly] = pt(i, R + 26); return `<circle cx="${x}" cy="${y}" r="4" data-tip="${g.key}: ${fmt1(g.mean)} (${g.n} películas)" style="fill:var(--bombilla)"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11.5" style="fill:var(--papel-2)">${g.key}</text>`; }).join("")}
  </svg>`;
}
SUB.gustos = (v) => {
  const pr = profile();
  const G = [...pr.genres.values()].filter((g) => g.n >= 8).sort((a, b) => b.adj - a.adj);
  const dirs = [...pr.directors.values()].filter((d) => d.n >= 3).sort((a, b) => b.adj - a.adj);
  const top = [...pr.P].sort((a, b) => b.nota - a.nota).slice(0, 3);
  const persona = `Te mueven <em>${G.slice(0, 2).map((g) => frase(g.key)).join("</em> y <em>")}</em>, confías en <em>${dirs.slice(0, 2).map((d) => d.key).join(" y ")}</em> y tu Olimpo lo forman ${top.map((p) => `«${esc(p.titulo)}»`).join(", ")}.`;
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Mis gustos</h1><p>Un retrato de cómo ves el cine a partir de tus ${pr.N} notas. Se recalcula cada vez que añades una película.</p></div></div>
  <div class="card card-pad dna">
    <div>${radar(pr)}<div class="legend" style="justify-content:center"><span><i style="background:var(--bombilla)"></i>Tu nota por género</span><span><i style="background:rgba(var(--fg-rgb),.35)"></i>Tu media general (${fmt2(pr.mu)})</span></div></div>
    <div><div class="eyebrow">En una frase</div><p class="persona" style="margin:12px 0 22px">${persona}</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:22px">
        <div><div class="sub" style="margin-top:0">Te encanta</div>${G.slice(0, 5).map((g) => `<div class="hbar" style="grid-template-columns:1fr 50px"><span class="n">${g.key}</span><span class="v">${scoreBadge(g.mean)}</span></div>`).join("")}</div>
        <div><div class="sub" style="margin-top:0">Te cuesta</div>${G.slice(-5).reverse().map((g) => `<div class="hbar" style="grid-template-columns:1fr 50px"><span class="n">${g.key}</span><span class="v">${scoreBadge(g.mean)}</span></div>`).join("")}</div>
      </div></div>
  </div>
  <section class="section">${sectionHead("Lo que dicen tus notas")}<div class="insights">${insights().slice(0, 4).map(insightCard).join("")}</div>
    ${insights().length > 4 ? `<details class="pliegue" style="margin-top:12px"><summary><span class="pl-t">${insights().length - 4} conclusiones más</span><span class="pl-c">Décadas, duración, sagas, cine español…</span></summary><div class="pl-cuerpo"><div class="insights">${insights().slice(4).map(insightCard).join("")}</div></div></details>` : ""}</section>
  ${seriesInsights().length ? `<section class="section">${sectionHead("Y en series…", "#/coleccion?t=series", "Ver tus series")}<div class="insights">${seriesInsights().map(insightCard).join("")}</div></section>` : ""}
  <section class="section"><details class="pliegue"><summary><span class="pl-t">Tus directores</span><span class="pl-c">Los ${Math.min(25, dirs.length)} con más peso en tus gustos · pulsa uno para ver su ficha</span></summary>
    <div class="pl-cuerpo"><table class="tbl"><thead><tr><th>Director</th><th class="r">Películas</th><th class="r">Nota media</th><th>Mejor</th><th>Peor</th></tr></thead><tbody>
    ${dirs.slice(0, 25).map((d) => { const s = [...d.items].sort((a, b) => b.nota - a.nota); return `<tr class="click" onclick="location.hash='#/persona?n=${encodeURIComponent(d.key)}'"><td><b>${esc(d.key)}</b></td><td class="r dim">${d.n}</td><td class="r">${scoreBadge(d.mean)}</td><td class="muted">${esc(s[0].titulo)} <span class="dim">${fmt1(s[0].nota)}</span></td><td class="muted">${esc(s[s.length - 1].titulo)} <span class="dim">${fmt1(s[s.length - 1].nota)}</span></td></tr>`; }).join("")}
    </tbody></table></div></details></section>`;
};

// ---------------------------------------------------------------- Recomendaciones
function seenKey(p) { return [norm(p.titulo) + "|" + (p.anio || ""), norm(p.tituloOriginal || "") + "|" + (p.anio || "")]; }
function seenSet() {
  const s = new Set();
  for (const p of S.db.peliculas) for (const y of [p.anio - 1, p.anio, p.anio + 1]) { s.add(norm(p.titulo) + "|" + y); if (p.tituloOriginal) s.add(norm(p.tituloOriginal) + "|" + y); }
  return s;
}
const isSeen = (x, set) => set.has(norm(x.titulo) + "|" + (x.anio || "")) || (x.tituloOriginal && set.has(norm(x.tituloOriginal) + "|" + (x.anio || ""))) || (x.original && set.has(norm(x.original) + "|" + String(x.fecha || "").slice(0, 4)));
function descartadas() { try { return new Set(JSON.parse(localStorage.getItem("cine.desc") || "[]")); } catch (e) { return new Set(); } }
function topRecs(n = 999, filt = {}) {
  const seen = seenSet();
  const pend = new Set(S.db.pendientes.map((w) => norm(w.titulo)));
  const desc = descartadas();
  return S.cat.map((c, i) => ({ ...c, _i: i }))
    .filter((c) => !isSeen(c, seen) && !desc.has(norm(c.tituloOriginal)))
    .filter((c) => !filt.genre || c.generos.includes(filt.genre))
    .filter((c) => !filt.era || (filt.era === "clasicos" ? c.anio < 1990 : filt.era === "recientes" ? c.anio >= 2020 : c.anio >= 1990 && c.anio < 2020))
    .map((c) => ({ ...c, m: predict(c), pend: pend.has(norm(c.titulo)) }))
    .sort((a, b) => b.m.nota - a.m.nota)
    .filter(diversify(filt.variedad ?? 2))
    .slice(0, n);
}
// evita que la lista se llene del mismo director o de la misma década
function diversify(maxDir) {
  const dirs = new Map(), decs = new Map();
  return (c) => {
    const d = splitDir(c.director)[0], dec = Math.floor(c.anio / 10);
    const nd = dirs.get(d) || 0, ne = decs.get(dec) || 0;
    if (nd >= maxDir || (maxDir === 1 && ne >= 3)) return false;
    dirs.set(d, nd + 1); decs.set(dec, ne + 1);
    return true;
  };
}
function recCard(r) {
  const jw = `https://www.justwatch.com/es/buscar?q=${encodeURIComponent(r.titulo)}`;
  const fa = extLinks(r)[0].u;
  return `<div class="card rec">
    <div class="frame" data-cat="${r._i}">${posterHTML(r)}</div>
    <div style="min-width:0">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div class="t">${esc(r.titulo)}</div>${matchTag(r.m.pct)}</div>
      <div class="s">${r.anio} · ${esc(r.director)} · ${esc(r.pais)}</div>
      <div class="chips">${r.generos.map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      <div class="why">${r.m.why.map((w) => `<span>${esc(w)}</span>`).join("")}</div>
      <div class="acts">
        <a class="btn btn-sm" href="${jw}" target="_blank" rel="noopener">${icon("play")}Dónde verla</a>
        <a class="btn btn-sm btn-ghost" href="${fa}" target="_blank" rel="noopener">FilmAffinity</a>
        ${r.pend ? `<span class="chip gold">En pendientes</span>` : `<button class="btn btn-sm btn-ghost" data-want="${r._i}" title="Añadir a pendientes">${icon("bookmark")}</button>`}
        <button class="btn btn-sm btn-ghost" data-seen="${r._i}" title="Ya la he visto">${icon("eye")}</button>
        <button class="btn btn-sm btn-ghost" data-nope="${r._i}" title="No me interesa">${icon("eyeoff")}</button>
      </div>
    </div></div>`;
}
// enlace a la ficha de cualquier película (catálogo, Wikidata, IMDb o FilmAffinity)
const fichaDe = (c) => c.ids && c.ids.wikidata ? `#/pelicula?q=${c.ids.wikidata}` : c.ids && c.ids.imdb ? `#/pelicula?imdb=${c.ids.imdb}` : c.fa ? `#/pelicula?fa=${c.fa}` : `#/buscar?q=${encodeURIComponent(c.titulo)}`;
const gustaraTxt = (pct) => `${pct} % de que te guste`;
function recMini(r, acciones = true) {
  const i = notaImdb(r);
  return `<article class="rm">
    <a class="rm-cartel" href="${fichaDe(r)}">${posterHTML(r)}<span class="rm-pct" style="--p:${r.m.pct}">${r.m.pct}%</span></a>
    <a class="rm-t" href="${fichaDe(r)}">${esc(r.titulo)}</a>
    <div class="rm-s">${esc([r.anio, splitDir(r.director)[0]].filter(Boolean).join(" · "))}</div>
    <div class="rm-n">${scoreBadge(r.m.nota)}<span>te daría${i ? ` · IMDb ${fmt1(i[0])}` : ""}</span></div>
    ${r.m.why[0] ? `<div class="rm-why">${esc(r.m.why[0])}</div>` : ""}
    ${acciones && r._i != null && !ro() ? `<div class="rm-acc">${r.pend ? `<span class="chip gold">En pendientes</span>` : `<button class="icon-btn" data-want="${r._i}" title="Guardar en pendientes">${icon("bookmark")}</button>`}<button class="icon-btn" data-seen="${r._i}" title="Ya la he visto">${icon("eye")}</button><button class="icon-btn" data-nope="${r._i}" title="No me interesa">${icon("eyeoff")}</button></div>` : ""}
  </article>`;
}
// Más películas de tus directores favoritos (Wikidata), que no estén en el catálogo ni vistas
// Filmografías de tus directores favoritos (Wikidata): cuántas has visto y cuáles te faltan
async function filmografiasDirectores() {
  const k = "filmdir1." + S.db.peliculas.length;
  const hit = typeof cacheLeer === "function" ? cacheLeer(k, 3) : null;
  if (hit) return hit;
  const pr = profile(), seen = seenSet(), hoy = new Date().getFullYear();
  const dirs = [...pr.directors.values()].filter((d) => d.n >= 3 && d.adj > 0.2).sort((a, b) => b.adj - a.adj).slice(0, 8);
  const out = [];
  for (const d of dirs) {
    try {
      const q = await resolverPersona(d.key);
      if (!q) continue;
      const pelis = (await filmografiaRapida(q)).filter((x) => [...(x.roles || [])].includes("Dirección") && x.anio && x.anio <= hoy);
      const faltan = pelis.filter((x) => !isSeen({ titulo: x.t, anio: x.anio }, seen))
        .map((x) => ({ titulo: x.t, anio: x.anio, director: d.key, ids: { wikidata: x.q, ...(x.i ? { imdb: x.i } : {}) }, w: x.w, sl: x.sl }));
      if (pelis.length) out.push({ director: d.key, q, total: pelis.length, vistas: pelis.length - faltan.length, media: d.mean, faltan });
    } catch (e) { /* ese director no se encuentra */ }
  }
  if (typeof cacheGuardar === "function") cacheGuardar(k, out);
  return out;
}
async function recsDirectores() {
  return (await filmografiasDirectores()).flatMap((f) => f.faltan.slice(0, 6));
}
// Para ti: «Has visto 7 de 12 de Nolan», con las que faltan ordenadas por tu %
async function pintarFilmografias(box) {
  const F = (await filmografiasDirectores()).filter((f) => f.faltan.length && f.vistas >= 2);
  if (!box.isConnected) return;
  if (!F.length) { box.remove(); return; }
  for (const f of F) f.lista = f.faltan.map((x) => ({ ...x, m: predict(x) })).sort((a, b) => b.m.pct - a.m.pct).slice(0, 6);
  const cart = typeof cartelesWiki === "function" ? await cartelesWiki(F.flatMap((f) => f.lista.map((x) => x.w)).filter(Boolean)) : {};
  for (const f of F) for (const x of f.lista) x.poster = cart[x.w] || null;
  if (!box.isConnected) return;
  box.innerHTML = `${sectionHead("Filmografías por completar")}${F.map((f) => `<div class="fl-dir">
      <div class="fl-cab"><a class="fl-n" href="#/persona?q=${f.q}">${esc(f.director)}</a>
        <span class="fl-c">Has visto <b>${f.vistas}</b> de ${f.total}${f.media ? ` · le das un ${fmt1(f.media)} de media` : ""}</span>
        <span class="fl-barra"><i style="width:${(100 * f.vistas / f.total).toFixed(0)}%"></i></span></div>
      <div class="rms">${f.lista.map((r) => recMini(r, false)).join("")}</div></div>`).join("")}`;
}
VIEWS.recomendaciones = (v) => {
  const f = S.recs;
  const pr = profile();
  if (pr.modelo === undefined) pr.modelo = entrenarModelo(pr);
  const enCines = () => [...carteleraIdx().values()].map((p) => ({ ...p, info: infoCartelera(p) })).filter((p) => !p.info.vista && p.info.m.pct >= 55)
    .sort((a, b) => b.info.m.pct - a.info.m.pct).slice(0, 6).map((p) => ({ titulo: p.titulo, anio: p.anio, director: p.director, poster: p.poster, generos: p.info.generos, fa: p.fa, m: p.info.m }));
  const draw = () => {
    const L = topRecs(60, f);
    const hoy = L.find((r) => !r.pend) || L[0];
    const top = L.filter((r) => r !== hoy && r.m.pct >= 70).slice(0, 12);
    const resto = L.filter((r) => r !== hoy && !top.includes(r)).slice(0, 18);
    const cines = enCines();
    $("#recRes").innerHTML = !L.length ? `<div class="empty"><div class="h2">Sin recomendaciones con ese filtro</div></div>` : `
      ${hoy ? `<section class="rec-hoy">
        <a class="rec-hoy-cartel" href="${fichaDe(hoy)}">${posterHTML(hoy)}</a>
        <div><div class="eyebrow">Tu película para hoy</div><a class="rec-hoy-t" href="${fichaDe(hoy)}">${esc(hoy.titulo)}</a>
          <div class="dim">${esc([hoy.anio, hoy.director, hoy.pais].filter(Boolean).join(" · "))}</div>
          <div class="rec-hoy-n">${scoreBadge(hoy.m.nota, "lg")}<div><b>${gustaraTxt(hoy.m.pct)}</b><span>Nota que predigo que le darías</span></div></div>
          <ul class="rec-hoy-why">${hoy.m.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
          <div class="pe-acciones"><a class="btn btn-primary" href="${fichaDe(hoy)}">Ver ficha</a>${!ro() && !hoy.pend ? `<button class="btn" data-want="${hoy._i}">${icon("bookmark")}Guardar en pendientes</button>` : ""}<a class="btn btn-ghost" href="https://www.justwatch.com/es/buscar?q=${encodeURIComponent(hoy.titulo)}" target="_blank" rel="noopener">${icon("play")}Dónde verla</a></div>
        </div></section>` : ""}
      ${top.length ? `<section class="section">${sectionHead("Te van a encantar")}<div class="rms">${top.map((r) => recMini(r)).join("")}</div></section>` : ""}
      ${!f.genre && !f.era ? animosHTML(L.filter((r) => r !== hoy)) : ""}
      ${!f.genre && !f.era ? `<section class="section" id="recDir">${sectionHead("Filmografías por completar")}<div class="dim cargando-mini">Buscando en las filmografías de tus directores favoritos…</div></section>` : ""}
      ${cines.length && !f.genre && !f.era ? `<section class="section">${sectionHead("En tus cines y te encajan", "#/cartelera", "Ver sesiones")}<div class="rms">${cines.map((r) => recMini(r, false)).join("")}</div></section>` : ""}
      ${resto.length ? `<details class="section rec-mas"><summary>${sectionHead(`Otras ${resto.length} que pueden gustarte`)}</summary><div class="rms">${resto.map((r) => recMini(r)).join("")}</div></details>` : ""}`;
    $$("[data-animo]", v).forEach((b) => (b.onclick = () => { S.recAnimo = b.dataset.animo; draw(); }));
    if (!f.genre && !f.era && $("#recDir")) pintarFilmografias($("#recDir")).catch(() => { const box = $("#recDir"); if (box) box.remove(); });
  };
  const cv = pr.cv;
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Para ti</h1>
    <p>Películas que no has visto, elegidas por lo que de verdad te gusta: tus géneros, directores, países y épocas, y lo que dicen IMDb, FilmAffinity y Letterboxd. El % es la probabilidad de que le des un ${fmt1(pr.umbral)} o más.</p>
    ${cv && cv.azar ? `<p class="dim" style="font-size:12.5px">Probado con tus ${pr.N} notas: acierta con un error medio de ±${fmt1(cv.mae)} puntos (adivinando tu media fallaría ±${fmt1(cv.azar)}).</p>` : ""}</div>
    <a class="btn" href="#/juntos">${icon("user")}Ver con alguien</a></div>
  <details class="filtros-rec" ${f.genre || f.era ? "open" : ""}><summary>${icon("spark")}Filtrar por género o época${f.genre || f.era ? ` · ${[f.genre, { clasicos: "clásicos", modernas: "1990–2019", recientes: "2020+" }[f.era]].filter(Boolean).join(", ")}` : ""}</summary>
    <div class="chips" id="rg"><button class="chip ${!f.genre ? "on" : ""}" data-g="">Todos los géneros</button>${GENEROS.filter((g) => S.cat.some((c) => c.generos.includes(g))).map((g) => `<button class="chip ${f.genre === g ? "on" : ""}" data-g="${g}">${g}</button>`).join("")}</div>
    <div class="seg" id="re">${[["", "Todas"], ["clasicos", "Clásicos"], ["modernas", "1990–2019"], ["recientes", "2020+"]].map(([k, l]) => `<button data-e="${k}" class="${f.era === k ? "on" : ""}">${l}</button>`).join("")}</div>
  </details>
  <div id="recRes"></div>`;
  $$("#rg .chip", v).forEach((b) => (b.onclick = () => { f.genre = b.dataset.g; $$("#rg .chip", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  $$("#re button", v).forEach((b) => (b.onclick = () => { f.era = b.dataset.e; $$("#re button", v).forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  draw();
};
// «¿Qué te apetece?»: la misma lista de recomendaciones vista por estado de ánimo
const ANIMOS = [
  ["reir", "Reírme", (c) => c.generos.includes("Comedia")],
  ["pensar", "Algo que me remueva", (c) => c.generos.includes("Drama") && !c.generos.includes("Comedia")],
  ["tension", "Tensión", (c) => c.generos.some((g) => ["Thriller", "Crimen", "Misterio"].includes(g))],
  ["miedo", "Pasar miedo", (c) => c.generos.includes("Terror")],
  ["evadirme", "Evadirme", (c) => c.generos.some((g) => ["Ciencia ficción", "Fantasía", "Aventura", "Animación"].includes(g))],
  ["clasico", "Un clásico", (c) => c.anio < 1980],
  ["espanol", "Cine español", (c) => /españa/i.test(c.pais || "")],
  ["nuevo", "Algo reciente", (c) => c.anio >= new Date().getFullYear() - 3],
];
function animosHTML(L) {
  const hay = ANIMOS.map(([k, l, f]) => [k, l, L.filter(f)]).filter((x) => x[2].length >= 2);
  if (!hay.length) return "";
  const sel = hay.find((x) => x[0] === S.recAnimo) || hay[0];
  return `<section class="section">${sectionHead("¿Qué te apetece?")}
    <div class="chips animos">${hay.map(([k, l, X]) => `<button class="chip ${k === sel[0] ? "on" : ""}" data-animo="${k}">${l} <small>${X.length}</small></button>`).join("")}</div>
    <div class="rms">${sel[2].slice(0, 6).map((r) => recMini(r)).join("")}</div></section>`;
}
function openCat(i) {
  const c = S.cat[i];
  const m = predict(c);
  modal(`<div class="sheet-body"><div class="detail">
    <div><div class="poster">${posterHTML(c)}</div></div>
    <div><div class="eyebrow">Recomendación · ${m.pct}% afinidad</div><h2 style="margin-top:8px">${esc(c.titulo)}</h2>
      ${c.tituloOriginal !== c.titulo ? `<div class="orig">${esc(c.tituloOriginal)}</div>` : ""}
      <div class="facts"><span>${icon("calendar")}${c.anio}</span><span>${icon("user")}${esc(c.director)}</span><span>${icon("globe")}${esc(c.pais)}</span></div>
      <div class="chips">${c.generos.map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      <div class="myscore">${scoreBadge(m.nota, "lg")}<div><div class="lbl">Nota que predigo que le darías</div><div class="verdict">${veredicto(m.nota)}</div></div></div>
      <div class="why" style="display:flex;flex-direction:column;gap:6px;color:var(--text-2)">${m.why.map((w) => `<span>— ${esc(w)}</span>`).join("")}</div>
      <div class="sub">Ver en</div>${linksHTML(c)}
      <div class="dl-actions"><button class="btn btn-primary" data-seen="${i}">${icon("eye")}Ya la vi: puntuarla</button><button class="btn" data-want="${i}">${icon("bookmark")}Añadir a pendientes</button></div>
    </div></div></div>`);
}

// ---------------------------------------------------------------- Estrenos
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function upcoming() { const t = addDays(todayISO(), -6); return (S.est.estrenos || []).filter((e) => e.fecha >= t); }
function relCard(e) {
  const m = e.m || predict(e);
  const seen = isSeen({ titulo: e.titulo, anio: +e.fecha.slice(0, 4), original: e.original, fecha: e.fecha }, seenSet());
  const pendiente = S.db.pendientes.some((w) => norm(w.titulo) === norm(e.titulo));
  const avisar = seen || ro() ? "" : pendiente ? `<span class="chip gold rel-avisar">${icon("bookmark")}Te aviso</span>`
    : `<button class="chip rel-avisar" data-relwant="${esc(e.fecha + "|" + e.titulo)}" title="Guardar en pendientes y avisarme cuando llegue a mis cines">${icon("bookmark")}Avisarme</button>`;
  return `<div class="card rel rel2" ${e.fa ? `onclick="if(!event.target.closest('[data-relwant]'))location.hash='#/pelicula?fa=${e.fa}'"` : `data-rel="${esc(e.fecha + "|" + e.titulo)}"`} style="cursor:pointer">
    <div class="frame">${posterHTML({ ...e, anio: e.fecha.slice(0, 4) })}</div>
    <div class="rel-cuerpo">
      <div class="cfilm-head"><div style="min-width:0"><div class="rel-fecha">${diaSemana(e.fecha)} ${fechaLarga(e.fecha)}${e.provisional ? " · provisional" : ""}</div>
        <div class="t">${esc(e.titulo)}${e.destacado ? ` <span class="dest" title="Estreno destacado">●</span>` : ""}</div>
        <div class="s">${esc([e.director, e.pais].filter(Boolean).join(" · ") || "—")}</div></div>
        ${seen ? `<span class="chip on">${icon("check")}Vista</span>` : matchTag(m.pct)}</div>
      ${avisar}
      ${e.reparto && !/loading|movie card/i.test(e.reparto) ? `<div class="rel-rep">Con ${esc(e.reparto)}</div>` : ""}
      ${e.sinopsis ? `<p class="rel-sin">${esc(e.sinopsis)}</p>` : ""}
      ${(e.generos || []).length ? `<div class="chips">${e.generos.slice(0, 3).map((g) => `<span class="chip">${g}</span>`).join("")}</div>` : ""}
    </div></div>`;
}
function openRel(key) {
  const e = (S.est.estrenos || []).find((x) => x.fecha + "|" + x.titulo === key);
  if (!e) return;
  const m = predict(e);
  const q = encodeURIComponent(e.titulo);
  modal(`<div class="sheet-body"><div class="detail">
    <div><div class="poster">${posterHTML({ ...e, anio: e.fecha.slice(0, 4) })}</div></div>
    <div><div class="eyebrow">Estreno en cines · ${diaSemana(e.fecha)} ${fechaLarga(e.fecha)} ${e.fecha.slice(0, 4)}${e.provisional ? " (provisional)" : ""}</div>
      <h2 style="margin-top:8px">${esc(e.titulo)}</h2>${e.original && norm(e.original) !== norm(e.titulo) ? `<div class="orig">${esc(e.original)}</div>` : ""}
      <div class="facts">${e.director ? `<span>${icon("user")}${esc(e.director)}</span>` : ""}${e.pais ? `<span>${icon("globe")}${esc(e.pais)}</span>` : ""}${e.reparto ? `<span>${icon("star")}${esc(e.reparto)}</span>` : ""}</div>
      <div class="chips">${(e.generos || []).map((g) => `<span class="chip">${g}</span>`).join("")}</div>
      ${e.sinopsis ? `<p class="muted" style="margin-top:14px">${esc(e.sinopsis)}</p>` : ""}
      <div class="myscore">${matchTag(m.pct)}<div><div class="lbl">Afinidad contigo</div><div class="verdict">Predicción: ${fmt1(m.nota)} · ${veredicto(m.nota)}</div></div></div>
      ${m.why.length ? `<div style="display:flex;flex-direction:column;gap:6px;color:var(--text-2);font-size:13.5px">${m.why.map((w) => `<span>— ${esc(w)}</span>`).join("")}</div>` : ""}
      ${sesionesDe(e.titulo, e.fa) ? `<div class="sub">Sesiones en tus cines</div>${sesionesHTML(sesionesDe(e.titulo, e.fa), null, 4)}` : `<div class="sub">Cartelera de tus cines</div>
      <div class="links">${misCines().length ? misCines().map((c) => `<a class="ext" href="https://www.filmaffinity.com/es/theater-showtimes.php?id=${c.id}" target="_blank" rel="noopener"><span class="logo" style="background:#2a2a36">${icon("ticket")}</span>${esc(c.nombre)}</a>`).join("") : `<a class="ext" href="#" data-cines><span class="logo" style="background:#2a2a36">${icon("pin")}</span>Elegir mis cines</a>`}</div>`}
      <div class="sub">Más info</div>
      <div class="links">
        <a class="ext" href="${e.fa ? `https://www.filmaffinity.com/es/film${e.fa}.html` : `https://www.filmaffinity.com/es/search.php?stext=${q}`}" target="_blank" rel="noopener">${logoWeb("FA")}FilmAffinity</a>
        <a class="ext" href="https://www.sensacine.com/buscar/?q=${q}" target="_blank" rel="noopener">${logoWeb("SC")}SensaCine</a>
        <a class="ext" href="https://www.imdb.com/es-es/find/?q=${encodeURIComponent(e.original || e.titulo)}" target="_blank" rel="noopener">${logoWeb("IMDb")}IMDb</a>
        <a class="ext" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.titulo + " tráiler español")}" target="_blank" rel="noopener"><span class="logo" style="background:#c4302b">${icon("play")}</span>Tráiler</a>
      </div>
      <div class="dl-actions"><button class="btn btn-primary" data-relwant="${esc(key)}">${icon("bookmark")}Guardar en pendientes</button>${e.fa ? `<a class="btn" href="#/pelicula?fa=${e.fa}" data-close>Ficha completa</a>` : ""}${e.fecha <= todayISO() ? `<button class="btn" data-relseen="${esc(key)}">${icon("eye")}Ya la vi</button>` : ""}</div>
    </div></div></div>`);
}
SUB.estrenos = (v) => {
  const st = S.est_;
  const all = upcoming().map((e) => ({ ...e, m: predict(e) }));
  const filt = (L) => st.filter === "parami" ? L.filter((e) => e.m.pct >= 62) : st.filter === "destacados" ? L.filter((e) => e.destacado) : L;
  const L = filt(all);
  const upd = S.est.actualizado ? new Date(S.est.actualizado + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  if (!st.month) st.month = todayISO().slice(0, 7);
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Estrenos en España</h1>
    <p>Fechas de estreno en cines españoles${upd ? `, actualizadas el ${upd}` : ""}. El % es lo que encaja contigo.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${S.db.estado?.tmdb ? `<button class="btn" id="estUpd">${icon("refresh")}Actualizar desde TMDb</button>` : ""}
      <div class="seg" id="estMode"><button data-m="lista" class="${st.mode === "lista" ? "on" : ""}">Lista</button><button data-m="cal" class="${st.mode === "cal" ? "on" : ""}">Calendario</button></div></div></div>
  <div class="cinemas">${misCines().map((c) => `<div class="card cinema"><div class="n">${esc(c.nombre)}</div><div class="c">${icon("pin")} ${esc([c.ciudad, c.direccion].filter(Boolean).join(" · "))}</div>
    <div class="a"><a class="btn btn-sm" href="#/cartelera">${icon("ticket")}Sesiones</a><a class="btn btn-sm btn-ghost" href="https://www.filmaffinity.com/es/theater-showtimes.php?id=${c.id}" target="_blank" rel="noopener">Horarios FA</a></div></div>`).join("")}</div>
  <div class="toolbar" style="position:static;margin-top:20px">
    <div class="seg" id="estF">${[["todos", "Todos"], ["parami", "Encajan conmigo"], ["destacados", "Los grandes"]].map(([k, l]) => `<button data-f="${k}" class="${st.filter === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <span class="dim" style="font-size:13px">${L.length} estrenos</span>
  </div>
  <div id="estBody"></div>`;
  const body = $("#estBody");
  if (st.mode === "cal") {
    const [yy, mm] = st.month.split("-").map(Number);
    const first = new Date(yy, mm - 1, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = [];
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const byDay = {};
    filt((S.est.estrenos || []).map((e) => ({ ...e, m: predict(e) }))).forEach((e) => (byDay[e.fecha] = byDay[e.fecha] || []).push(e));
    const shift = (n) => { const d = new Date(yy, mm - 1 + n, 1); st.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; render._keep = true; SUB.estrenos(v); };
    body.innerHTML = `<div class="section-head" style="margin-top:6px"><div class="cal-nav"><button class="icon-btn" id="cPrev">${icon("left")}</button><h2 class="h2">${MESES[mm - 1]} ${yy}</h2><button class="icon-btn" id="cNext">${icon("right")}</button></div>
      <div class="legend"><span><i style="background:var(--gold)"></i>Destacado</span><span><i style="background:var(--green)"></i>Encaja contigo</span></div></div>
      <div class="cal">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<div class="dow">${d}</div>`).join("")}
      ${days.map((d) => { const k = iso(d); const es = (byDay[k] || []).sort((a, b) => b.m.pct - a.m.pct); return `<div class="day ${d.getMonth() !== mm - 1 ? "out" : ""} ${k === todayISO() ? "today" : ""}"><span class="d">${d.getDate()}</span>${es.map((e) => `<div class="pill ${e.destacado ? "hot" : e.m.pct >= 62 ? "hi" : ""}" data-rel="${esc(e.fecha + "|" + e.titulo)}" data-tip="${esc(e.titulo)} · ${e.m.pct}%">${esc(e.titulo)}</div>`).join("")}</div>`; }).join("")}</div>`;
    $("#cPrev").onclick = () => shift(-1);
    $("#cNext").onclick = () => shift(1);
  } else {
    const groups = [];
    for (const e of L) {
      const d = new Date(e.fecha + "T12:00:00");
      const soon = e.fecha <= addDays(todayISO(), 70);
      const key = soon ? e.fecha : e.fecha.slice(0, 7);
      const label = soon ? `${diaSemana(e.fecha)} ${fechaLarga(e.fecha)}` : `${MESES[d.getMonth()]} ${d.getFullYear()}`;
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, label, soon, items: [] }));
      g.items.push(e);
    }
    body.innerHTML = groups.length ? groups.map((g) => `<div class="week"><div class="week-h"><h2 class="h2">${g.label.charAt(0).toUpperCase() + g.label.slice(1)}</h2><span class="dim">${g.items.length} ${g.items.length === 1 ? "estreno" : "estrenos"}${g.soon && g.key < todayISO() ? " · ya en cines" : ""}</span></div>
      <div class="rels">${g.items.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || b.m.pct - a.m.pct).map(relCard).join("")}</div></div>`).join("")
      : `<div class="empty"><div class="h2">Sin estrenos con ese filtro</div></div>`;
  }
  $$("#estMode button", v).forEach((b) => (b.onclick = () => { st.mode = b.dataset.m; render._keep = true; SUB.estrenos(v); }));
  $$("#estF button", v).forEach((b) => (b.onclick = () => { st.filter = b.dataset.f; render._keep = true; SUB.estrenos(v); }));
  const up = $("#estUpd");
  if (up) up.onclick = async () => {
    up.disabled = true; up.innerHTML = `${icon("refresh")}Actualizando…`;
    try { const r = await api("estrenos/actualizar", { method: "POST" }); S.est = await api("estrenos"); toast(`${r.estrenos} estrenos actualizados`); SUB.estrenos(v); }
    catch (e) { toast(e.message, "x"); up.disabled = false; }
  };
};

// ---------------------------------------------------------------- Pendientes
S.pend_ = { f: "" };
const tieneAviso = (w, tipo) => ((S.avisos && S.avisos.get(w.id)) || []).some((a) => (tipo ? a.tipo === tipo : a.tipo !== "estreno"));
VIEWS.pendientes = (v) => {
  const W = [...S.db.pendientes].sort((a, b) => Number(tieneAviso(b)) - Number(tieneAviso(a)) || String(b.añadido || "").localeCompare(String(a.añadido || "")));
  const filtros = [["", "Todas", () => true], ["ya", "Ya se pueden ver", (w) => tieneAviso(w)], ["cine", "En tus cines", (w) => tieneAviso(w, "cine")],
    ["plataforma", "En plataformas", (w) => tieneAviso(w, "plataforma")], ["estreno", "Próximos estrenos", (w) => tieneAviso(w, "estreno")]];
  const f = filtros.find((x) => x[0] === S.pend_.f) || filtros[0];
  const L = W.filter(f[2]);
  const enlace = (w) => w.ids && w.ids.wikidata ? `#/pelicula?q=${w.ids.wikidata}` : w.ids && w.ids.imdb ? `#/pelicula?imdb=${w.ids.imdb}` : w.ids && w.ids.filmaffinity ? `#/pelicula?fa=${w.ids.filmaffinity}` : `#/buscar?q=${encodeURIComponent(w.titulo)}`;
  const tarjeta = (w) => { const av = (S.avisos && S.avisos.get(w.id)) || [];
    const fut = w.estreno && w.estreno > todayISO();
    return `<article class="pd2 ${String(w.id).startsWith("tmp") ? "guardando" : ""}">
    <a class="pd2-cartel" href="${enlace(w)}" data-pq-pend="${w.id}">${posterHTML(w)}
      ${av[0] ? `<span class="pd2-aviso aviso-${av[0].tipo}">${icon(av[0].tipo === "cine" ? "ticket" : av[0].tipo === "estreno" ? "calendar" : "tv")}${esc(av[0].txt)}</span>` : fut ? `<span class="pd2-aviso aviso-estreno">${icon("calendar")}${esc(faltaPara(w.estreno))}</span>` : ""}</a>
    <a class="pd2-t" href="${enlace(w)}">${esc(w.titulo)}</a>
    <div class="pd2-s">${esc([w.anio, w.motivo && !/^(se estrena|estreno en cines|próximamente)/i.test(w.motivo) ? w.motivo : ""].filter(Boolean).join(" · "))}</div>
    ${av.length > 1 ? `<div class="avisos">${av.slice(1).map(avisoChip).join("")}</div>` : ""}
    <div class="pd2-acc">${fut ? "" : `<button class="btn btn-sm" data-wseen="${w.id}" title="La he visto: ponerle nota">${icon("eye")}La vi</button>`}<button class="btn btn-sm btn-ghost" data-wdel="${w.id}" title="Quitar de pendientes">${icon("x")}Quitar</button></div>
  </article>`; };
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Pendientes</h1><p>${W.length ? `${W.length} ${W.length === 1 ? "película" : "películas"} por ver${W.filter((w) => tieneAviso(w)).length ? ` · <b>${W.filter((w) => tieneAviso(w)).length} ya se pueden ver</b>` : ""}.` : "Lo que quieres ver."} Te aviso cuando lleguen a tus cines o a una plataforma.</p></div></div>
  ${ro() ? "" : `<form class="pd-nueva2 ac" id="wForm" autocomplete="off">
    <label class="search">${icon("search")}<input class="input" id="wT" placeholder="Añade una película: escribe su título…" required></label>
    <input class="input" id="wM" placeholder="¿Quién te la recomendó? (opcional)">
    <button class="btn btn-primary">${icon("plus")}Añadir</button>
    <div class="ac-list" id="wAc" hidden></div></form>`}
  ${W.length ? `<div class="chips pd-filtros">${filtros.map(([k, n, fn]) => { const c = W.filter(fn).length; return c || !k ? `<button class="chip ${f[0] === k ? "on" : ""}" data-pf="${k}">${n} · ${c}</button>` : ""; }).join("")}</div>
    <div class="pd2-grid">${L.map(tarjeta).join("")}</div>`
    : `<div class="empty"><div class="h2">No tienes pendientes</div>Escribe arriba el título de una película, o añádelas desde <a href="#/recomendaciones" style="color:var(--gold)">Para ti</a>, <a href="#/cartelera?t=estrenos" style="color:var(--gold)">Estrenos</a> o el <a href="#/buscar" style="color:var(--gold)">buscador</a>.</div>`}`;
  $$("[data-pf]", v).forEach((b) => (b.onclick = () => { S.pend_.f = b.dataset.pf; VIEWS.pendientes(v); }));
  const form = $("#wForm");
  if (form) {
    const inp = $("#wT"), lista = $("#wAc");
    let t, res = [], seq = 0;
    const elegir = (r) => { lista.hidden = true; addPending({ titulo: r.titulo, anio: r.anio, poster: r.poster, ids: r.imdb ? { imdb: r.imdb } : {} }, $("#wM").value.trim()); inp.value = ""; $("#wM").value = ""; };
    inp.oninput = () => {
      clearTimeout(t);
      const q = inp.value.trim();
      if (q.length < 2) { lista.hidden = true; return; }
      t = setTimeout(async () => {
        const my = ++seq;
        res = ((await buscarWeb(q)).pelis || []).slice(0, 6);
        if (my !== seq) return;
        lista.hidden = !res.length;
        lista.innerHTML = res.map((r, i) => `<div class="ac-item" data-i="${i}"><div class="mini">${r.poster ? `<img src="${esc(r.poster)}" referrerpolicy="no-referrer" alt="">` : ""}</div><div><div style="font-weight:600">${esc(r.titulo)} <span class="dim">${r.anio || ""}</span></div><div class="s">${esc(r.reparto || "")}</div></div></div>`).join("");
        $$(".ac-item", lista).forEach((el) => (el.onmousedown = (ev) => { ev.preventDefault(); elegir(res[+el.dataset.i]); }));
      }, 250);
    };
    inp.onblur = () => setTimeout(() => (lista.hidden = true), 150);
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const q = inp.value.trim();
      if (!q) return inp.focus();
      if (!lista.hidden && res[0]) return elegir(res[0]);
      addPending({ titulo: q }, $("#wM").value.trim()); inp.value = ""; $("#wM").value = "";
    };
  }
  cartelesPendientes();
};
// Carteles de los pendientes que no lo tienen (IMDb), guardados para la próxima vez
async function cartelesPendientes() {
  if (ro()) return;
  const faltan = S.db.pendientes.filter((w) => !w.poster && !reciente(w.sinCartel, 15)).slice(0, 12);
  for (const w of faltan) {
    const r = await posterWeb(w);
    const cambios = r.poster ? { poster: r.poster, ids: { ...(w.ids || {}), imdb: (w.ids || {}).imdb || r.imdb } } : { sinCartel: todayISO() };
    try { const n = await api(`pendientes/${w.id}`, { method: "PUT", body: cambios }); Object.assign(w, n); } catch (e) { Object.assign(w, cambios); }
    const el = document.querySelector(`[data-pq-pend="${w.id}"]`);
    if (el && w.poster) { const ph = el.querySelector(".ph"); if (ph) ph.outerHTML = posterHTML(w); }
  }
}
async function addPending(item, motivo) {
  const body = { titulo: item.titulo, anio: item.anio || null, motivo, tituloOriginal: item.tituloOriginal || item.original || null,
    poster: item.poster || null, ids: item.ids || (item.fa ? { filmaffinity: String(item.fa) } : {}), estreno: item.fecha || item.estreno || null };
  if (S.db.pendientes.some((w) => norm(w.titulo) === norm(body.titulo) && (!w.anio || !body.anio || w.anio === body.anio))) { toast(`«${body.titulo}» ya está en tus pendientes`, "bookmark"); return; }
  const tmp = { ...body, id: `tmp${Date.now()}`, "añadido": new Date().toISOString().slice(0, 19) };
  S.db.pendientes.push(tmp); // aparece al momento
  toast(`«${item.titulo}» a pendientes`, "bookmark");
  if (route().name === "pendientes") { render._keep = true; render(); }
  try {
    const w = await api("pendientes", { method: "POST", body });
    const i = S.db.pendientes.findIndex((x) => x.id === tmp.id); if (i >= 0) S.db.pendientes[i] = w;
    if (route().name === "pendientes") { render._keep = true; render(); }
  } catch (e) { S.db.pendientes = S.db.pendientes.filter((x) => x.id !== tmp.id); toast(`No se guardó en pendientes: ${e.message}`, "x"); }
}

// ---------------------------------------------------------------- Series
VIEWS.series = () => location.replace("#/coleccion?t=series");
const serieGen = (x) => [x.animacion ? "Animación" : x.tipo === "Documental" ? "Documental" : "Drama"];
function seriesLinks(s) {
  const ids = s.ids || {};
  const q = encodeURIComponent(s.titulo);
  return [
    { n: "FilmAffinity", c: "#1d4d8c", l: "FA", u: ids.filmaffinity ? `https://www.filmaffinity.com/es/film${ids.filmaffinity}.html` : `https://www.filmaffinity.com/es/search.php?stext=${q}` },
    { n: "IMDb", c: "#c9a200", l: "IMDb", u: ids.imdb ? `https://www.imdb.com/es-es/title/${ids.imdb}/` : `https://www.imdb.com/es-es/find/?q=${q}` },
    { n: "SensaCine", c: "#e30613", l: "SC", u: ids.allocineSerie ? `https://www.sensacine.com/series/serie-${ids.allocineSerie}/` : `https://www.sensacine.com/buscar/?q=${q}` },
    { n: "JustWatch", c: "#e7b32a", l: "JW", u: `https://www.justwatch.com/es/buscar?q=${q}` },
  ];
}
function openSerie(id) {
  const s = S.db.series.find((x) => x.id === id);
  if (!s) return;
  const rated = S.db.series.filter((x) => x.nota != null).sort((a, b) => b.nota - a.nota);
  const rank = rated.findIndex((x) => x.id === s.id) + 1;
  const parecidas = S.db.series.filter((x) => x.id !== s.id && x.tipo === s.tipo && !!x.animacion === !!s.animacion && x.nota != null).sort((a, b) => b.nota - a.nota).slice(0, 8);
  const card = (x) => `<div class="pcard" data-serie="${x.id}"><div class="frame">${posterHTML({ ...x, anio: x.anios, generos: serieGen(x) })}${scoreBadge(x.nota)}</div><div class="meta"><div class="t">${esc(x.titulo)}</div><div class="s">${esc(x.anios || "")}</div></div></div>`;
  modal(`
    ${s.poster ? `<div class="detail-backdrop"><img src="${esc(s.poster)}" alt="" referrerpolicy="no-referrer"></div>` : ""}
    <div class="sheet-body"><div class="detail">
      <div><div class="poster">${posterHTML({ ...s, anio: s.anios, generos: serieGen(s) })}</div></div>
      <div>
        <div class="eyebrow">${esc(s.tipo || "Serie")}${s.animacion ? " · Animación" : ""}</div>
        <h2 style="margin-top:8px">${esc(s.titulo)}</h2>
        <div class="facts">${s.anios ? `<span>${icon("calendar")}${esc(s.anios)}</span>` : ""}${s.pais ? `<span>${icon("globe")}${esc(s.pais)}</span>` : ""}</div>
        <div class="myscore">${scoreBadge(s.nota, "lg")}<div><div class="lbl">Tu nota</div><div class="verdict">${veredicto(s.nota)}</div>
          ${rank ? `<div class="dim" style="font-size:12.5px">Puesto ${rank} de ${rated.length} entre tus series</div>` : ""}</div></div>
        ${s.resena ? `<blockquote class="review">${esc(s.resena)}</blockquote>` : ""}
        <div class="sub">Ver en</div>
        <div class="links">${seriesLinks(s).map((l) => `<a class="ext" href="${esc(l.u)}" target="_blank" rel="noopener">${logoWeb(l.l, l.c)}${l.n}</a>`).join("")}</div>
        <div class="dl-actions"><button class="btn" data-sedit="${s.id}">${icon("edit")}Editar</button><button class="btn btn-ghost btn-danger" data-sdel="${s.id}">${icon("trash")}Eliminar</button></div>
      </div></div>
      ${parecidas.length ? `<div class="sub" style="margin-top:34px">Otras ${esc((s.tipo || "serie").toLowerCase())}s${s.animacion ? " de animación" : ""} que te gustaron</div><div class="strip">${parecidas.map(card).join("")}</div>` : ""}
    </div>`);
}
function seriesAgg(key) {
  const m = new Map();
  for (const s of S.db.series) {
    if (s.nota == null) continue;
    const k = key(s);
    if (!k) continue;
    const o = m.get(k) || { key: k, n: 0, sum: 0, items: [] };
    o.n++; o.sum += s.nota; o.items.push(s); m.set(k, o);
  }
  for (const o of m.values()) o.mean = o.sum / o.n;
  return [...m.values()];
}
function seriesInsights() {
  const R = S.db.series.filter((s) => s.nota != null);
  if (R.length < 10) return [];
  const mu = mean(R.map((s) => s.nota));
  const out = [];
  const tipos = seriesAgg((s) => s.tipo).filter((t) => t.n >= 5).sort((a, b) => b.mean - a.mean);
  if (tipos.length > 1) out.push({ big: fmt1(tipos[0].mean), ttl: `Lo tuyo son las ${tipos[0].key.toLowerCase()}s`, txt: `Les das un ${fmt1(tipos[0].mean)} de media (${tipos[0].n} vistas), frente al ${fmt1(tipos[tipos.length - 1].mean)} de los ${tipos[tipos.length - 1].key.toLowerCase()}s.` });
  const anime = R.filter((s) => s.animacion && s.pais === "Japón"), anim = R.filter((s) => s.animacion && s.pais !== "Japón");
  if (anime.length >= 5 && anim.length >= 5) out.push({ big: fmt1(mean(anime.map((s) => s.nota))), ttl: "El anime gana a los dibujos occidentales", txt: `Al anime le das ${fmt1(mean(anime.map((s) => s.nota)))} y a la animación occidental ${fmt1(mean(anim.map((s) => s.nota)))}. Tus favoritas: ${[...anime].sort((a, b) => b.nota - a.nota).slice(0, 2).map((s) => s.titulo).join(" y ")}.` });
  const esp = R.filter((s) => s.pais === "España" && s.tipo === "Documental");
  if (esp.length >= 5) out.push({ big: esp.length, ttl: "Fan del documental español", txt: `Has visto ${esp.length} documentales españoles con una media de ${fmt1(mean(esp.map((s) => s.nota)))}. El que más te gustó: ${[...esp].sort((a, b) => b.nota - a.nota)[0].titulo}.` });
  const top = [...R].sort((a, b) => b.nota - a.nota).slice(0, 3);
  out.push({ big: fmt1(mu), ttl: "Tu podio de series", txt: `${top.map((s) => `${s.titulo} (${fmt1(s.nota)})`).join(", ")}. Nota media en series: ${fmt2(mu)}.` });
  return out;
}
function seriesStatsHTML() {
  const R = S.db.series.filter((s) => s.nota != null);
  if (R.length < 5) return "";
  const tipos = seriesAgg((s) => s.tipo).sort((a, b) => b.n - a.n);
  const paises = seriesAgg((s) => s.pais).sort((a, b) => b.n - a.n).slice(0, 6);
  const formato = seriesAgg((s) => (s.animacion ? "Animación" : "Imagen real"));
  const row = (g) => ({ label: g.key, value: g.n, color: scoreColor(g.mean), right: `${g.n} ${scoreBadge(g.mean)}` });
  return `<div class="charts">
    <div class="card chart w4"><h3>Por formato</h3><div class="cap">Número de títulos y tu nota media</div>${hbars(tipos.map(row))}<div style="height:10px"></div>${hbars(formato.map(row))}</div>
    <div class="card chart w4"><h3>Por país</h3><div class="cap">Los 6 países con más series</div>${hbars(paises.map(row))}</div>
    <div class="card chart w4"><h3>Lo que dicen tus notas</h3><div class="cap">Tus gustos en series</div>
      ${seriesInsights().slice(0, 3).map((i) => `<p style="margin:0 0 12px;font-size:13.5px"><b style="color:var(--gold)">${esc(i.ttl)}.</b> <span class="muted">${esc(i.txt)}</span></p>`).join("")}</div>
  </div>`;
}

function openSerieForm(s = null) {
  const d = s || { titulo: "", anios: "", tipo: "Serie", pais: "", animacion: false, nota: 7, resena: "" };
  modal(`<div class="sheet-body"><div class="eyebrow">${s ? "Editar serie" : "Nueva serie"}</div><h2 class="h2" style="margin:6px 0 20px">${s ? esc(s.titulo) : "Añadir serie"}</h2>
    <div class="form">
      <div class="field full"><label>Título</label><input class="input" name="titulo" value="${esc(d.titulo)}"></div>
      <div class="field s2"><label>Años</label><input class="input" name="anios" value="${esc(d.anios || "")}" placeholder="2019–2023"></div>
      <div class="field s2"><label>Tipo</label><select class="select" name="tipo">${["Serie", "Miniserie", "Documental"].map((t) => `<option ${d.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field s2"><label>País</label><input class="input" name="pais" value="${esc(d.pais || "")}"></div>
      <div class="field full"><label>Tu nota</label><div class="rating-input">${scoreBadge(d.nota ?? 7, "lg")}<input type="range" min="0" max="10" step="0.1" value="${d.nota ?? 7}" id="snota"><span class="words" id="swords">${veredicto(d.nota ?? 7)}</span></div></div>
      <div class="field full"><label>Reseña</label><textarea class="textarea" name="resena">${esc(d.resena || "")}</textarea></div>
      <div class="field full"><label class="toggle"><input type="checkbox" name="animacion" ${d.animacion ? "checked" : ""}><span class="sw"></span>Animación</label></div>
    </div>
    <div class="form-foot">${s ? `<button class="btn btn-ghost btn-danger" data-sdel="${s.id}" style="margin-right:auto">${icon("trash")}Eliminar</button>` : ""}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ssave">${icon("check")}Guardar</button></div></div>`, "narrow");
  const sh = $("#modal .sheet");
  const r = $("#snota");
  r.oninput = () => { $(".rating-input .score", sh).outerHTML = scoreBadge(+r.value, "lg"); $("#swords").textContent = veredicto(+r.value); };
  $("#ssave").onclick = async () => {
    const g = (n) => $(`[name="${n}"]`, sh);
    const data = { titulo: g("titulo").value.trim(), anios: g("anios").value.trim(), tipo: g("tipo").value, pais: g("pais").value.trim(), nota: Math.round(+r.value * 10) / 10, resena: g("resena").value.trim(), animacion: g("animacion").checked };
    if (!data.titulo) return g("titulo").focus();
    let guardada = s;
    if (s) await api(`series/${s.id}`, { method: "PUT", body: data });
    else guardada = await api("series", { method: "POST", body: data });
    await refreshDB(); closeModal(); toast("Serie guardada"); render();
    completarSerie({ ...guardada, ...data });
  };
}

// ---------------------------------------------------------------- Ajustes
VIEWS.ajustes = (v) => {
  const e = S.db.estado || {};
  const corr = S.db.correcciones || [];
  v.innerHTML = `
  <div class="page-head"><div><h1 class="h1">Ajustes</h1></div></div>
  <div class="settings">
    <div class="card"><h3>${icon("download")} Tu Excel</h3><p>Cada cambio que haces aquí regenera <code>Filora.xlsx</code> en la carpeta de la app, con hojas de resumen, películas, series, UCM, pendientes y estrenos.</p>
      ${e.excel_error ? `<p style="color:var(--gold)">⚠ ${esc(e.excel_error)}</p>` : ""}
      <div class="acts"><a class="btn btn-primary" href="/api/excel">${icon("download")}Descargar Excel</a><button class="btn" id="xRegen">${icon("refresh")}Regenerar</button></div></div>
    <div class="card"><h3>${icon("globe")} Sincronizar con la web</h3><p>Escribe la dirección de tu web y el mismo <b>PIN</b> que configuraste en Vercel. Tu PC y la web se sincronizarán solos (al arrancar, tras cada cambio y cada 5 minutos), así lo que añadas desde el móvil llega a tu Excel.</p>
      <p class="dim" style="font-size:12.5px">Estado: ${e.pin ? esc(e.sync || "pendiente") : "sin PIN"}${e.sync_at ? ` · última vez ${new Date(e.sync_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
      <div class="acts" style="margin-bottom:8px"><input class="input" id="webLocal" type="url" placeholder="Dirección de tu web (por defecto https://filora-umber.vercel.app)" value="${esc((S.db.config || {}).web || "")}" style="flex:1"><button class="btn" id="webSave">Guardar</button></div>
      <div class="acts"><input class="input" id="pinLocal" type="password" inputmode="numeric" placeholder="${e.pin ? "PIN guardado ✓ (escribe para cambiarlo)" : "PIN de edición"}" style="flex:1"><button class="btn" id="pinSave">Guardar</button><button class="btn btn-ghost" id="syncNow">${icon("refresh")}Sincronizar ahora</button></div></div>
    <div class="card"><h3>${icon("upload")} Añadir desde el Excel</h3><p>Abre <code>Filora.xlsx</code>, escribe tus películas en la hoja <b>Añadir</b> (Año, Duración, Nota, Título, Director, País…), guarda y cierra: la app las importa sola en unos segundos y completa lo que falte. También detecta cambios de nota o reseña en la hoja <b>Películas</b>.</p>
      ${e.excel_import ? `<p class="dim" style="font-size:12.5px">Última importación: ${esc(e.excel_import)}</p>` : ""}
      <div class="acts"><button class="btn" id="xImp">${icon("upload")}Importar ahora</button></div></div>
    <div class="card"><h3>${icon("calendar")} Estrenos automáticos (opcional)</h3><p>Con una clave gratuita de <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style="color:var(--gold)">TMDb</a> el calendario se actualiza solo con las fechas de España, sinopsis y carteles. Sin clave, lo mantenemos juntos a mano.</p>
      <div class="acts"><input class="input" id="tmdbKey" type="password" placeholder="${e.tmdb ? "Clave guardada ✓ (escribe para cambiarla)" : "Clave API v3 de TMDb"}" style="flex:1"><button class="btn" id="tmdbSave">Guardar</button></div></div>
    <div class="card"><h3>${icon("layers")} Copia de seguridad</h3><p>La app guarda una copia automática en <code>data/local/backups</code> antes de cada cambio (las 30 últimas). También puedes descargar la base de datos completa.</p>
      <div class="acts"><a class="btn" href="/api/backup">${icon("download")}Descargar copia (.json)</a></div></div>
    ${corr.length ? `<div class="card" style="grid-column:1/-1"><h3>${icon("check")} Correcciones aplicadas al importar tu Excel original</h3><p>Revisé tu Excel y arreglé estos errores (tu archivo original no se ha tocado):</p>
      <ul style="margin:0;padding-left:18px;color:var(--text-2);columns:2;column-gap:40px;font-size:13px">${corr.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
  </div>`;
  $("#xRegen").onclick = async () => { const r = await api("excel/regenerar", { method: "POST" }); await refreshDB(); toast(r.ok ? "Excel regenerado" : r.excel_error, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#xImp").onclick = async () => { try { const r = await api("excel/importar", { method: "POST" }); await refreshDB(); toast(`${r.modificadas} modificadas · ${r.nuevas} nuevas`); } catch (err) { toast(err.message, "x"); } };
  $("#pinSave").onclick = async () => { const k = $("#pinLocal").value.trim(); if (k.length < 4) return toast("El PIN debe tener al menos 4 caracteres", "x"); await api("config", { method: "POST", body: { pin: k } }); const r = await api("sync", { method: "POST" }); await refreshDB(); toast(r.ok ? "PIN guardado · sincronizado con la web" : r.sync, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#webSave").onclick = async () => { const w = $("#webLocal").value.trim(); await api("config", { method: "POST", body: { web: w || null } }); await refreshDB(); toast("Dirección guardada"); VIEWS.ajustes(v); };
  $("#syncNow").onclick = async () => { const r = await api("sync", { method: "POST" }); await loadAll(); toast(r.ok ? "Sincronizado con la web" : r.sync, r.ok ? "check" : "x"); VIEWS.ajustes(v); };
  $("#tmdbSave").onclick = async () => { const k = $("#tmdbKey").value.trim(); if (!k) return; await api("config", { method: "POST", body: { tmdbKey: k } }); await refreshDB(); toast("Clave guardada"); VIEWS.ajustes(v); };
};

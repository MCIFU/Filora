// Pruebas de la web en un navegador de verdad (Chromium), sin red: IMDb, Wikidata, Box Office Mojo,
// JustWatch y la API de Vercel se sustituyen por datos fijos. node tests/web.test.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const APP = fileURLToPath(new URL("../app/", import.meta.url));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const servidor = createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "") || "index.html";
  try { const b = await readFile(join(APP, ruta)); res.writeHead(200, { "Content-Type": TIPOS[extname(ruta)] || "application/octet-stream" }); res.end(b); }
  catch (e) { res.writeHead(404); res.end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${servidor.address().port}`;

// ---------------------------------------------------------------- datos de prueba
const hoy = new Date().toISOString().slice(0, 10), anio = +hoy.slice(0, 4);
const POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='3'/%3E";
const peli = (id, titulo, extra = {}) => ({ id, titulo, anio: 2012, duracion: 114, director: "J. A. Bayona", pais: "España", generos: ["Drama"], nota: 8, ids: {}, taquilla: {}, fechaVisto: `${anio}-03-0${id.length % 9 + 1}`, lugar: "Netflix", ...extra });
const db0 = () => ({
  peliculas: [
    peli("p1", "Lo imposible", { ids: { imdb: "tt1649419", wikidata: "Q20" }, poster: POSTER, reparto: [{ n: "Naomi Watts", q: "Q30" }], tituloEn: "The Impossible", completado: hoy,
      taquilla: { mundial: 198087212, domestica: 19019882, internacional: 179067330, consultado: hoy }, presupuesto: 45000000 }),
    peli("p22", "El orfanato", { anio: 2007, nota: 7.5, lugar: "Yelmo Ocimax" }),
  ],
  series: [], pendientes: [{ id: "w1", titulo: "Dune: Parte Tres", anio: 2026 }, { id: "w2", titulo: "La sociedad de la nieve", anio: 2023 }],
  preferencias: { cines: [{ id: 402, nombre: "Yelmo Ocimax", ciudad: "Gijón" }] },
  estado: { web: true, edicion: true },
});
const CARTELERA = { actualizado: hoy, cines: [{ id: "402", nombre: "Yelmo Ocimax", peliculas: [{ titulo: "Dune: Parte Tres", anio: 2026, versiones: [] }] }] };
const IMDB = { pelis: [{ imdb: "tt1673434", titulo: "The Twilight Saga: Breaking Dawn - Part 2", anio: 2012, reparto: "Kristen Stewart, Robert Pattinson", poster: POSTER }],
  personas: [{ imdb: "nm1291105", nombre: "J.A. Bayona", desc: "Dirección · Society of the Snow (2023)", foto: POSTER }] };
const it = (id) => ({ "entity-type": "item", id });
const cl = (o) => Object.fromEntries(Object.entries(o).map(([p, vs]) => [p, vs.map((v) => ({ rank: "normal", mainsnak: { datavalue: { value: typeof v === "string" && /^Q\d+$/.test(v) ? it(v) : v } } }))]));
const L = (t) => ({ es: { value: t }, en: { value: t } });
const WD = {
  Q1: { labels: { es: { value: "Crepúsculo: Amanecer parte 2" }, en: { value: "The Twilight Saga: Breaking Dawn – Part 2" } }, sitelinks: { enwiki: { title: "The Twilight Saga: Breaking Dawn – Part 2" } },
    claims: cl({ P31: ["Q11424"], P57: ["Q2"], P161: ["Q3", "Q4"], P495: ["Q5"], P136: ["Q6"], P345: ["tt1673434"], P577: [{ time: "+2012-11-16T00:00:00Z" }], P2047: [{ amount: "+115" }] }) },
  Q2: { labels: L("Bill Condon"), claims: cl({ P31: ["Q5"], P345: ["nm0174374"], P569: [{ time: "+1955-10-22T00:00:00Z" }], P106: ["Q7"] }) },
  Q3: { labels: L("Kristen Stewart") }, Q4: { labels: L("Robert Pattinson") }, Q5: { labels: L("Estados Unidos") },
  Q6: { labels: { es: { value: "cine fantástico" }, en: { value: "fantasy film" } } }, Q7: { labels: L("director de cine") },
};

async function preparar(pagina, estado) {
  pagina.on("pageerror", (e) => estado.errores.push(e.message));
  await pagina.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 404, body: "" })); // nada sale a internet
  await pagina.route("https://www.wikidata.org/**", (r) => {
    const a = new URL(r.request().url()).searchParams;
    if (a.get("action") === "wbgetentities") return r.fulfill({ json: { entities: Object.fromEntries(a.get("ids").split("|").map((i) => [i, { id: i, labels: {}, claims: {}, ...(WD[i] || {}) }])) } });
    if (a.get("list") === "search") return r.fulfill({ json: { query: { search: /tt1673434/.test(a.get("srsearch")) ? [{ title: "Q1" }] : /nm1291105|nm0174374/.test(a.get("srsearch")) ? [{ title: "Q2" }] : [] } } });
    if (a.get("action") === "wbsearchentities") return r.fulfill({ json: { search: [] } });
    return r.fulfill({ json: {} });
  });
  await pagina.route("https://query.wikidata.org/**", (r) => r.fulfill({ json: { results: { bindings: [] } } }));
  await pagina.route(`${BASE}/data/**`, (r) => { const u = r.request().url();
    r.fulfill({ json: /cartelera/.test(u) ? CARTELERA : /estrenos/.test(u) ? { estrenos: [] } : /catalogo/.test(u) ? [] : /cines_es/.test(u) ? [{ id: 402, nombre: "Yelmo Ocimax", ciudad: "Gijón" }] : {} }); });
  await pagina.route(`${BASE}/api/**`, (r) => {
    const u = new URL(r.request().url()), q = u.searchParams, m = r.request().method(), ruta = u.pathname.slice(5);
    if (ruta === "wm") return r.fulfill({ status: 502, body: "{}" }); // la pasarela «falla»: se usa Wikidata directo
    if (ruta === "imdb") return r.fulfill({ json: q.get("todo") ? IMDB : IMDB.pelis });
    if (ruta === "poster") return r.fulfill({ json: { poster: POSTER, imdb: q.get("imdb") || "tt1673434" } });
    if (ruta === "taquilla") return r.fulfill({ json: { mundial: 888875751, domestica: 293144686, internacional: 595731065, presupuesto: 120000000 } });
    if (ruta === "plataformas") return r.fulfill({ json: /sociedad/i.test(q.get("t")) ? [{ plataforma: "Netflix", tipo: "suscripcion" }] : [] });
    if (ruta === "notas") return r.fulfill({ json: {} });
    if (ruta === "demanda") return r.fulfill({ json: { ok: true } });
    if (ruta === "db") return r.fulfill({ json: estado.db });
    if (ruta === "peliculas" && m === "POST") { const b = JSON.parse(r.request().postData()); estado.post = b; const p = { ...b, id: "p9", "añadido": new Date().toISOString() }; estado.db.peliculas.push(p); return r.fulfill({ json: p }); }
    if (ruta.startsWith("peliculas/") && m === "PUT") { const id = ruta.split("/")[1], b = JSON.parse(r.request().postData()); estado.puts.push([id, b]);
      const p = estado.db.peliculas.find((x) => x.id === id); Object.assign(p, b); return r.fulfill({ json: p }); }
    return r.fulfill({ json: {} });
  });
  await pagina.addInitScript(() => localStorage.setItem("cine.pin", "1234"));
}

const navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fallos = 0;
async function prueba(nombre, fn, ancho = 1280) {
  const estado = { db: db0(), errores: [], puts: [], post: null };
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: 900 } });
  await preparar(pagina, estado);
  try {
    await fn(pagina, estado);
    if (process.env.CAPTURAS) await pagina.screenshot({ path: join(process.env.CAPTURAS, nombre.split(":")[0].replace(/\W+/g, "_") + ".png"), fullPage: true });
    assert.deepEqual(estado.errores, [], "errores de JavaScript");
    console.log(`✓ ${nombre}`);
  } catch (e) {
    fallos++;
    console.log(`✗ ${nombre}\n  ${e.message.split("\n").join("\n  ")}`);
  }
  await pagina.close();
}
const ir = (p, hash) => p.goto(`${BASE}/?vitrina${hash}`);

await prueba("Añadir: reconoce un título aproximado y guarda cartel, géneros, reparto y taquilla", async (p, e) => {
  await ir(p, "#/anadir");
  await p.fill("#rg_titulo", "crepusculo amanecer parte 2");
  await p.fill("#rg_anio", "2012");
  await p.fill("#rg_nota", "6");
  await p.waitForSelector(".rg-info .rg-t", { timeout: 8000 });
  assert.match(await p.textContent(".rg-t"), /Amanecer parte 2/i);
  assert.equal(await p.inputValue("#rg_duracion"), "115", "rellena la duración");
  await p.click("#rgSave");
  await p.waitForFunction(() => !document.querySelector(".xl-guardando"), null, { timeout: 8000 });
  const b = e.post;
  assert.ok(b, "se ha guardado");
  assert.equal(b.titulo, "Crepúsculo: Amanecer parte 2");
  assert.equal(b.nota, 6);
  assert.ok(b.poster, "cartel");
  assert.ok(b.generos.length, "géneros");
  assert.equal(b.ids.wikidata, "Q1");
  assert.deepEqual(b.reparto.map((x) => x.n), ["Kristen Stewart", "Robert Pattinson"]);
  assert.equal(b.taquilla.mundial, 888875751);
  assert.equal(b.presupuesto, 120000000);
  assert.ok(b.tituloEn);
});

await prueba("Ficha: créditos, reparto y taquilla", async (p) => {
  await ir(p, "#/coleccion?ficha=p1");
  await p.waitForSelector(".fx-cred", { timeout: 8000 });
  assert.match(await p.textContent(".fx-cred"), /1 h 54 min/);
  await p.waitForSelector("#fReparto .pe-n", { timeout: 8000 });
  assert.match(await p.textContent("#fReparto"), /Naomi Watts/);
  assert.match(await p.textContent("#fTaquilla"), /198,1 M/);
  assert.ok(await p.$(".tq-barra .tq-dom"));
});

await prueba("Ficha incompleta: se completa sola al abrirla", async (p, e) => {
  e.db.peliculas[1] = { ...e.db.peliculas[1], titulo: "crepusculo amanecer parte 2", anio: 2012 };
  await ir(p, "#/coleccion?ficha=p22");
  await p.waitForFunction(() => document.querySelector("#fTaquilla")?.textContent.includes("888,9"), null, { timeout: 10000 });
  const cambios = Object.assign({}, ...e.puts.filter(([id]) => id === "p22").map(([, b]) => b));
  assert.ok(cambios.poster && cambios.reparto && cambios.tituloEn && cambios.completado, JSON.stringify(Object.keys(cambios)));
});

await prueba("Buscador: tu colección al instante y personas y películas de IMDb", async (p) => {
  await ir(p, "#/buscar");
  const t0 = Date.now();
  await p.fill("#bq", "bayona");
  await p.waitForSelector("#bqRes .pcard", { timeout: 3000 });
  await p.waitForSelector(".bq-pers .pe-pers", { timeout: 5000 });
  assert.ok(Date.now() - t0 < 3000, `tarda ${Date.now() - t0} ms`);
  assert.match(await p.textContent("#bqRes"), /En tu colección · 2/);
  assert.match(await p.textContent(".bq-pers"), /J\.A\. Bayona/);
});

await prueba("Página de película (desde el id de IMDb)", async (p) => {
  await ir(p, "#/pelicula?imdb=tt1673434");
  await p.waitForSelector(".pe-cuerpo", { timeout: 8000 });
  assert.match(await p.textContent("h1"), /Amanecer parte 2/i);
  assert.match(await p.textContent(".pe-aside"), /Bill Condon/);
  assert.match(await p.textContent(".pe-main"), /Kristen Stewart/);
  await p.waitForSelector("#peTaquilla .tq-total", { timeout: 8000 });
});

await prueba("Página de persona (desde el id de IMDb)", async (p) => {
  await ir(p, "#/persona?imdb=nm1291105&n=J.A.%20Bayona");
  await p.waitForSelector(".ps-nombre", { timeout: 8000 });
  assert.match(await p.textContent(".ps-nombre"), /Bill Condon/);
  assert.ok(await p.$(".ps-foto img"), "foto (de IMDb si Wikidata no tiene)");
});

await prueba("Tu año en cine", async (p) => {
  await ir(p, "#/anio");
  await p.waitForSelector(".an-hero", { timeout: 8000 });
  assert.match(await p.textContent(".an-anio"), new RegExp(String(anio)));
  assert.match(await p.textContent(".an-cifras"), /2\s*películas/);
  assert.match(await p.textContent(".an-cifras"), /1\s*en el cine y 1 en casa/);
  assert.equal(await p.$$eval(".an-mes", (x) => x.length), 12);
});

await prueba("Pendientes: avisa si está en tus cines o en una plataforma", async (p) => {
  await ir(p, "#/pendientes");
  await p.waitForSelector('[data-avisos="w1"] .aviso-cine', { timeout: 8000 });
  await p.waitForSelector('[data-avisos="w2"] .aviso-plataforma', { timeout: 8000 });
  assert.match(await p.textContent('[data-avisos="w2"]'), /Netflix/);
});

await prueba("Completar mi colección", async (p, e) => {
  e.db.peliculas[1] = { ...e.db.peliculas[1], titulo: "crepusculo amanecer parte 2", anio: 2012 };
  await ir(p, "#/coleccion");
  await p.click("#completarGo", { timeout: 8000 });
  await p.waitForFunction(() => !document.querySelector(".completar") && !document.querySelector("#completarGo"), null, { timeout: 20000 });
  const pel = e.db.peliculas.find((x) => x.id === "p22");
  assert.ok(pel.poster && pel.reparto && pel.taquilla.consultado);
});

await prueba("Móvil: añadir y ficha sin desbordar el ancho", async (p) => {
  for (const h of ["#/anadir", "#/coleccion?ficha=p1", "#/anio", "#/buscar?q=bayona"]) {
    await ir(p, h);
    await p.waitForTimeout(1200);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(w <= 420, `${h}: ${w}px de ancho`);
  }
}, 400);

await navegador.close();
servidor.close();
if (fallos) { console.log(`\n${fallos} ${fallos === 1 ? "prueba falla" : "pruebas fallan"}`); process.exit(1); }

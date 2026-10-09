// Pruebas de la lógica de fusión y edición: node tests/api.test.mts
import assert from "node:assert/strict";
import { actualizar, anotarDemanda, borrar, cinesActivos, crear, fusionar, idsCineValidos, nuevoId, pinValido } from "../lib/filora.mjs";

const base = () => ({
  peliculas: [
    { id: "p0001", titulo: "Origen", nota: 10 },
    { id: "p0002", titulo: "Tenet", nota: 7.2 },
  ],
  series: [],
  pendientes: [{ id: "w0001", titulo: "Dune 3" }],
});

// ids únicos
const ids = new Set(Array.from({ length: 200 }, () => nuevoId("p")));
assert.ok(ids.size > 190, "los ids deben ser prácticamente únicos");

// crear desde pendiente lo quita de pendientes
{
  const db = base();
  const it = crear(db, "peliculas", { titulo: "Dune 3", nota: 8.5, desdePendiente: "w0001" });
  assert.equal(db.peliculas.length, 3);
  assert.equal(db.pendientes.length, 0);
  assert.ok(it.mod && it.id.startsWith("p"));
  assert.equal("desdePendiente" in it, false);
}

// móvil añade una, PC cambia otra nota: la fusión conserva ambas cosas
{
  const web = base();
  const pc = base();
  const nueva = crear(web, "peliculas", { titulo: "Weapons", nota: 6.2 });
  actualizar(pc, "peliculas", "p0002", { nota: 8 });
  const f = fusionar(web, pc);
  assert.equal(f.peliculas.length, 3);
  assert.equal(f.peliculas.find((p) => p.id === "p0002").nota, 8);
  assert.ok(f.peliculas.find((p) => p.id === nueva.id));
}

// borrado en un lado gana a la versión antigua del otro
{
  const web = base();
  const pc = base();
  borrar(web, "peliculas", "p0001");
  const f = fusionar(web, pc);
  assert.equal(f.peliculas.find((p) => p.id === "p0001"), undefined);
  const f2 = fusionar(pc, web);
  assert.equal(f2.peliculas.find((p) => p.id === "p0001"), undefined);
}

// si se edita después de borrar en el otro lado, la edición más nueva sobrevive
{
  const web = base();
  const pc = base();
  borrar(web, "peliculas", "p0002");
  await new Promise((r) => setTimeout(r, 1100));
  actualizar(pc, "peliculas", "p0002", { nota: 9 });
  const f = fusionar(web, pc);
  assert.equal(f.peliculas.find((p) => p.id === "p0002").nota, 9);
}

// no se cuelan campos locales del PC
{
  const pc = { ...base(), estado: { excel_error: null }, config: { pin: "x" } };
  const f = fusionar(base(), pc);
  assert.equal("estado" in f, false);
  assert.equal("config" in f, false);
}

// PIN
assert.equal(pinValido("1234", "1234"), true);
assert.equal(pinValido("1235", "1234"), false);
assert.equal(pinValido("123", "123"), false, "PIN demasiado corto no vale");
assert.equal(pinValido(null, "1234"), false);
assert.equal(pinValido("1234", undefined), false);

console.log("✓ Todas las pruebas de la API pasan");

// ---- preferencias y cines pedidos
{
  const a = { peliculas: [], preferencias: { cines: [{ id: 1 }], mod: "2026-01-01T00:00:00" } };
  const b = { peliculas: [], preferencias: { cines: [{ id: 2 }], mod: "2026-02-01T00:00:00" } };
  assert.deepEqual(fusionar(a, b).preferencias.cines, [{ id: 2 }], "gana la preferencia más reciente");
  assert.deepEqual(fusionar(b, a).preferencias.cines, [{ id: 2 }]);
  assert.deepEqual(fusionar({ peliculas: [] }, a).preferencias.cines, [{ id: 1 }]);
  const d = anotarDemanda({ 9: "2025-01-01", 5: "2026-09-20" }, [1269, 402], "2026-10-07");
  assert.deepEqual(Object.keys(d).sort(), ["1269", "402", "5"], "se olvidan los cines que nadie pide hace 45 días");
  assert.deepEqual(cinesActivos(d, "2026-10-07").slice(0, 2).sort(), [1269, 402]);
  assert.equal(cinesActivos(d, "2026-10-07")[2], 5, "primero los pedidos más recientemente");
  assert.deepEqual(cinesActivos(d, "2026-10-25").sort(), [1269, 402]);
  assert.deepEqual(idsCineValidos(["402", 402, -1, "x", 1.5]), [402]);
  assert.equal(idsCineValidos(Array.from({ length: 30 }, (_, i) => i + 1)).length, 12);
  console.log("✓ Preferencias y cines pedidos");
}

// póster de IMDb: id exacto o el año más cercano, en tamaño de cartel
{
  const { elegirPosterImdb } = await import("../lib/notas.mjs");
  const d = [
    { id: "tt1", qid: "tvSeries", y: 2023, i: { imageUrl: "https://x/a._V1_.jpg" } },
    { id: "tt2", qid: "movie", y: 1990, i: { imageUrl: "https://x/b._V1_.jpg" } },
    { id: "tt3", qid: "movie", y: 2023, i: { imageUrl: "https://x/c._V1_.jpg" } },
  ];
  assert.deepEqual(elegirPosterImdb(d, { anio: 2023 }), { poster: "https://x/c._V1_SX342.jpg", imdb: "tt3" });
  assert.equal(elegirPosterImdb(d, { imdb: "tt2" }).imdb, "tt2");
  assert.deepEqual(elegirPosterImdb(d, { imdb: "tt9" }), {});
  console.log("✓ Póster de IMDb");
}

// buscador de IMDb: solo películas y póster en tamaño de cartel
{
  const { limpiarImdb } = await import("../lib/notas.mjs");
  const r = limpiarImdb([{ id: "nm1", l: "Persona" }, { id: "tt2", qid: "tvSeries", l: "Serie" }, { id: "tt1", qid: "movie", l: "Peli", y: 2012, s: "A, B", i: { imageUrl: "https://x/a._V1_.jpg" } }]);
  assert.deepEqual(r, [{ imdb: "tt1", titulo: "Peli", anio: 2012, reparto: "A, B", poster: "https://x/a._V1_SX342.jpg" }]);
  console.log("✓ Buscador de IMDb");
}

// taquilla de Box Office Mojo
{
  const { leerTaquilla } = await import("../lib/notas.mjs");
  const h = "<td>Domestic Opening</td><td><span>$141,067,634</span></td> <th>All Releases</th> Domestic (33%) <span>$293,144,686</span> International (67%) $595,731,065 Worldwide <b>$888,875,751</b> Budget $120,000,000";
  assert.deepEqual(leerTaquilla(h), { domestica: 293144686, internacional: 595731065, mundial: 888875751, apertura: 141067634, presupuesto: 120000000 });
  console.log("✓ Taquilla");
}

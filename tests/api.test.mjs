// Pruebas de la lógica de fusión y edición: node tests/api.test.mts
import assert from "node:assert/strict";
import { actualizar, borrar, crear, fusionar, nuevoId, pinValido } from "../lib/cinemateca.mjs";

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

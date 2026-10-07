// API de Mi Cinemateca en Netlify: lectura pública y edición con PIN.
// Los datos viven en Netlify Blobs; si aún no hay nada guardado, se usa la
// copia estática publicada (/data/db.json).
import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { COLECCIONES, actualizar, borrar, crear, fusionar, pinValido } from "../../lib/cinemateca.mjs";

const CLAVE = "db";

function almacen() {
  // Producción usa el almacén global; las vistas previas, uno propio para no mezclar datos.
  const produccion = Netlify.context?.deploy?.context === "production";
  return produccion ? getStore({ name: "cinemateca", consistency: "strong" }) : getDeployStore("cinemateca");
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

async function cargar(req: Request): Promise<DB> {
  const guardado = (await almacen().get(CLAVE, { type: "json" })) as DB | null;
  if (guardado) return guardado;
  const r = await fetch(new URL("/data/db.json", req.url));
  if (!r.ok) throw new Error("No hay datos iniciales");
  return (await r.json()) as DB;
}

const guardar = (db: DB) => almacen().setJSON(CLAVE, db);

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean).slice(1); // quita "api"
  try {
    if (req.method === "GET" && partes[0] === "db") {
      const db = await cargar(req);
      return json({ ...db, estado: { web: true, edicion: !!Netlify.env.get("EDIT_PIN") } });
    }

    // A partir de aquí todo requiere el PIN de edición.
    const pinCorrecto = Netlify.env.get("EDIT_PIN");
    if (!pinCorrecto) return json({ error: "La edición no está activada: falta configurar EDIT_PIN en Netlify." }, 403);
    if (!pinValido(req.headers.get("x-pin"), pinCorrecto)) {
      await new Promise((r) => setTimeout(r, 800)); // frena intentos a ciegas
      return json({ error: "PIN incorrecto" }, 401);
    }
    if (req.method === "POST" && partes[0] === "login") return json({ ok: true });

    const db = await cargar(req);

    // Sincronización con la app del PC: fusiona y devuelve el resultado.
    if (req.method === "POST" && partes[0] === "sync") {
      const entrante = (await req.json()) as DB;
      if (!Array.isArray(entrante?.peliculas)) return json({ error: "Datos no válidos" }, 400);
      const fusion = fusionar(db, entrante);
      await guardar(fusion);
      return json(fusion);
    }

    const col = partes[0];
    if (!COLECCIONES[col]) return json({ error: "No encontrado" }, 404);
    if (req.method === "POST" && partes.length === 1) {
      const item = crear(db, col, (await req.json()) as Record<string, unknown>);
      await guardar(db);
      return json(item, 201);
    }
    if (req.method === "PUT" && partes.length === 2) {
      const item = actualizar(db, col, partes[1], (await req.json()) as Record<string, unknown>);
      if (!item) return json({ error: "No existe" }, 404);
      await guardar(db);
      return json(item);
    }
    if (req.method === "DELETE" && partes.length === 2) {
      borrar(db, col, partes[1]);
      await guardar(db);
      return json({ ok: true });
    }
    return json({ error: "No encontrado" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
};

export const config: Config = {
  path: ["/api/db", "/api/login", "/api/sync", "/api/peliculas", "/api/peliculas/*", "/api/series", "/api/series/*", "/api/pendientes", "/api/pendientes/*"],
};

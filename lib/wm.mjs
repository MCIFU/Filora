// Pasarela de lectura a Wikidata y Wikipedia: la web pide a /api/wm y Vercel guarda la
// respuesta una semana, así no depende de que Wikimedia responda (limita peticiones por IP).
const UA = "Filora/1.0 (https://github.com/MCIFU/Filora; cine personal)";
const ACCIONES = new Set(["wbgetentities", "wbsearchentities", "query"]);

export function urlPermitida(texto) {
  let u;
  try { u = new URL(texto); } catch (e) { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const h = u.hostname, p = u.pathname;
  if (h === "query.wikidata.org" && p === "/sparql") return u;
  if (/^(www\.wikidata|(en|es)\.wikipedia)\.org$/.test(h) && p === "/w/api.php" && ACCIONES.has(u.searchParams.get("action"))) return u;
  if (/^(en|es)\.wikipedia\.org$/.test(h) && /^\/api\/rest_v1\/page\/summary\/[^/]+$/.test(p)) return u;
  return null;
}

export async function leerWikimedia(texto) {
  const u = urlPermitida(texto);
  if (!u) return { status: 400, body: JSON.stringify({ error: "Dirección no permitida" }) };
  if (u.hostname === "query.wikidata.org") u.searchParams.set("format", "json");
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  return { status: r.ok ? 200 : 502, body: await r.text() };
}

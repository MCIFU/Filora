// Dónde ver una película en España (JustWatch, sin clave): suscripción, gratis, alquiler o compra.
const TIPOS = { FLATRATE: "suscripcion", FREE: "gratis", ADS: "gratis", RENT: "alquiler", BUY: "compra" };
const ORDEN = ["suscripcion", "gratis", "alquiler", "compra"];
const sinAcentos = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function elegirOfertas(edges, { titulo, anio } = {}) {
  const nodos = (edges || []).map((e) => e.node).filter((n) => n && n.content);
  const t = sinAcentos(titulo);
  const n = nodos.find((x) => (!anio || !x.content.originalReleaseYear || Math.abs(x.content.originalReleaseYear - anio) <= 1) && (!t || sinAcentos(x.content.title) === t))
    || nodos.find((x) => !anio || !x.content.originalReleaseYear || Math.abs(x.content.originalReleaseYear - anio) <= 1);
  if (!n) return [];
  const vistas = new Map();
  for (const o of n.offers || []) {
    const tipo = TIPOS[o.monetizationType];
    const nombre = String((o.package || {}).clearName || "").replace(/ (Standard with Ads|with Ads|Amazon Channel|Apple TV Channel)$/i, "").trim();
    if (!tipo || !nombre) continue;
    const k = nombre + "|" + tipo;
    if (!vistas.has(k)) vistas.set(k, { plataforma: nombre, tipo });
  }
  return [...vistas.values()].sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));
}

export async function plataformas(titulo, anio) {
  if (!titulo) return [];
  const query = `query($q:String!){popularTitles(country:ES,first:5,filter:{searchQuery:$q,objectTypes:[MOVIE]}){edges{node{... on MovieOrShow{content(country:ES,language:"es"){title originalReleaseYear} offers(country:ES,platform:WEB){monetizationType package{clearName}}}}}}}`;
  const r = await fetch("https://apis.justwatch.com/graphql", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ query, variables: { q: String(titulo).slice(0, 100) } }), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`JustWatch ${r.status}`);
  const d = await r.json();
  return elegirOfertas(((d.data || {}).popularTitles || {}).edges, { titulo, anio: anio ? +anio : null });
}

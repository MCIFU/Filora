// Service worker de Filora: la app abre sin conexión con lo último que se vio.
// - /api/*           siempre a la red (datos en vivo y edición)
// - app y datos      red primero; si no hay conexión, la copia guardada
// - carteles/fuentes caché primero (no cambian), con límite de tamaño
const V = "filora-v9";
const BASE = ["./", "index.html", "styles.css", "app.js", "premios-iconos.js", "extras.js", "premios.js", "ficha-wd.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function redPrimero(req) {
  const c = await caches.open(V);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    return (await c.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? c.match("index.html") : Response.error());
  }
}
async function cachePrimero(req) {
  const c = await caches.open(V + "-img");
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === "opaque") {
    c.put(req, r.clone());
    c.keys().then((ks) => ks.length > 600 && Promise.all(ks.slice(0, ks.length - 600).map((k) => c.delete(k))));
  }
  return r;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.startsWith("/api/")) return;
  if (req.destination === "image" || req.destination === "font" || u.hostname === "fonts.gstatic.com") return e.respondWith(cachePrimero(req));
  if (u.origin === location.origin || u.hostname === "raw.githubusercontent.com" || u.hostname === "fonts.googleapis.com") return e.respondWith(redPrimero(req));
});

// Service worker de Calex/Dot: la interfaz y las charlas ya vistas se pueden abrir SIN conexión.
// Interfaz: primero la red (así llegan las actualizaciones) y, si no hay conexión, la copia guardada.
// Datos (charlas, perfil…): primero la red; sin conexión, lo último que se vio. Nunca se guarda nada de POST ni de otras webs.
const V = "calex-v2";
const SHELL = ["/", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png"];
const API = /^\/(chats(\/[\w-]+)?|profile|models|modes|memory|config|gpu|auth\/status)$/;
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// al cerrar sesión o borrar la cuenta, la página pide olvidar lo guardado de este usuario
self.addEventListener("message", (e) => { if (e.data === "clear") e.waitUntil(caches.delete(V)); });
const put = (req, res) => { if (res && res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)).catch(() => {}); } return res; };
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).then((res) => put("/", res)).catch(() => caches.match("/"))); return; }
  if (API.test(u.pathname)) { e.respondWith(fetch(r).then((res) => put(r, res)).catch(() => caches.match(r).then((m) => m || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } })))); return; }
  if (SHELL.includes(u.pathname)) { e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => put(r, res)))); }
});

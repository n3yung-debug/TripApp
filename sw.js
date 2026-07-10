/* Service worker — offline app shell.
   Bump CACHE version when you change files to force an update. */
const CACHE = "tripapp-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./config.js",
  "./store.js",
  "./weather.js",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache Firebase / weather / other cross-origin API calls — always go to network.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;

  // Cache-first for our own assets, with network fallback + runtime caching.
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});

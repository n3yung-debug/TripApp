/* Service worker — offline app shell.
   Strategy: NETWORK-FIRST for our own files, so a new deploy shows up on the
   next open whenever there's a connection. The cache is only a fallback for
   offline / very slow networks. Bump CACHE when files change (also clears
   old caches). */
const CACHE = "tripapp-v16";
const NETWORK_TIMEOUT_MS = 4000; // slow connection → fall back to the cached copy
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
  // cache:'reload' bypasses the browser's HTTP cache so we never pre-cache stale files.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  // Navigation requests can't be re-wrapped with options, so rebuild from the URL.
  const netReq = req.mode === "navigate"
    ? new Request(req.url, { cache: "no-cache", credentials: "same-origin" })
    : new Request(req, { cache: "no-cache" });

  const network = fetch(netReq).then((res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  });

  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS))
    .then(() => caches.match(req).then((cached) => cached || network));

  return Promise.race([network, slow]).catch(() =>
    caches.match(req).then((cached) => cached || caches.match("./index.html"))
  );
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never touch Firebase / weather / other cross-origin calls — straight to network.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;
  e.respondWith(networkFirst(e.request));
});

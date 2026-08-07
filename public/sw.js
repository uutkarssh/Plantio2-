/* Plantio service worker — hand-rolled (next-pwa not Next-16 compatible)
 * Strategy:
 *  - app shell + static assets: cache-first
 *  - API calls:   network-first, fall back to cache
 *  - navigation:   network-first with cached app-shell fallback
 */
const CACHE_VERSION = "plantio-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const API_CACHE = `${CACHE_VERSION}-api`;
const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/loading-screen.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API calls (same-origin /api and the AI/weather/geocode external calls)
  const isApi =
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("open-meteo") ||
    url.hostname.includes("nominatim") ||
    url.hostname.includes("arcgisonline");

  if (isApi) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || new Response("offline", { status: 503 })))
    );
    return;
  }

  // Map tiles — cache-first (stale-while-revalidate)
  if (url.hostname.includes("arcgisonline") || url.pathname.includes("/tile/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation — network-first, fallback to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((c) => c || caches.match(req)))
    );
    return;
  }

  // Static assets — cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/"))) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});

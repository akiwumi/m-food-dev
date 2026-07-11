const CACHE = "moodfood-shell-v2";
const SHELL = ["/", "/manifest.webmanifest", "/images/logo-1.png"];
const MAX_ASSET_ENTRIES = 60; // cap cached hashed /assets/ bundles so long-lived installs don't accumulate stale ones

// Evict the oldest overflow /assets/ entries. cache.keys() preserves insertion
// order, so the earliest-cached (oldest) hashed bundles are trimmed first.
async function trimAssetCache(cache) {
  const keys = await cache.keys();
  const assetKeys = keys.filter((req) => new URL(req.url).pathname.startsWith("/assets/"));
  if (assetKeys.length <= MAX_ASSET_ENTRIES) return;
  await Promise.all(assetKeys.slice(0, assetKeys.length - MAX_ASSET_ENTRIES).map((req) => cache.delete(req)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/functions/")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic" && !response.headers.has("set-cookie")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) =>
            cache.put(event.request, copy).then(() => {
              if (url.pathname.startsWith("/assets/")) return trimAssetCache(cache);
            }),
          );
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/") : undefined))),
  );
});

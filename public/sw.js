const CACHE = "moodfood-shell-v2";
const SHELL = ["/", "/manifest.webmanifest", "/images/logo-1.png"];

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
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/") : undefined))),
  );
});

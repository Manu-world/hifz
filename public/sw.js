const CACHE_NAME = "hifz-shell-v1";
// Hashed /_next/static/* chunks aren't listed here since they change every
// build and we have no build-time manifest generator (no Workbox/next-pwa).
// The browser's HTTP cache already handles those reasonably well; this list
// covers just enough for the app shell to render while offline.
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Best-effort precache; a failed addAll shouldn't block install.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
        ),
    ]),
  );
});

// Network-first, cache-fallback — only for navigations, the manifest, and
// the due-words API (the one GET that practice sessions need to boot
// offline). Everything else, including all mutating requests, passes
// through untouched; offline mutation queuing lives in the app layer
// (src/lib/offline/), not here.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isDueWordsApi = url.pathname === "/api/words/due";
  const isManifest = url.pathname === "/manifest.webmanifest";
  if (!isNavigation && !isDueWordsApi && !isManifest) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNavigation) return caches.match("/");
        return Response.error();
      }),
  );
});

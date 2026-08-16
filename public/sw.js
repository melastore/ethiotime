// Bump this whenever the caching rules change: the activate handler deletes every
// cache that does not match, which is what evicts stale entries from older versions.
const CACHE_NAME = "ethiotime-v2";

// Only genuinely static things belong in the precache. Pages are deliberately absent:
// every tool renders "today", so a cached page is a wrong page.
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/ethiotime-mark.svg",
  "/ethiotime-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Build output under /_next/static is content-hashed, so it can be cached forever.
 * Everything else the app serves is either a page or the data behind one.
 */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: always go to the network so the date is current, and fall back to
  // the offline page only when the network is genuinely unavailable.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // React Server Component payloads are what a client-side <Link> navigation
  // fetches. They are page content, not assets, and must never be served stale —
  // caching these is what previously froze pages on the date of the first visit.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") {
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        });
      })
    );
    return;
  }

  // Anything else: prefer the network, keep a copy only as an offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

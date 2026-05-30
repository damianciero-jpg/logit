// ── Cache names — bump CACHE_VERSION on each production deploy ──────────────
const CACHE_VERSION = "v1";
const SHELL_CACHE   = `logit-shell-${CACHE_VERSION}`;   // pre-cached app shell
const ASSET_CACHE   = `logit-assets-${CACHE_VERSION}`;  // runtime-cached static assets

// App shell routes pre-fetched on install so the UI boots offline.
const SHELL_ROUTES = ["/"];

// Paths that must ALWAYS go to the network — never served from cache.
// Audio transmission and AI formatting must not be intercepted.
const NETWORK_ONLY_PREFIXES = ["/api/"];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ROUTES))
      .then(() => self.skipWaiting())   // activate immediately without waiting for old SW to die
  );
});

// ── Activate: delete stale caches from previous versions ────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())  // take control of all open tabs immediately
  );
});

// ── Fetch: routing strategy per request type ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignore non-GET and cross-origin requests (e.g. analytics, CDN fonts)
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ── 1. Network Only — API routes ─────────────────────────────────────────
  // /api/format-report (Whisper + Claude) must reach the network every time.
  // Return a structured offline error if the network is unavailable so the
  // client can display a meaningful message instead of a generic fetch failure.
  if (NETWORK_ONLY_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({
            error:
              "You are offline. Audio processing requires an internet connection. Please reconnect and try again.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );
    return;
  }

  // ── 2. Cache First — Next.js static assets ────────────────────────────────
  // /_next/static/** files are content-hashed (immutable), so serving from
  // cache is always safe. Populate the cache on the first request.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── 3. Network First — HTML navigation ───────────────────────────────────
  // Always attempt to serve the freshest shell from the network.
  // Fall back to the cached version (then to "/") when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match("/"))
        )
    );
    return;
  }

  // ── 4. Stale While Revalidate — everything else ───────────────────────────
  // Serve cached copy immediately; revalidate in the background so the next
  // request gets fresh content (e.g. public icons, fonts, manifest).
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached ?? networkFetch;
    })
  );
});

// ── Message: allow the PWAProvider to trigger a cache-busting update ────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

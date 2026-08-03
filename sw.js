// Service worker — makes the app installable and fast, WITHOUT trapping you on an
// old version. The page itself is fetched network-first, so uploading a new
// index.html shows up right away; only the icons are cached aggressively.
const CACHE = "shared-tasks-v11";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never cache Supabase API calls — always hit the network for fresh data.
  if (url.hostname.endsWith("supabase.co")) return;

  const isPage =
    e.request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("index.html");

  if (isPage) {
    // Network-first for the app page: always try to get the newest version,
    // fall back to the cached copy only when offline.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else (icons, manifest): cache-first for speed.
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});

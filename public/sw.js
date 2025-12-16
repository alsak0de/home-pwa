self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through network (no caching) for reliability
self.addEventListener('fetch', () => {
  // Intentionally empty: fastest online-first behavior
});

/* Minimal pass-through service worker for installability.
 * Caches nothing intentionally; relies on network freshness.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-only strategy for simplicity and freshness
  event.respondWith(fetch(event.request));
});



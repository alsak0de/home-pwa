// Minimal service worker for installability only.
// No fetch handler to avoid interfering with network/CORS.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));



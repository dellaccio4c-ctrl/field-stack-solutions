// Minimal service worker: makes the app installable on phones.
// Network-first passthrough — no offline caching yet, so data is always live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

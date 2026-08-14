/* testD v6 cache kill-switch worker.
 * Registered at scope "/" so it REPLACES the previous app service worker
 * registration (/sw.js), wipes its caches, reloads open tabs, then removes
 * itself. Messaging workers (Firebase / OneSignal) are left untouched.
 */

function isAppCache(name) {
  const lower = String(name).toLowerCase();
  if (lower.includes("firebase") || lower.includes("onesignal") || lower.includes("fcm")) {
    return false;
  }
  return true;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isAppCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        windowClients.forEach((client) => {
          try {
            client.postMessage({ type: "TESTD_CACHE_KILLED", version: "6.0.0" });
          } catch (_) {
            /* noop */
          }
        });
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

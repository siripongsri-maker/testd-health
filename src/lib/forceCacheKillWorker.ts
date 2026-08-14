/**
 * One-shot cache kill-switch driver for the v6 release.
 *
 * Registers /cache-killer.js at scope "/" which replaces the previous app
 * service worker registration, deletes its caches and unregisters itself.
 * Runs at most once per release token, and never in dev/preview contexts.
 */

const KILL_WORKER_PATH = "/cache-killer.js";

export async function runCacheKillWorker(timeoutMs = 6000): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.register(KILL_WORKER_PATH, {
      scope: "/",
      updateViaCache: "none",
    });

    await Promise.race([
      new Promise<void>((resolve) => {
        const check = () => {
          if (registration.active || registration.waiting) resolve();
        };
        check();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "activated" || installing.state === "redundant") resolve();
          });
        });
      }),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    console.info("[testD-v6] cache kill-switch worker executed");
    return true;
  } catch (err) {
    console.warn("[testD-v6] cache kill-switch worker failed", err);
    return false;
  }
}

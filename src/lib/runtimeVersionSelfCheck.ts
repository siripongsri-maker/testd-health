import { APP_VERSION } from "@/config/appVersion";

/**
 * Runtime self-check: compares the version stamped in localStorage against the
 * bundled APP_VERSION. On mismatch it unregisters EVERY service worker
 * registration and purges EVERY Cache Storage entry (including Workbox
 * precache/runtime buckets), stamps the new version, and — if anything was
 * actually cleared — triggers a one-shot hard reload so the freshly-installed
 * bundle takes over.
 *
 * Idempotent: once the stamped version matches, this is a no-op.
 * Safe in preview/dev: skips reload there so HMR is preserved.
 */

const VERSION_KEY = "testd_runtime_version";
const RELOAD_GUARD_KEY = "testd_runtime_selfcheck_reloaded";

function isPreviewOrDev(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.includes("preview") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev")
  );
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      () => {
        window.clearTimeout(t);
        resolve(fallback);
      },
    );
  });
}

export async function runRuntimeVersionSelfCheck(): Promise<void> {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(VERSION_KEY);
  } catch {
    return;
  }

  if (stored === APP_VERSION) return;

  const previewMode = isPreviewOrDev();

  // Unregister every service worker registration for this origin.
  let swCount = 0;
  if ("serviceWorker" in navigator) {
    try {
      const regs = await withTimeout(
        navigator.serviceWorker.getRegistrations(),
        1200,
        [] as ServiceWorkerRegistration[],
      );
      swCount = regs.length;
      await withTimeout(Promise.allSettled(regs.map((r) => r.unregister())), 1500, []);
    } catch {}
  }

  // Purge every Cache Storage entry (Workbox precache-v*, runtime-*, etc.).
  let cacheCount = 0;
  if ("caches" in window) {
    try {
      const keys = await withTimeout(caches.keys(), 1200, [] as string[]);
      cacheCount = keys.length;
      await withTimeout(Promise.allSettled(keys.map((k) => caches.delete(k))), 1500, []);
    } catch {}
  }

  try {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch {}

  console.info("[runtime-version-selfcheck]", {
    from: stored,
    to: APP_VERSION,
    unregistered_service_workers: swCount,
    purged_caches: cacheCount,
    preview: previewMode,
  });

  // Only reload in production, and only once per version transition, and only
  // if we actually cleared something worth reloading for.
  if (previewMode) return;
  if (swCount === 0 && cacheCount === 0) return;

  try {
    const guard = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (guard === APP_VERSION) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, APP_VERSION);
  } catch {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_v", APP_VERSION);
  url.searchParams.set("_t", String(Date.now()));
  window.location.replace(url.toString());
}

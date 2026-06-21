import { useEffect, useRef } from "react";
import { APP_VERSION } from "@/config/appVersion";
import { logCacheResetEvent, markReloadPending } from "@/lib/cacheResetLog";

/**
 * DeploymentVersionCheck
 *
 * Lightweight, idempotent deployment detector:
 * - Fetches /version.json (no-store) periodically and on mount.
 * - If remote version != bundled APP_VERSION → run a ONE-SHOT cache nuke + reload.
 * - Guarded by session+local flags so the same remote version cannot trigger
 *   more than one reset, even across reloads or if Home re-mounts repeatedly.
 *
 * This pairs with ForceUpdateGuard (which runs the per-APP_VERSION reset),
 * but unlike that guard, this one detects new deployments WITHOUT requiring
 * the user to already have the new bundle.
 */

const REMOTE_VERSION_KEY = "testd_remote_version_seen"; // last remote version reacted to (localStorage)
const SESSION_ATTEMPT_KEY = "testd_remote_reload_attempted"; // per-session guard (sessionStorage)
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RELOADS_PER_SESSION = 1;

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const url = `/version.json?t=${Date.now()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

async function nukeAndReload(targetVersion: string) {
  const startedAt = Date.now();
  logCacheResetEvent({
    trigger: "version_check",
    stage: "started",
    to_version: targetVersion,
    from_version: APP_VERSION,
  });

  // Persist the version we are reacting to BEFORE reload — prevents loop on next mount.
  try {
    localStorage.setItem(REMOTE_VERSION_KEY, targetVersion);
  } catch {}

  // Best-effort cache + SW cleanup. Bounded so we never hang.
  const bounded = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
    new Promise((resolve) => {
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

  let cacheCount = 0;
  if ("caches" in window) {
    try {
      const keys = await bounded(caches.keys(), 1000, [] as string[]);
      cacheCount = keys.length;
      await bounded(Promise.allSettled(keys.map((k) => caches.delete(k))), 1200, []);
      logCacheResetEvent({
        trigger: "version_check",
        stage: "caches_cleared",
        to_version: targetVersion,
        from_version: APP_VERSION,
        duration_ms: Date.now() - startedAt,
        metadata: { cache_count: cacheCount },
      });
    } catch (err) {
      logCacheResetEvent({
        trigger: "version_check",
        stage: "failed",
        to_version: targetVersion,
        success: false,
        error: `caches:${(err as Error)?.message ?? "unknown"}`,
      });
    }
  }

  let swCount = 0;
  if ("serviceWorker" in navigator) {
    try {
      const regs = await bounded(
        navigator.serviceWorker.getRegistrations(),
        1000,
        [] as ServiceWorkerRegistration[],
      );
      swCount = regs.length;
      await bounded(Promise.allSettled(regs.map((r) => r.unregister())), 1200, []);
      logCacheResetEvent({
        trigger: "version_check",
        stage: "service_worker_reset",
        to_version: targetVersion,
        from_version: APP_VERSION,
        duration_ms: Date.now() - startedAt,
        metadata: { sw_count: swCount },
      });
    } catch (err) {
      logCacheResetEvent({
        trigger: "version_check",
        stage: "failed",
        to_version: targetVersion,
        success: false,
        error: `sw:${(err as Error)?.message ?? "unknown"}`,
      });
    }
  }

  logCacheResetEvent({
    trigger: "version_check",
    stage: "completed",
    to_version: targetVersion,
    from_version: APP_VERSION,
    success: true,
    duration_ms: Date.now() - startedAt,
    metadata: { sw_count: swCount, cache_count: cacheCount },
  });

  markReloadPending("version_check", targetVersion, 1);
  logCacheResetEvent({
    trigger: "version_check",
    stage: "reload_triggered",
    to_version: targetVersion,
    from_version: APP_VERSION,
  });

  const url = new URL(window.location.href);
  url.searchParams.set("_v", targetVersion);
  url.searchParams.set("_t", String(Date.now()));
  window.location.replace(url.toString());
}

function shouldReload(remote: string): boolean {
  if (!remote || remote === APP_VERSION) return false;

  // Already reacted to this exact remote version → don't loop.
  try {
    if (localStorage.getItem(REMOTE_VERSION_KEY) === remote) return false;
  } catch {}

  // Session-level cap: 1 reload per browser session, no matter what.
  try {
    const attempts = parseInt(sessionStorage.getItem(SESSION_ATTEMPT_KEY) || "0", 10);
    if (attempts >= MAX_RELOADS_PER_SESSION) return false;
    sessionStorage.setItem(SESSION_ATTEMPT_KEY, String(attempts + 1));
  } catch {}

  return true;
}

export function DeploymentVersionCheck() {
  const ranOnceRef = useRef(false);

  useEffect(() => {
    // Skip in dev or Lovable preview iframe — those use HMR.
    if (import.meta.env.DEV) return;
    if (window.location.hostname.includes("preview")) return;
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    let cancelled = false;

    const check = async () => {
      const remote = await fetchRemoteVersion();
      if (cancelled || !remote) return;
      if (shouldReload(remote)) {
        void nukeAndReload(remote);
      }
    };

    // Defer initial check to idle so it never competes with first paint.
    const schedule = (fn: () => void, delay: number): number => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        return w.requestIdleCallback(fn, { timeout: delay });
      }
      return window.setTimeout(fn, delay);
    };

    const initialId = schedule(() => void check(), 3000);
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (typeof w.cancelIdleCallback === "function") {
        try {
          w.cancelIdleCallback(initialId);
        } catch {}
      } else {
        window.clearTimeout(initialId);
      }
    };
  }, []);

  return null;
}

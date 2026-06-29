import { useEffect, useState } from "react";
import { APP_VERSION } from "@/config/appVersion";
import {
  logCacheResetEvent,
  markReloadPending,
  type CacheResetTrigger,
} from "@/lib/cacheResetLog";

const VERSION_KEY = "testd_app_version";
const RESET_KEY = "testd_forced_cache_reset";
const SESSION_KEY = "testd_session_checked_version";
const RETRY_KEY = "testd_refresh_retries";
const MAX_RETRIES = 3;
const CACHE_RESET_VERSION = `${APP_VERSION}:stale-sw-kill-2026-06-22`;

function isPreviewOrDevHost(): boolean {
  const host = window.location.hostname;
  return (
    import.meta.env.DEV ||
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.includes("preview") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
}

async function disablePreviewServiceWorkersAndCaches(): Promise<void> {
  let swCount = 0;
  let cacheCount = 0;

  if ("serviceWorker" in navigator) {
    const regs = await withTimeout(
      navigator.serviceWorker.getRegistrations(),
      1000,
      [] as ServiceWorkerRegistration[],
    );
    swCount = regs.length;
    await withTimeout(Promise.allSettled(regs.map((r) => r.unregister())), 1200, []);
  }

  if ("caches" in window) {
    const keys = await withTimeout(caches.keys(), 1000, [] as string[]);
    cacheCount = keys.length;
    await withTimeout(Promise.allSettled(keys.map((k) => caches.delete(k))), 1200, []);
  }

  if (swCount || cacheCount) {
    console.info("[testD-preview-cache] disabled stale preview SW/cache", {
      appVersion: APP_VERSION,
      serviceWorkers: swCount,
      caches: cacheCount,
    });
  }
}

// Keys to preserve during force-update
const PRESERVE_PREFIXES = [
  "sb-",
  "supabase.",
  "referral_code",
  "testd-language",
  "testd-v5-banner-dismissed",
];

function shouldPreserve(key: string): boolean {
  return PRESERVE_PREFIXES.some((p) => key.startsWith(p));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

function clearBrowserCookies() {
  const hostname = window.location.hostname;
  const domainParts = hostname.split(".");
  const apexDomain = domainParts.length > 2 ? `.${domainParts.slice(-2).join(".")}` : `.${hostname}`;
  const domains = Array.from(new Set([undefined, hostname, apexDomain]));

  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
    });
  });
}

function dispatchAnalytics(event: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("testd-analytics", { detail: { event, version: APP_VERSION } })
    );
  } catch {}
}

async function nukeCache(trigger: CacheResetTrigger, attempt = 1): Promise<void> {
  const startedAt = Date.now();
  dispatchAnalytics("cache_cleared");
  logCacheResetEvent({ trigger, stage: "started", attempt });

  // 1. Unregister all service workers
  let swCount = 0;
  if ("serviceWorker" in navigator) {
    try {
      const regs = await withTimeout(
        navigator.serviceWorker.getRegistrations(),
        1200,
        [] as ServiceWorkerRegistration[]
      );
      swCount = regs.length;
      await withTimeout(Promise.allSettled(regs.map((r) => r.unregister())), 1200, []);
      dispatchAnalytics("service_worker_reset");
      logCacheResetEvent({
        trigger,
        stage: "service_worker_reset",
        attempt,
        duration_ms: Date.now() - startedAt,
        metadata: { sw_count: swCount },
      });
    } catch (err) {
      logCacheResetEvent({
        trigger,
        stage: "failed",
        attempt,
        success: false,
        error: `sw_unregister:${(err as Error)?.message ?? "unknown"}`,
      });
    }
  }

  // 2. Clear Cache Storage API
  let cacheCount = 0;
  if ("caches" in window) {
    try {
      const keys = await withTimeout(caches.keys(), 1200, [] as string[]);
      cacheCount = keys.length;
      await withTimeout(Promise.allSettled(keys.map((k) => caches.delete(k))), 1500, []);
      logCacheResetEvent({
        trigger,
        stage: "caches_cleared",
        attempt,
        duration_ms: Date.now() - startedAt,
        metadata: { cache_count: cacheCount },
      });
    } catch (err) {
      logCacheResetEvent({
        trigger,
        stage: "failed",
        attempt,
        success: false,
        error: `caches:${(err as Error)?.message ?? "unknown"}`,
      });
    }
  }

  // 3. Clear same-origin cookies best-effort. HttpOnly cookies cannot be cleared client-side.
  try {
    clearBrowserCookies();
  } catch {}

  // 4. Clear sessionStorage except retry/session keys
  const retryVal = sessionStorage.getItem(RETRY_KEY);
  const sessionVal = sessionStorage.getItem(SESSION_KEY);
  sessionStorage.clear();
  if (retryVal) sessionStorage.setItem(RETRY_KEY, retryVal);
  if (sessionVal) sessionStorage.setItem(SESSION_KEY, sessionVal);

  // 5. Clear localStorage except preserved keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !shouldPreserve(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // 6. Stamp new version
  localStorage.setItem(VERSION_KEY, APP_VERSION);

  logCacheResetEvent({
    trigger,
    stage: "storage_cleared",
    attempt,
    duration_ms: Date.now() - startedAt,
    metadata: {
      removed_local_keys: keysToRemove.length,
      sw_count: swCount,
      cache_count: cacheCount,
    },
  });

  logCacheResetEvent({
    trigger,
    stage: "completed",
    attempt,
    success: true,
    duration_ms: Date.now() - startedAt,
  });
}

function isRetryExhausted(): boolean {
  const retries = parseInt(sessionStorage.getItem(RETRY_KEY) || "0", 10);
  return retries >= MAX_RETRIES;
}

function incrementRetry(): number {
  const retries = parseInt(sessionStorage.getItem(RETRY_KEY) || "0", 10) + 1;
  sessionStorage.setItem(RETRY_KEY, String(retries));
  return retries;
}

function performHardReload() {
  // Use cache-busting URL to force fresh fetch
  const url = new URL(window.location.href);
  url.searchParams.set("_v", APP_VERSION);
  url.searchParams.set("_t", String(Date.now()));
  window.location.replace(url.toString());
}

type GuardState = "ok" | "updating" | "stuck";

export function ForceUpdateGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("ok");

  useEffect(() => {
    if (isPreviewOrDevHost()) {
      void disablePreviewServiceWorkersAndCaches();
      return;
    }
    if (localStorage.getItem(RESET_KEY) === CACHE_RESET_VERSION) return;

    // Mark so we don't loop, then nuke caches/SWs and hard-reload to pick up
    // the latest bundle. Without the reload, the user stays on the stale SW-
    // served HTML/JS even after unregister.
    localStorage.setItem(RESET_KEY, CACHE_RESET_VERSION);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    sessionStorage.setItem(SESSION_KEY, APP_VERSION);

    void nukeCache("force_guard").then(() => {
      sessionStorage.setItem(SESSION_KEY, APP_VERSION);
      localStorage.setItem(RESET_KEY, CACHE_RESET_VERSION);
      dispatchAnalytics("background_cache_reset_completed");
      markReloadPending("force_guard", APP_VERSION, 1);
      // Small delay so analytics/log writes flush before navigation.
      setTimeout(performHardReload, 300);
    });
  }, []);

  useEffect(() => {
    if (state !== "updating") return;

    // Loop protection
    if (isRetryExhausted()) {
      dispatchAnalytics("refresh_failed");
      logCacheResetEvent({
        trigger: "stuck_retry",
        stage: "gave_up",
        success: false,
        attempt: MAX_RETRIES,
        error: "max_retries_exceeded",
      });
      setState("stuck");
      return;
    }

    dispatchAnalytics("hard_refresh_triggered");
    const attempt = incrementRetry();

    nukeCache("force_guard", attempt).then(() => {
      // Mark session as checked before reload
      sessionStorage.setItem(SESSION_KEY, APP_VERSION);
      dispatchAnalytics("refresh_completed");
      markReloadPending("force_guard", APP_VERSION, attempt);
      logCacheResetEvent({
        trigger: "force_guard",
        stage: "reload_triggered",
        attempt,
        to_version: APP_VERSION,
      });
      setTimeout(performHardReload, 800);
    });
  }, [state]);

  // Session freshness check (runs every session even if version matches)
  useEffect(() => {
    if (state !== "ok") return;

    // On first load of session, do a lightweight SW freshness check
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, APP_VERSION);

      // Trigger SW update check if registered
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => {
            try { r.update(); } catch {}
          });
        }).catch(() => {});
      }

      dispatchAnalytics("hard_refresh_check_started");
    }

    // Clear retry counter on successful load
    sessionStorage.removeItem(RETRY_KEY);
  }, [state]);

  if (state === "updating") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-6" />
        <p className="text-lg font-semibold text-foreground">
          กำลังอัปเดต testD เป็นเวอร์ชันล่าสุด
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Updating testD to the latest version
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          กรุณารอสักครู่เพื่อให้ระบบโหลดข้อมูลใหม่อย่างปลอดภัย
        </p>
        <p className="text-xs text-muted-foreground">
          Please wait a moment while we load the newest system safely
        </p>
      </div>
    );
  }

  if (state === "stuck") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-lg font-semibold text-foreground mb-2">
          ไม่สามารถอัปเดตอัตโนมัติได้
        </p>
        <p className="text-sm text-muted-foreground mb-1">
          Unable to auto-update. Please close and reopen the app.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          กรุณาปิดแอปแล้วเปิดใหม่ หรือกดปุ่มด้านล่าง
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem(RETRY_KEY);
            logCacheResetEvent({
              trigger: "manual",
              stage: "reload_triggered",
              to_version: APP_VERSION,
            });
            markReloadPending("manual", APP_VERSION, 1);
            performHardReload();
          }}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
        >
          Try Again / ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

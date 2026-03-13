import { useEffect, useState } from "react";
import { APP_VERSION } from "@/config/appVersion";

const VERSION_KEY = "testd_app_version";
const SESSION_KEY = "testd_session_checked_version";
const RETRY_KEY = "testd_refresh_retries";
const MAX_RETRIES = 3;

// Keys to preserve during force-update
const PRESERVE_PREFIXES = [
  "sb-",
  "supabase.",
  "referral_code",
  "testd-language",
  "testd-v3-banner-dismissed",
];

function shouldPreserve(key: string): boolean {
  return PRESERVE_PREFIXES.some((p) => key.startsWith(p));
}

function dispatchAnalytics(event: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("testd-analytics", { detail: { event, version: APP_VERSION } })
    );
  } catch {}
}

async function nukeCache(): Promise<void> {
  dispatchAnalytics("cache_cleared");

  // 1. Unregister all service workers
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.map((r) => r.unregister()));
      dispatchAnalytics("service_worker_reset");
    } catch {}
  }

  // 2. Clear Cache Storage API
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    } catch {}
  }

  // 3. Clear sessionStorage entirely
  sessionStorage.clear();

  // 4. Clear localStorage except preserved keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !shouldPreserve(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // 5. Stamp new version
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

function needsVersionUpdate(): boolean {
  const stored = localStorage.getItem(VERSION_KEY);
  return stored !== APP_VERSION;
}

function needsSessionCheck(): boolean {
  const sessionFlag = sessionStorage.getItem(SESSION_KEY);
  return sessionFlag !== APP_VERSION;
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
  const [state, setState] = useState<GuardState>(() => {
    // Synchronous pre-check to avoid flash of content
    if (needsVersionUpdate()) return "updating";
    if (needsSessionCheck()) return "updating";
    return "ok";
  });

  useEffect(() => {
    if (state !== "updating") return;

    // Loop protection
    if (isRetryExhausted()) {
      dispatchAnalytics("refresh_failed");
      setState("stuck");
      return;
    }

    dispatchAnalytics("hard_refresh_triggered");
    incrementRetry();

    nukeCache().then(() => {
      // Mark session as checked before reload
      sessionStorage.setItem(SESSION_KEY, APP_VERSION);
      dispatchAnalytics("refresh_completed");
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

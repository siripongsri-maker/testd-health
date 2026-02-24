import { useEffect, useState } from "react";
import { APP_VERSION } from "@/config/appVersion";

const VERSION_KEY = "app_version";

// Keys to preserve during force-update
const PRESERVE_PREFIXES = [
  "sb-",           // Supabase auth tokens
  "supabase.",
  "referral_code",
];

function shouldPreserve(key: string): boolean {
  return PRESERVE_PREFIXES.some((p) => key.startsWith(p));
}

async function nukeCache() {
  // Unregister all service workers
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  // Clear Cache Storage API
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // Clear sessionStorage entirely
  sessionStorage.clear();

  // Clear localStorage except preserved keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !shouldPreserve(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // Stamp new version
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

export function ForceUpdateGuard({ children }: { children: React.ReactNode }) {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === APP_VERSION) return;

    setUpdating(true);

    nukeCache().then(() => {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    });
  }, []);

  if (updating) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-6" />
        <p className="text-lg font-semibold text-foreground">
          ระบบมีการอัปเดตใหม่ กำลังรีเฟรช...
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          New update available. Refreshing...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

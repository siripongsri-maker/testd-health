import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runRuntimeVersionSelfCheck } from "@/lib/runtimeVersionSelfCheck";
import { initFavicon } from "@/lib/faviconSetting";
import { registerAppServiceWorker } from "@/lib/pwaRegistration";

// Clear stale workers/cache first, then register the generated offline worker.
// Keeping these steps sequential prevents the first production boot from
// unregistering the worker while it is installing.
void (async () => {
  await runRuntimeVersionSelfCheck();
  await registerAppServiceWorker();
})();

// Restore the admin-selected brand favicon (defaults to testD).
initFavicon();

const MODULE_RECOVERY_KEY = "testd-module-recovery-attempted";

const STALE_MODULE_PATTERNS = [
  "Importing a module script failed",
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
];

function isStaleModuleError(text: string) {
  return STALE_MODULE_PATTERNS.some((pattern) => text.includes(pattern));
}

async function recoverFromStaleModules() {
  try {
    if (localStorage.getItem(MODULE_RECOVERY_KEY) === "1") return;
    localStorage.setItem(MODULE_RECOVERY_KEY, "1");

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => [] as ServiceWorkerRegistration[]);
      await Promise.allSettled(regs.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys().catch(() => [] as string[]);
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}

window.addEventListener("error", (event) => {
  const message = String(event?.message || "");
  if (isStaleModuleError(message)) {
    void recoverFromStaleModules();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reasonText = String((event as PromiseRejectionEvent).reason || "");
  if (isStaleModuleError(reasonText)) {
    void recoverFromStaleModules();
  }
});

// Sync html lang attribute with stored language preference
const storedLang = localStorage.getItem('testd-language') || 'th';
document.documentElement.lang = storedLang;

// Dev-only: confirm which backend project is connected
if (import.meta.env.DEV) {
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL);
    console.log(`[DEV] Backend connected: ${url.host}`);
  } catch {
    console.warn('[DEV] VITE_SUPABASE_URL is not set or invalid');
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Boot succeeded — allow a future recovery reload if modules go stale again.
window.setTimeout(() => {
  try {
    localStorage.removeItem(MODULE_RECOVERY_KEY);
  } catch {
    /* noop */
  }
}, 5000);

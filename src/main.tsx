import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runRuntimeVersionSelfCheck } from "@/lib/runtimeVersionSelfCheck";

// Fire-and-forget: on version mismatch, unregister all SWs and purge all
// Cache Storage entries before the app mounts. Idempotent when version matches.
void runRuntimeVersionSelfCheck();

const MODULE_RECOVERY_KEY = "testd-module-recovery-attempted";

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
  if (message.includes("Importing a module script failed")) {
    void recoverFromStaleModules();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reasonText = String((event as PromiseRejectionEvent).reason || "");
  if (reasonText.includes("Importing a module script failed")) {
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

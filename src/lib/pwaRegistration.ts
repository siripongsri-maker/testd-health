/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from "virtual:pwa-register";

const APP_WORKER_PATHS = ["/sw.js", "/service-worker.js"];

function isPreviewOrDevContext(): boolean {
  if (!import.meta.env.PROD) return true;

  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const hostname = window.location.hostname;
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
}

function isManagedRegistration(registration: ServiceWorkerRegistration): boolean {
  const candidates = [
    registration.active?.scriptURL,
    registration.waiting?.scriptURL,
    registration.installing?.scriptURL,
  ].filter((value): value is string => Boolean(value));

  return candidates.some((scriptURL) => {
    try {
      return APP_WORKER_PATHS.includes(new URL(scriptURL).pathname);
    } catch {
      return false;
    }
  });
}

async function unregisterManagedWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter(isManagedRegistration)
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Service workers are optional; never block the application boot.
  }
}

export async function registerAppServiceWorker(): Promise<void> {
  if (isPreviewOrDevContext()) {
    await unregisterManagedWorkers();
    return;
  }

  registerSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) void registration.update().catch(() => undefined);
    },
  });
}

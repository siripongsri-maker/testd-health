import { lazy, type ComponentType } from "react";

/**
 * React.lazy with retry + one-time hard reload.
 *
 * After a new deploy (or an HMR update), an old page can hold URLs to chunks
 * that no longer exist, producing:
 *   "Failed to fetch dynamically imported module: .../Foo.tsx"
 * which blanks the screen. We retry once with a cache-busting query, then fall
 * back to a single full reload (guarded by sessionStorage so we never loop).
 */
const RELOAD_KEY = "lazy_chunk_reloaded_at";

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Brief pause, then one retry — handles transient network/dev-server hiccups.
      await new Promise((r) => setTimeout(r, 500));
      try {
        return await factory();
      } catch (err2) {
        try {
          const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
          if (Date.now() - last > 30_000) {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
            // Keep the promise pending while the page reloads.
            return await new Promise<{ default: T }>(() => {});
          }
        } catch {
          /* sessionStorage unavailable — fall through */
        }
        throw err2 ?? err;
      }
    }
  });
}

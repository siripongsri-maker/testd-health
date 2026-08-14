import { useCallback, useRef } from "react";

/**
 * Keeps the window scroll position stable while a list re-renders
 * (e.g. after saving a status in the admin console).
 * Cancels itself as soon as the user scrolls on purpose.
 */
export function lockScroll(duration = 800) {
  if (typeof window === "undefined") return;
  const y = window.scrollY;
  const start = performance.now();
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);

  const tick = () => {
    if (cancelled) return;
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y });
    if (performance.now() - start < duration) requestAnimationFrame(tick);
    else cancel();
  };
  requestAnimationFrame(tick);
}

/**
 * Shows the full-page spinner only on the very first load.
 * Subsequent refreshes keep the current content (and scroll position)
 * on screen so staff never lose track of what they were doing.
 */
export function useStableRefresh(setLoading: (v: boolean) => void) {
  const loaded = useRef(false);

  const begin = useCallback(() => {
    if (!loaded.current) {
      loaded.current = true;
      setLoading(true);
    } else {
      lockScroll();
    }
  }, [setLoading]);

  return { begin, hasLoaded: loaded };
}

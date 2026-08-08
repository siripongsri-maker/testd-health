/**
 * Small app-level setting to choose which brand mark is used as the favicon.
 * Both options are pre-rendered as proper 64x64 squares (trimmed + padded)
 * so switching never stretches a wordmark.
 */
export type FaviconChoice = "testd" | "swing";

const STORAGE_KEY = "app_favicon_choice_v1";

export const FAVICON_SOURCES: Record<FaviconChoice, { url: string; label: string; labelTh: string }> = {
  testd: { url: "/favicon-testd.png", label: "testD logo", labelTh: "โลโก้ testD" },
  swing: { url: "/favicon-swing.png", label: "SWING logo", labelTh: "โลโก้ SWING" },
};

export function getFaviconChoice(): FaviconChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "swing" || stored === "testd") return stored;
  } catch {
    // localStorage unavailable (private mode / SSR) - fall through to default
  }
  return "testd";
}

/** Repoints every icon <link> at the chosen square, with a cache-busting suffix. */
export function applyFavicon(choice: FaviconChoice) {
  if (typeof document === "undefined") return;
  const src = FAVICON_SOURCES[choice] ?? FAVICON_SOURCES.testd;
  const href = `${src.url}?v=${choice}`;

  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  );
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
    links.push(link);
  }
  links.forEach((link) => {
    link.type = "image/png";
    link.href = href;
  });
}

export function setFaviconChoice(choice: FaviconChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore persistence failures; the live swap below still applies
  }
  applyFavicon(choice);
}

/** Call once on app start to restore the saved choice. */
export function initFavicon() {
  applyFavicon(getFaviconChoice());
}

/**
 * SEO locale prefix utilities.
 *
 * Strategy: public/SEO routes are served under /th/... (default) and /en/...
 * so that hreflang alternates point to truly different URLs. Non-SEO routes
 * (admin, account, booking flow, etc.) remain unprefixed.
 *
 * Thai is the default (x-default + canonical). Unprefixed visits to a SEO
 * route are redirected client-side to /th/<path>.
 */

export type Locale = "th" | "en";
export const DEFAULT_LOCALE: Locale = "th";
export const SUPPORTED_LOCALES: Locale[] = ["th", "en"];

/**
 * First-segment matchers for routes that should carry a locale prefix.
 * Add or remove entries here to expand SEO coverage.
 */
const SEO_ROUTE_PREFIXES: string[] = [
  "/", // home
  "/harm-reduction",
  "/chemsex-cards",
  "/hiv-selftest",
  "/hiv-self-test-guide",
  "/info", // /info, /info/:id, /info/article/:slug
  "/substance",
  "/interaction",
  "/prevention-match",
  "/partners",
  "/pep",
  "/chemsex-safety",
  "/drug-combination-risk",
  "/ghb-overdose",
  "/meth-harm-reduction",
  "/support-faq",
  "/privacy-policy",
  "/install",
  "/swing",
];

/** Routes that must NEVER carry a locale prefix (auth, account, admin, ops). */
const NEVER_PREFIX: string[] = [
  "/auth",
  "/onboarding",
  "/consent",
  "/dashboard",
  "/admin",
  "/settings",
  "/personal-info",
  "/health-profile",
  "/avatar",
  "/medication-tracker",
  "/booking",
  "/my-appointments",
  "/guest-appointments",
  "/my-rewards",
  "/credits",
  "/invite",
  "/queue-tv",
  "/go",
  "/forgot-password",
  "/reset-password",
  "/docs",
  "/support-chat",
  "/feedback",
  "/virtual",
  "/unsubscribe",
  "/outreach-form",
  "/privacy-center",
  "/setup",
  "/community",
  "/surveys",
  "/self-care",
  "/leaderboard",
  "/share-achievements",
  "/consultation",
  "/progress",
  "/whats-new",
];

/** True if the path is one we want indexed under /th and /en. */
export function isSeoPath(path: string): boolean {
  const clean = stripLocalePrefix(path).pathname;
  if (NEVER_PREFIX.some((p) => clean === p || clean.startsWith(p + "/"))) {
    return false;
  }
  if (clean === "/") return true;
  return SEO_ROUTE_PREFIXES.some(
    (p) => p !== "/" && (clean === p || clean.startsWith(p + "/")),
  );
}

/**
 * Detect a leading /th or /en segment and return both the locale (or null)
 * and the path with it stripped.
 */
export function stripLocalePrefix(pathname: string): {
  locale: Locale | null;
  pathname: string;
} {
  const m = pathname.match(/^\/(th|en)(\/|$)/);
  if (!m) return { locale: null, pathname };
  const locale = m[1] as Locale;
  const rest = pathname.slice(3) || "/";
  return { locale, pathname: rest };
}

/** Add /<locale> in front of an unprefixed path. */
export function withLocalePrefix(path: string, locale: Locale): string {
  const { pathname } = stripLocalePrefix(path);
  if (pathname === "/") return `/${locale}`;
  return `/${locale}${pathname}`;
}

/**
 * Build the canonical URL path. Canonicals must self-reference the locale
 * actually being rendered, otherwise Google attributes the /en page to /th.
 */
export function canonicalPathFor(
  path: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const { pathname } = stripLocalePrefix(path);
  if (!isSeoPath(pathname)) return pathname;
  return withLocalePrefix(pathname, locale);
}

/** Build alternate-language URL paths for a SEO route. */
export function alternateLanguagePaths(
  path: string,
): { lang: string; path: string }[] {
  const { pathname } = stripLocalePrefix(path);
  if (!isSeoPath(pathname)) return [];
  return [
    { lang: "th", path: withLocalePrefix(pathname, "th") },
    { lang: "en", path: withLocalePrefix(pathname, "en") },
    { lang: "x-default", path: withLocalePrefix(pathname, DEFAULT_LOCALE) },
  ];
}

/**
 * Build hreflang alternates limited to the locales a page actually exists in.
 * Non-reciprocal or 404-ish alternates are worse than none, so callers pass
 * only the locales with real content (e.g. an article with an EN translation).
 * x-default points at Thai when available, otherwise the first available.
 */
export function alternateLanguagePathsFor(
  path: string,
  available: Locale[],
): { lang: string; path: string }[] {
  const { pathname } = stripLocalePrefix(path);
  if (!isSeoPath(pathname)) return [];
  const locales = SUPPORTED_LOCALES.filter((l) => available.includes(l));
  if (locales.length === 0) return [];
  const alts = locales.map((l) => ({ lang: l as string, path: withLocalePrefix(pathname, l) }));
  const fallback = locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : locales[0];
  alts.push({ lang: "x-default", path: withLocalePrefix(pathname, fallback) });
  return alts;
}

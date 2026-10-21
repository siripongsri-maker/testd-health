/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
/**
 * AdSense placement policy.
 *
 * Google Publisher Policies forbid Google-served ads on screens without
 * publisher content (login, forms, thank-you/status pages, dashboards, admin)
 * and restrict content about recreational drug use. Loading the ad script on
 * every route caused a "policy violation" review result, so ads only load on
 * article-style educational pages listed here. Everything else stays ad-free.
 */
export const ADSENSE_CLIENT = "ca-pub-6367408725671452";

/** Paths (locale prefix already stripped) where ads may load. */
const ALLOWED_EXACT = new Set<string>([
  "/info",
  "/info/categories",
  "/info/faq",
  "/hiv-self-test-guide",
  "/support-faq",
  "/partners",
  "/swing",
  "/privacy-policy",
]);

const ALLOWED_PREFIXES = ["/info/article/", "/info/category/"];

/** Never ads here, even if a future prefix rule would match. */
const BLOCKED_PREFIXES = [
  "/info/write",
  "/info/search",
  "/harm-reduction",
  "/km/harm-reduction",
  "/chemsex",
  "/drug-combination-risk",
  "/ghb-overdose",
  "/meth-harm-reduction",
  "/interaction",
  "/substance",
  "/admin",
];

export function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(th|en)(\/.*)?$/);
  if (!m) return pathname || "/";
  return m[2] || "/";
}

export function isAdEligiblePath(pathname: string): boolean {
  const p = stripLocale(pathname).replace(/\/+$/, "") || "/";
  if (BLOCKED_PREFIXES.some((b) => p === b || p.startsWith(b + "/") || p.startsWith(b))) return false;
  if (ALLOWED_EXACT.has(p)) return true;
  return ALLOWED_PREFIXES.some((a) => p.startsWith(a) && p.length > a.length);
}

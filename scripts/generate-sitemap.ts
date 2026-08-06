// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Includes every public route plus all published blog/SEO articles, each emitted
// in Thai (/th/...) and English (/en/...) with hreflang alternates.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://testd.website";
const LOCALES = ["th", "en"] as const;
const DEFAULT_LOCALE = "th";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/harm-reduction", changefreq: "weekly", priority: "0.9" },
  { path: "/hiv-selftest", changefreq: "weekly", priority: "0.9" },
  { path: "/chemsex-safety", changefreq: "weekly", priority: "0.9" },
  { path: "/drug-combination-risk", changefreq: "weekly", priority: "0.9" },
  { path: "/booking", changefreq: "daily", priority: "0.8" },
  { path: "/info", changefreq: "daily", priority: "0.8" },
  { path: "/info/categories", changefreq: "weekly", priority: "0.7" },
  { path: "/ghb-overdose", changefreq: "monthly", priority: "0.8" },
  { path: "/meth-harm-reduction", changefreq: "monthly", priority: "0.8" },
  { path: "/hiv-self-test-guide", changefreq: "monthly", priority: "0.8" },
  { path: "/prevention-match", changefreq: "monthly", priority: "0.7" },
  { path: "/partners", changefreq: "monthly", priority: "0.7" },
  { path: "/pep", changefreq: "monthly", priority: "0.7" },
  { path: "/swing", changefreq: "monthly", priority: "0.6" },
  { path: "/surveys", changefreq: "weekly", priority: "0.5" },
  { path: "/community", changefreq: "daily", priority: "0.5" },
  { path: "/self-care", changefreq: "weekly", priority: "0.5" },
  { path: "/consultation", changefreq: "monthly", priority: "0.5" },
  { path: "/install", changefreq: "monthly", priority: "0.4" },
  { path: "/whats-new", changefreq: "monthly", priority: "0.4" },
  { path: "/support-faq", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
];

function escapeXml(s: string) {
  return s.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

function withLocale(path: string, locale: string) {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

async function fetchRows(table: string, query: string): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch failed: ${res.status}`);
      return [];
    }
    return (await res.json()) as any[];
  } catch (err) {
    console.warn(`[sitemap] ${table} fetch error:`, (err as Error).message);
    return [];
  }
}

async function collectEntries(): Promise<SitemapEntry[]> {
  const entries = [...staticEntries];

  // Published SEO / blog articles (Thai + English content live on the same slug)
  const articles = await fetchRows(
    "blog_articles",
    "select=id,slug,updated_at,published_at&status=eq.published&order=published_at.desc&limit=5000",
  );
  for (const a of articles) {
    const stamp = a.updated_at || a.published_at;
    entries.push({
      path: a.slug ? `/info/article/${a.slug}` : `/info/${a.id}`,
      lastmod: stamp ? new Date(stamp).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  // Harm-reduction substance pages
  const substances = await fetchRows(
    "hr_substances",
    "select=slug,updated_at&is_active=eq.true&limit=2000",
  );
  for (const s of substances) {
    if (!s.slug) continue;
    entries.push({
      path: `/substance/${s.slug}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  return entries;
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls: string[] = [];

  for (const e of entries) {
    const alternates = LOCALES.map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(BASE_URL + withLocale(e.path, l))}" />`,
    );
    alternates.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(BASE_URL + withLocale(e.path, DEFAULT_LOCALE))}" />`,
    );

    for (const locale of LOCALES) {
      urls.push(
        [
          `  <url>`,
          `    <loc>${escapeXml(BASE_URL + withLocale(e.path, locale))}</loc>`,
          e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
          e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
          e.priority ? `    <priority>${e.priority}</priority>` : null,
          ...alternates,
          `  </url>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const entries = await collectEntries();
writeFileSync(resolve("public/sitemap.xml"), renderSitemap(entries));
console.log(`sitemap.xml written (${entries.length * LOCALES.length} URLs, ${entries.length} pages x ${LOCALES.length} locales)`);

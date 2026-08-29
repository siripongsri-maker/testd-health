// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Includes every public route plus all published blog/SEO articles, each emitted
// in Thai (/th/...) and English (/en/...) with hreflang alternates.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { CHEMSEX_FACT_CARDS } from "../src/data/chemsexFactCards";

const BASE_URL = "https://testd.website";
const LOCALES = ["th", "en"] as const;
const DEFAULT_LOCALE = "th";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

interface ImageEntry {
  loc: string;
  /** Per-locale title/caption so the /en entry isn't labelled in Thai. */
  title?: Partial<Record<(typeof LOCALES)[number], string>>;
  caption?: Partial<Record<(typeof LOCALES)[number], string>>;
}

interface SitemapEntry {
  path: string;
  images?: ImageEntry[];
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

  // Chemsex Fact Cards — index plus all 20 individual card pages
  entries.push({ path: "/chemsex-cards", changefreq: "weekly", priority: "0.8" });
  for (const card of CHEMSEX_FACT_CARDS) {
    entries.push({ path: `/chemsex-cards/${card.slug}`, changefreq: "monthly", priority: "0.7" });
  }

  // Blog category landing pages
  const categories = await fetchRows("blog_categories", "select=slug&order=display_order");
  for (const c of categories) {
    if (!c.slug) continue;
    entries.push({ path: `/info/category/${c.slug}`, changefreq: "weekly", priority: "0.7" });
  }


  // Published SEO / blog articles (Thai + English content live on the same slug)
  const articles = await fetchRows(
    "blog_articles",
    "select=id,slug,updated_at,published_at,cover_url,title_th,title_en,excerpt_th,excerpt_en&status=eq.published&order=published_at.desc&limit=5000",
  );
  for (const a of articles) {
    const stamp = a.updated_at || a.published_at;
    const cover = typeof a.cover_url === "string" && /^https?:\/\//.test(a.cover_url) ? a.cover_url : null;
    entries.push({
      path: a.slug ? `/info/article/${a.slug}` : `/info/${a.id}`,
      images: cover
        ? [
            {
              loc: cover,
              title: { th: a.title_th || a.title_en || undefined, en: a.title_en || a.title_th || undefined },
              caption: { th: a.excerpt_th || a.excerpt_en || undefined, en: a.excerpt_en || a.excerpt_th || undefined },
            },
          ]
        : undefined,
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

/** Image sitemap: one <url> per article page (per locale) carrying its cover image. */
function renderImageSitemap(entries: SitemapEntry[]) {
  const urls: string[] = [];
  for (const e of entries) {
    if (!e.images || e.images.length === 0) continue;
    for (const locale of LOCALES) {
      const images = e.images.map((img) => {
        const title = img.title?.[locale];
        const caption = img.caption?.[locale];
        return [
          `    <image:image>`,
          `      <image:loc>${escapeXml(img.loc)}</image:loc>`,
          title ? `      <image:title>${escapeXml(title.slice(0, 160))}</image:title>` : null,
          caption ? `      <image:caption>${escapeXml(caption.slice(0, 300))}</image:caption>` : null,
          `    </image:image>`,
        ]
          .filter(Boolean)
          .join("\n");
      });
      urls.push(
        [
          `  <url>`,
          `    <loc>${escapeXml(BASE_URL + withLocale(e.path, locale))}</loc>`,
          e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
          ...images,
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
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

/** Index that links the page sitemap and the image sitemap together. */
function renderSitemapIndex(files: string[]) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...files.map((f) => `  <sitemap>\n    <loc>${escapeXml(`${BASE_URL}/${f}`)}</loc>\n  </sitemap>`),
    `</sitemapindex>`,
  ].join("\n");
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
const imageCount = entries.reduce((n, e) => n + (e.images?.length ?? 0), 0);

writeFileSync(resolve("public/sitemap-pages.xml"), renderSitemap(entries));
writeFileSync(resolve("public/sitemap-images.xml"), renderImageSitemap(entries));
writeFileSync(
  resolve("public/sitemap.xml"),
  renderSitemapIndex(["sitemap-pages.xml", "sitemap-images.xml"]),
);

console.log(
  `sitemap.xml index written -> sitemap-pages.xml (${entries.length * LOCALES.length} URLs), ` +
    `sitemap-images.xml (${imageCount * LOCALES.length} image URLs)`,
);

/* ------------------------------------------------------------------ *
 * RSS 2.0 + Atom 1.0 feeds of the latest published articles (TH / EN) *
 * ------------------------------------------------------------------ */

const FEED_LIMIT = 50;

interface FeedArticle {
  slug: string;
  title: string;
  summary: string;
  cover: string | null;
  published: string;
  updated: string;
}

function feedArticles(rows: any[], locale: "th" | "en"): FeedArticle[] {
  const other = locale === "th" ? "en" : "th";
  return rows
    .map((a) => {
      const title = a[`title_${locale}`] || a[`title_${other}`];
      if (!a.slug || !title) return null;
      const published = a.published_at || a.updated_at || new Date().toISOString();
      return {
        slug: a.slug as string,
        title: String(title),
        summary: String(a[`excerpt_${locale}`] || a[`excerpt_${other}`] || ""),
        cover: typeof a.cover_url === "string" && /^https?:\/\//.test(a.cover_url) ? a.cover_url : null,
        published: new Date(published).toISOString(),
        updated: new Date(a.updated_at || published).toISOString(),
      } as FeedArticle;
    })
    .filter(Boolean)
    .slice(0, FEED_LIMIT) as FeedArticle[];
}

const FEED_TITLE = {
  th: "testD — บทความสุขภาพทางเพศและลดอันตราย",
  en: "testD — Sexual health & harm reduction articles",
};
const FEED_DESC = {
  th: "อัปเดตบทความใหม่จาก testD เรื่อง HIV, PrEP, PEP, โรคติดต่อทางเพศสัมพันธ์ และการลดอันตรายจากการใช้สาร",
  en: "New articles from testD on HIV, PrEP, PEP, STIs and harm reduction.",
};

function renderRss(items: FeedArticle[], locale: "th" | "en", file: string) {
  const self = `${BASE_URL}/${file}`;
  const home = `${BASE_URL}/${locale}/info`;
  const latest = items[0]?.updated ?? new Date().toISOString();
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
    `<channel>`,
    `  <title>${escapeXml(FEED_TITLE[locale])}</title>`,
    `  <link>${escapeXml(home)}</link>`,
    `  <description>${escapeXml(FEED_DESC[locale])}</description>`,
    `  <language>${locale === "th" ? "th-TH" : "en"}</language>`,
    `  <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>`,
    `  <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />`,
    ...items.map((it) => {
      const url = `${BASE_URL}/${locale}/info/article/${it.slug}`;
      return [
        `  <item>`,
        `    <title>${escapeXml(it.title)}</title>`,
        `    <link>${escapeXml(url)}</link>`,
        `    <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `    <pubDate>${new Date(it.published).toUTCString()}</pubDate>`,
        it.summary ? `    <description>${escapeXml(it.summary)}</description>` : null,
        it.cover ? `    <enclosure url="${escapeXml(it.cover)}" type="image/jpeg" length="0" />` : null,
        `  </item>`,
      ]
        .filter(Boolean)
        .join("\n");
    }),
    `</channel>`,
    `</rss>`,
  ].join("\n");
}

function renderAtom(items: FeedArticle[], locale: "th" | "en", file: string) {
  const self = `${BASE_URL}/${file}`;
  const home = `${BASE_URL}/${locale}/info`;
  const latest = items[0]?.updated ?? new Date().toISOString();
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">`,
    `  <title>${escapeXml(FEED_TITLE[locale])}</title>`,
    `  <subtitle>${escapeXml(FEED_DESC[locale])}</subtitle>`,
    `  <id>${escapeXml(self)}</id>`,
    `  <updated>${latest}</updated>`,
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(self)}" />`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(home)}" />`,
    `  <author><name>testD</name></author>`,
    ...items.map((it) => {
      const url = `${BASE_URL}/${locale}/info/article/${it.slug}`;
      return [
        `  <entry>`,
        `    <title>${escapeXml(it.title)}</title>`,
        `    <id>${escapeXml(url)}</id>`,
        `    <link rel="alternate" type="text/html" href="${escapeXml(url)}" />`,
        `    <published>${it.published}</published>`,
        `    <updated>${it.updated}</updated>`,
        it.summary ? `    <summary type="text">${escapeXml(it.summary)}</summary>` : null,
        it.cover ? `    <link rel="enclosure" type="image/jpeg" href="${escapeXml(it.cover)}" />` : null,
        `  </entry>`,
      ]
        .filter(Boolean)
        .join("\n");
    }),
    `</feed>`,
  ].join("\n");
}

const feedRows = await fetchRows(
  "blog_articles",
  "select=slug,updated_at,published_at,cover_url,title_th,title_en,excerpt_th,excerpt_en&status=eq.published&order=published_at.desc&limit=200",
);

const feedFiles: Record<"th" | "en", { rss: string; atom: string }> = {
  th: { rss: "feed.xml", atom: "atom.xml" },
  en: { rss: "feed-en.xml", atom: "atom-en.xml" },
};

let feedItemCount = 0;
for (const locale of LOCALES) {
  const items = feedArticles(feedRows, locale);
  feedItemCount += items.length;
  writeFileSync(resolve(`public/${feedFiles[locale].rss}`), renderRss(items, locale, feedFiles[locale].rss));
  writeFileSync(resolve(`public/${feedFiles[locale].atom}`), renderAtom(items, locale, feedFiles[locale].atom));
}

console.log(`feeds written -> feed.xml / atom.xml (th), feed-en.xml / atom-en.xml (en) — ${feedItemCount} items`);

// Dynamic sitemap.xml generator with hreflang alternates
// Public endpoint — no JWT required
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE_URL = "https://testd-health.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static routes — public, indexable. Excludes admin, account, booking-flow, queue-tv, etc.
const STATIC_ROUTES: { path: string; changefreq: string; priority: number }[] = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/harm-reduction", changefreq: "weekly", priority: 0.9 },
  { path: "/hiv-selftest", changefreq: "weekly", priority: 0.9 },
  { path: "/booking", changefreq: "daily", priority: 0.8 },
  { path: "/info", changefreq: "daily", priority: 0.8 },
  { path: "/prevention-match", changefreq: "monthly", priority: 0.7 },
  { path: "/partners", changefreq: "monthly", priority: 0.7 },
  { path: "/pep", changefreq: "monthly", priority: 0.7 },
  { path: "/swing", changefreq: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changefreq: "monthly", priority: 0.4 },
  { path: "/surveys", changefreq: "weekly", priority: 0.5 },
  { path: "/community", changefreq: "daily", priority: 0.5 },
  { path: "/self-care", changefreq: "weekly", priority: 0.5 },
  { path: "/install", changefreq: "monthly", priority: 0.4 },
  { path: "/whats-new", changefreq: "monthly", priority: 0.4 },
  { path: "/consultation", changefreq: "monthly", priority: 0.5 },
  { path: "/chemsex-safety", changefreq: "weekly", priority: 0.9 },
  { path: "/drug-combination-risk", changefreq: "weekly", priority: 0.9 },
  { path: "/ghb-overdose", changefreq: "monthly", priority: 0.8 },
  { path: "/meth-harm-reduction", changefreq: "monthly", priority: 0.8 },
  { path: "/hiv-self-test-guide", changefreq: "monthly", priority: 0.8 },
  { path: "/support-faq", changefreq: "monthly", priority: 0.4 },
];

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );
}

const LOCALES = ["th", "en"] as const;
const DEFAULT_LOCALE = "th";

/** Strip a leading /th or /en if present. */
function stripLocale(path: string): string {
  const m = path.match(/^\/(th|en)(\/|$)/);
  if (!m) return path;
  return path.slice(3) || "/";
}

function withLocale(path: string, locale: string): string {
  const p = stripLocale(path);
  if (p === "/") return `/${locale}`;
  return `/${locale}${p}`;
}

/**
 * Emit one <url> entry per locale for a SEO path. Each entry includes
 * xhtml:link alternates pointing to the locale-specific URLs so each
 * language has a truly distinct alternate.
 */
function seoUrlEntries(opts: {
  path: string;
  changefreq: string;
  priority: number;
  lastmod?: string;
}): string[] {
  const stripped = stripLocale(opts.path);
  const lastmod = opts.lastmod
    ? `\n    <lastmod>${escapeXml(opts.lastmod)}</lastmod>`
    : "";

  const alternates = LOCALES.map(
    (l) =>
      `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(
        BASE_URL + withLocale(stripped, l),
      )}" />`,
  ).join("");
  const xDefault = `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
    BASE_URL + withLocale(stripped, DEFAULT_LOCALE),
  )}" />`;

  return LOCALES.map((l) => {
    const loc = BASE_URL + withLocale(stripped, l);
    return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod}
    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority.toFixed(1)}</priority>${alternates}${xDefault}
  </url>`;
  });
}

/** Backwards-compat single-URL entry (no locale split). */
function urlEntry(opts: {
  path: string;
  changefreq: string;
  priority: number;
  lastmod?: string;
}): string {
  const loc = `${BASE_URL}${opts.path}`;
  const lastmod = opts.lastmod ? `\n    <lastmod>${escapeXml(opts.lastmod)}</lastmod>` : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod}
    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority.toFixed(1)}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const entries: string[] = [];

    // 1) Static routes — split into /th and /en variants
    for (const r of STATIC_ROUTES) entries.push(...seoUrlEntries(r));

    // 2) Substances → /substance/:slug
    const { data: substances } = await supabase
      .from("hr_substances")
      .select("slug, updated_at")
      .eq("is_active", true);

    for (const s of substances ?? []) {
      if (!s.slug) continue;
      entries.push(
        urlEntry({
          path: `/substance/${s.slug}`,
          changefreq: "monthly",
          priority: 0.7,
          lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
        }),
      );
    }

    // 3) Interactions → /interaction/:slugA-slugB (alphabetical)
    const { data: interactions } = await supabase
      .from("hr_substance_interactions")
      .select("substance_a_id, substance_b_id, updated_at");

    const subById = new Map((substances ?? []).map((s: any) => [s.id, s.slug] as const));
    // Need ids — refetch with id
    const { data: subsWithId } = await supabase
      .from("hr_substances")
      .select("id, slug")
      .eq("is_active", true);
    const slugById = new Map((subsWithId ?? []).map((s: any) => [s.id, s.slug] as const));

    const seenInteraction = new Set<string>();
    for (const ix of interactions ?? []) {
      const a = slugById.get(ix.substance_a_id);
      const b = slugById.get(ix.substance_b_id);
      if (!a || !b) continue;
      const [s1, s2] = [a, b].sort();
      const slug = `${s1}-${s2}`;
      if (seenInteraction.has(slug)) continue;
      seenInteraction.add(slug);
      entries.push(
        urlEntry({
          path: `/interaction/${slug}`,
          changefreq: "monthly",
          priority: 0.7,
          lastmod: ix.updated_at ? new Date(ix.updated_at).toISOString().slice(0, 10) : undefined,
        }),
      );
    }

    // 4) Published blog/info articles → /info/article/:slug (preferred) and /info/:id fallback
    const { data: articles } = await supabase
      .from("blog_articles")
      .select("id, slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(2000);

    for (const a of articles ?? []) {
      const lastmod = (a.updated_at || a.published_at)
        ? new Date(a.updated_at || a.published_at).toISOString().slice(0, 10)
        : undefined;
      const path = a.slug ? `/info/article/${a.slug}` : `/info/${a.id}`;
      entries.push(
        urlEntry({
          path,
          changefreq: "weekly",
          priority: 0.6,
          lastmod,
        }),
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[sitemap-xml] error", err);
    return new Response(`<!-- sitemap error: ${(err as Error).message} -->`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});

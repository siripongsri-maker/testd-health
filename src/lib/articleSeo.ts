/**
 * Article SEO helpers — Schema.org (Article + FAQPage + BreadcrumbList)
 * and OpenGraph/Twitter article metadata for /info/article/:slug pages.
 */

const BASE_URL = "https://testd.website";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/KT2ExYhzQvVnbWOZrapb2296DWu1/social-images/social-1770910470399-testD_logo.png";

export interface ArticleFaq {
  question: string;
  answer: string;
}

/** Strip markdown decorations so JSON-LD carries clean text. */
function plain(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract FAQ pairs from markdown content.
 * Matches `### question?` headings (optionally inside a FAQ section) followed by
 * their answer paragraphs. Works for both Thai and English articles.
 */
export function extractFaqsFromContent(content: string | null | undefined): ArticleFaq[] {
  if (!content) return [];
  const lines = content.split("\n");
  const faqs: ArticleFaq[] = [];

  let currentQuestion: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentQuestion) {
      const answer = plain(buffer.join(" "));
      if (answer.length >= 20) faqs.push({ question: currentQuestion, answer });
    }
    currentQuestion = null;
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = plain(heading[2]);
      flush();
      // Only "### ...?" style sub-headings are treated as questions
      if (level >= 3 && /[?？]$/.test(text)) currentQuestion = text;
      continue;
    }
    if (currentQuestion && line) buffer.push(line);
  }
  flush();

  return faqs.slice(0, 12);
}

/** Rough word/character count for the article body. */
function countWords(content: string): number {
  const stripped = plain(content);
  // Thai has no spaces — approximate by characters / 4 when few spaces exist.
  const spaced = stripped.split(/\s+/).filter(Boolean).length;
  return spaced > 30 ? spaced : Math.round(stripped.length / 4);
}

export function buildArticleJsonLd(opts: {
  title: string;
  description: string;
  canonicalPath: string;
  content?: string | null;
  coverUrl?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  categoryName?: string | null;
  language: "th" | "en";
}): Record<string, unknown> {
  const url = `${BASE_URL}${opts.canonicalPath}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title.slice(0, 110),
    description: opts.description,
    image: [opts.coverUrl || DEFAULT_OG_IMAGE],
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: opts.publishedAt || undefined,
    dateModified: opts.updatedAt || opts.publishedAt || undefined,
    author: {
      "@type": opts.authorName ? "Person" : "Organization",
      name: opts.authorName || "testD by SWING Foundation",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "testD by SWING Foundation",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
    },
    inLanguage: opts.language,
    isAccessibleForFree: true,
    ...(opts.categoryName ? { articleSection: opts.categoryName } : {}),
    ...(opts.content ? { wordCount: countWords(opts.content) } : {}),
  };
}

export function buildArticleBreadcrumbJsonLd(opts: {
  title: string;
  canonicalPath: string;
  categoryName?: string | null;
  language: "th" | "en";
}): Record<string, unknown> {
  const home = opts.language === "th" ? "หน้าแรก" : "Home";
  const info = opts.language === "th" ? "บทความสุขภาพ" : "Health Articles";
  const crumbs: { name: string; path: string }[] = [
    { name: home, path: "/" },
    { name: info, path: "/info" },
  ];
  if (opts.categoryName) crumbs.push({ name: opts.categoryName, path: "/info" });
  crumbs.push({ name: opts.title, path: opts.canonicalPath });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
}

export function buildArticleFaqJsonLd(faqs: ArticleFaq[]): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** OpenGraph/Twitter tags specific to articles (beyond the shared ones). */
export function buildArticleMeta(opts: {
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  categoryName?: string | null;
  readingMinutes?: number;
  language: "th" | "en";
}): { attr: "name" | "property"; key: string; content: string }[] {
  const meta: { attr: "name" | "property"; key: string; content: string }[] = [];
  if (opts.publishedAt)
    meta.push({ attr: "property", key: "article:published_time", content: opts.publishedAt });
  if (opts.updatedAt)
    meta.push({ attr: "property", key: "article:modified_time", content: opts.updatedAt });
  if (opts.authorName)
    meta.push({ attr: "property", key: "article:author", content: opts.authorName });
  if (opts.categoryName)
    meta.push({ attr: "property", key: "article:section", content: opts.categoryName });
  meta.push({ attr: "property", key: "og:site_name", content: "testD by SWING Foundation" });
  if (opts.readingMinutes) {
    meta.push({
      attr: "name",
      key: "twitter:label1",
      content: opts.language === "th" ? "เวลาอ่าน" : "Reading time",
    });
    meta.push({
      attr: "name",
      key: "twitter:data1",
      content:
        opts.language === "th"
          ? `${opts.readingMinutes} นาที`
          : `${opts.readingMinutes} min read`,
    });
  }
  return meta;
}

export function estimateReadingMinutes(content: string | null | undefined): number {
  if (!content) return 0;
  return Math.max(1, Math.round(countWords(content) / 200));
}

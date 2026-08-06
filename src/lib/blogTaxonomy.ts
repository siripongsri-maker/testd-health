import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/lib/seoLocalePrefix";

export interface BlogCategory {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  description_en: string | null;
  description_th: string | null;
  icon: string;
  cover_url: string | null;
  display_order: number;
}

export interface BlogArticleCard {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  excerpt_en: string | null;
  excerpt_th: string | null;
  cover_url: string | null;
  view_count: number;
  like_count: number;
  published_at: string | null;
  category_id: string | null;
  author_name: string | null;
}

export const ARTICLE_CARD_COLUMNS =
  "id, slug, title_en, title_th, excerpt_en, excerpt_th, cover_url, view_count, like_count, published_at, category_id, author_name";

/** Category gradient themes shared by the hub, category and search pages. */
export const CATEGORY_THEMES: Record<string, { bg: string; icon: string }> = {
  prep: { bg: "from-blue-500/20 to-cyan-500/20", icon: "from-blue-500 to-cyan-500" },
  pep: { bg: "from-emerald-500/20 to-teal-500/20", icon: "from-emerald-500 to-teal-500" },
  sti: { bg: "from-rose-500/20 to-pink-500/20", icon: "from-rose-500 to-pink-500" },
  "mental-health": { bg: "from-violet-500/20 to-purple-500/20", icon: "from-violet-500 to-purple-500" },
  "harm-reduction": { bg: "from-amber-500/20 to-orange-500/20", icon: "from-amber-500 to-orange-500" },
  lifestyle: { bg: "from-fuchsia-500/20 to-pink-500/20", icon: "from-fuchsia-500 to-pink-500" },
};

export function categoryTheme(slug: string) {
  return CATEGORY_THEMES[slug] ?? { bg: "from-primary/20 to-primary/5", icon: "from-primary to-primary" };
}

/** Keep internal links inside the current SEO locale prefix (/th or /en). */
export function localePath(path: string, language: string): string {
  const locale = (SUPPORTED_LOCALES as string[]).includes(language) ? language : DEFAULT_LOCALE;
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchCategories(): Promise<BlogCategory[]> {
  const { data } = await supabase
    .from("blog_categories")
    .select("*")
    .order("display_order");
  return (data ?? []) as BlogCategory[];
}

export async function fetchPublishedArticles(): Promise<BlogArticleCard[]> {
  const { data } = await supabase
    .from("blog_articles")
    .select(ARTICLE_CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data ?? []) as BlogArticleCard[];
}

/** Case-insensitive keyword match across bilingual title + excerpt. */
export function matchesKeyword(article: BlogArticleCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [article.title_th, article.title_en, article.excerpt_th, article.excerpt_en]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}

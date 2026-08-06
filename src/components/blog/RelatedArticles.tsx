import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { ARTICLE_CARD_COLUMNS, BlogArticleCard, localePath } from "@/lib/blogTaxonomy";
import { ArticleResultCard } from "@/components/blog/ArticleResultCard";

interface Props {
  categoryId: string | null;
  categorySlug?: string | null;
  currentArticleId: string;
}

/** Internal linking block: more articles from the same category. */
export function RelatedArticles({ categoryId, categorySlug, currentArticleId }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isTh = language === "th";
  const [items, setItems] = useState<BlogArticleCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let query = supabase
        .from("blog_articles")
        .select(ARTICLE_CARD_COLUMNS)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("view_count", { ascending: false })
        .limit(4);
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data } = await query;
      if (!cancelled) setItems((data ?? []) as BlogArticleCard[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, currentArticleId]);

  if (items.length === 0) return null;

  return (
    <section className="mt-8" aria-label={isTh ? "บทความที่เกี่ยวข้อง" : "Related articles"}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground">
          {isTh ? "บทความที่เกี่ยวข้อง" : "Related articles"}
        </h2>
        <button
          className="text-xs text-primary underline"
          onClick={() =>
            navigate(
              categorySlug
                ? localePath(`/info/category/${categorySlug}`, language)
                : localePath("/info/categories", language),
            )
          }
        >
          {isTh ? "ดูทั้งหมด" : "See all"}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <ArticleResultCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}

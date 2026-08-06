import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SEOHead } from "@/components/seo/SEOHead";
import { usePageLocale } from "@/components/seo/LocaleRouter";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Search, X } from "lucide-react";
import { ArticleResultCard } from "@/components/blog/ArticleResultCard";
import {
  BlogArticleCard,
  BlogCategory,
  fetchCategories,
  fetchPublishedArticles,
  localePath,
  matchesKeyword,
} from "@/lib/blogTaxonomy";
import { cn } from "@/lib/utils";

/** /info/search?q=&category= — keyword + category filtering with URL-synced state. */
export default function InfoSearch() {
  const { language } = useLanguage();
  const pageLocale = usePageLocale();
  const navigate = useNavigate();
  const isTh = language === "th";
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const categorySlug = params.get("category") ?? "";

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [articles, setArticles] = useState<BlogArticleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState(q);

  useEffect(() => {
    (async () => {
      const [cats, arts] = await Promise.all([fetchCategories(), fetchPublishedArticles()]);
      setCategories(cats);
      setArticles(arts);
      setLoading(false);
    })();
  }, []);

  // Debounced sync of the keyword into the URL so results are shareable.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (input) next.set("q", input);
      else next.delete("q");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const selected = categories.find((c) => c.slug === categorySlug) ?? null;

  const results = useMemo(
    () =>
      articles.filter(
        (a) =>
          matchesKeyword(a, q) && (!selected || a.category_id === selected.id),
      ),
    [articles, q, selected],
  );

  const categoryName = (id: string | null) => {
    const c = categories.find((x) => x.id === id);
    return c ? (isTh ? c.name_th : c.name_en) : null;
  };

  const setCategory = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setParams(next, { replace: true });
  };

  return (
    <>
      <SEOHead
        title={isTh ? "ค้นหาบทความสุขภาพ" : "Search health articles"}
        description={
          isTh
            ? "ค้นหาบทความเรื่อง HIV, PrEP, PEP, โรคติดต่อทางเพศสัมพันธ์ สุขภาพจิต และการลดอันตราย กรองตามหมวดหมู่และคีย์เวิร์ด"
            : "Search testD articles on HIV, PrEP, PEP, STIs, mental health and harm reduction. Filter by category and keyword."
        }
        canonicalPath={localePath("/info/search", pageLocale)}
        lang={pageLocale}
        robots="noindex, follow"
      />
      <PageContainer>
        <PageHeader
          title={isTh ? "ค้นหาบทความ" : "Search articles"}
          subtitle={isTh ? "กรองตามหมวดหมู่และคีย์เวิร์ด" : "Filter by category and keyword"}
        />

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTh ? "พิมพ์คำค้น เช่น PrEP, เอชไอวี" : "Type a keyword, e.g. PrEP, HIV"}
            className="h-12 pl-12 pr-10 text-base rounded-2xl glass"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              aria-label={isTh ? "ล้างคำค้น" : "Clear search"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          <button
            onClick={() => setCategory("")}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              !categorySlug ? "bg-primary text-primary-foreground" : "glass text-foreground",
            )}
          >
            {isTh ? "ทั้งหมด" : "All"}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug)}
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                categorySlug === c.slug ? "bg-primary text-primary-foreground" : "glass text-foreground",
              )}
            >
              {c.icon} {isTh ? c.name_th : c.name_en}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {isTh ? `พบ ${results.length} บทความ` : `${results.length} articles found`}
            </p>
            {results.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isTh ? "ไม่พบบทความที่ตรงกับคำค้น" : "No articles matched your search."}
                </p>
                <button
                  className="text-sm text-primary underline"
                  onClick={() => navigate(localePath("/info/categories", language))}
                >
                  {isTh ? "ดูหมวดหมู่ทั้งหมด" : "Browse all categories"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((a) => (
                  <ArticleResultCard
                    key={a.id}
                    article={a}
                    categoryLabel={categoryName(a.category_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}

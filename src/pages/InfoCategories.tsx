import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Search, ChevronRight } from "lucide-react";
import {
  BlogArticleCard,
  BlogCategory,
  categoryTheme,
  fetchCategories,
  fetchPublishedArticles,
  localePath,
} from "@/lib/blogTaxonomy";
import { cn } from "@/lib/utils";

/** /info/categories — hub listing every article category with counts. */
export default function InfoCategories() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isTh = language === "th";
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [articles, setArticles] = useState<BlogArticleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cats, arts] = await Promise.all([fetchCategories(), fetchPublishedArticles()]);
      setCategories(cats);
      setArticles(arts);
      setLoading(false);
    })();
  }, []);

  const countFor = (id: string) => articles.filter((a) => a.category_id === id).length;

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: isTh ? "หมวดหมู่บทความสุขภาพ" : "Health article categories",
      url: `https://testd.website${localePath("/info/categories", language)}`,
      hasPart: categories.map((c) => ({
        "@type": "CollectionPage",
        name: isTh ? c.name_th : c.name_en,
        url: `https://testd.website${localePath(`/info/category/${c.slug}`, language)}`,
      })),
    }),
    [categories, isTh, language],
  );

  return (
    <>
      <SEOHead
        title={isTh ? "หมวดหมู่บทความ | ความรู้ HIV, PrEP, PEP, STI" : "Article categories | HIV, PrEP, PEP, STI"}
        description={
          isTh
            ? "รวมหมวดหมู่บทความสุขภาพทางเพศและการลดอันตราย เลือกอ่านตามหัวข้อที่สนใจ พร้อมค้นหาบทความด้วยคีย์เวิร์ด"
            : "Browse every sexual health and harm reduction article category, or search articles by keyword."
        }
        canonicalPath={localePath("/info/categories", language)}
        lang={language}
        jsonLd={jsonLd}
      />
      <PageContainer>
        <PageHeader
          title={isTh ? "หมวดหมู่บทความ" : "Article categories"}
          subtitle={isTh ? "เลือกอ่านตามหัวข้อที่สนใจ" : "Browse knowledge by topic"}
        />

        <Button
          variant="outline"
          className="w-full mb-5 gap-2"
          onClick={() => navigate(localePath("/info/search", language))}
        >
          <Search className="h-4 w-4" />
          {isTh ? "ค้นหาบทความ" : "Search articles"}
        </Button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((c) => {
              const theme = categoryTheme(c.slug);
              const href = localePath(`/info/category/${c.slug}`, language);
              return (
                <a
                  key={c.id}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(href);
                  }}
                  className={cn(
                    "rounded-2xl p-4 glass hover:shadow-soft transition-all bg-gradient-to-br flex items-start gap-3",
                    theme.bg,
                  )}
                >
                  <span className="text-2xl leading-none">{c.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-foreground">{isTh ? c.name_th : c.name_en}</h2>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {isTh ? c.description_th : c.description_en}
                    </p>
                    <p className="text-[11px] text-primary mt-1.5 font-medium">
                      {countFor(c.id)} {isTh ? "บทความ" : "articles"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                </a>
              );
            })}
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}

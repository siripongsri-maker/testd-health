import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { ArticleResultCard } from "@/components/blog/ArticleResultCard";
import {
  BlogArticleCard,
  BlogCategory,
  categoryTheme,
  fetchCategories,
  fetchPublishedArticles,
  localePath,
} from "@/lib/blogTaxonomy";
import { cn } from "@/lib/utils";

/** /info/category/:slug — all published articles in one category. */
export default function InfoCategory() {
  const { slug = "" } = useParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isTh = language === "th";
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [articles, setArticles] = useState<BlogArticleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, arts] = await Promise.all([fetchCategories(), fetchPublishedArticles()]);
      setCategories(cats);
      setArticles(arts);
      setLoading(false);
    })();
  }, [slug]);

  const category = categories.find((c) => c.slug === slug) ?? null;
  const name = category ? (isTh ? category.name_th : category.name_en) : slug;
  const description = category ? (isTh ? category.description_th : category.description_en) : null;
  const list = category ? articles.filter((a) => a.category_id === category.id) : [];
  const others = categories.filter((c) => c.slug !== slug);
  const theme = categoryTheme(slug);

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description: description ?? undefined,
        url: `https://testd.website${localePath(`/info/category/${slug}`, language)}`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.slice(0, 20).map((a, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: isTh ? a.title_th : a.title_en,
            url: `https://testd.website${localePath(`/info/article/${a.slug}`, language)}`,
          })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: isTh ? "บทความ" : "Articles", item: `https://testd.website${localePath("/info", language)}` },
          { "@type": "ListItem", position: 2, name: isTh ? "หมวดหมู่" : "Categories", item: `https://testd.website${localePath("/info/categories", language)}` },
          { "@type": "ListItem", position: 3, name },
        ],
      },
    ],
    [list, name, description, slug, isTh, language],
  );

  return (
    <>
      <SEOHead
        title={isTh ? `${name} — บทความสุขภาพ` : `${name} — health articles`}
        description={
          description ||
          (isTh
            ? `รวมบทความหมวด ${name} จาก testD ความรู้สุขภาพทางเพศและการลดอันตรายที่เชื่อถือได้`
            : `All ${name} articles from testD — trusted sexual health and harm reduction knowledge.`)
        }
        canonicalPath={localePath(`/info/category/${slug}`, language)}
        lang={language}
        jsonLd={jsonLd}
      />
      <PageContainer>
        <button
          onClick={() => navigate(localePath("/info/categories", language))}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {isTh ? "ทุกหมวดหมู่" : "All categories"}
        </button>

        <header className={cn("rounded-2xl p-4 mb-5 glass bg-gradient-to-br", theme.bg)}>
          <div className="flex items-center gap-2">
            {category && <span className="text-2xl">{category.icon}</span>}
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          <p className="text-[11px] text-primary font-medium mt-2">
            {list.length} {isTh ? "บทความ" : "articles"}
          </p>
        </header>

        <Button
          variant="outline"
          className="w-full mb-5 gap-2"
          onClick={() =>
            navigate(localePath(`/info/search?category=${slug}`, language))
          }
        >
          <Search className="h-4 w-4" />
          {isTh ? `ค้นหาในหมวด ${name}` : `Search in ${name}`}
        </Button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {isTh ? "ยังไม่มีบทความในหมวดนี้" : "No articles in this category yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <ArticleResultCard key={a.id} article={a} />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <nav className="mt-8" aria-label={isTh ? "หมวดหมู่อื่น" : "Other categories"}>
            <h2 className="text-[12px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
              {isTh ? "หมวดหมู่อื่นที่เกี่ยวข้อง" : "Other categories"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {others.map((c) => {
                const href = localePath(`/info/category/${c.slug}`, language);
                return (
                  <a
                    key={c.id}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(href);
                    }}
                    className="rounded-full glass px-3 py-1.5 text-xs text-foreground"
                  >
                    {c.icon} {isTh ? c.name_th : c.name_en}
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}

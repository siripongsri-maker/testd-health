import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Search, BookOpen, Eye, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
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

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  excerpt_en: string | null;
  excerpt_th: string | null;
  cover_url: string | null;
  view_count: number;
  published_at: string | null;
  category_id: string | null;
}

// Category color themes
const CATEGORY_THEMES: Record<string, { bg: string; icon: string }> = {
  'prep': { bg: 'from-blue-500/20 to-cyan-500/20', icon: 'from-blue-500 to-cyan-500' },
  'pep': { bg: 'from-emerald-500/20 to-teal-500/20', icon: 'from-emerald-500 to-teal-500' },
  'sti': { bg: 'from-rose-500/20 to-pink-500/20', icon: 'from-rose-500 to-pink-500' },
  'mental-health': { bg: 'from-violet-500/20 to-purple-500/20', icon: 'from-violet-500 to-purple-500' },
  'harm-reduction': { bg: 'from-amber-500/20 to-orange-500/20', icon: 'from-amber-500 to-orange-500' },
  'lifestyle': { bg: 'from-fuchsia-500/20 to-pink-500/20', icon: 'from-fuchsia-500 to-pink-500' },
};

export default function Info() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load categories and articles in parallel
      const [categoriesRes, articlesRes] = await Promise.all([
        supabase
          .from('blog_categories')
          .select('*')
          .order('display_order'),
        supabase
          .from('blog_articles')
          .select('id, slug, title_en, title_th, excerpt_en, excerpt_th, cover_url, view_count, published_at, category_id')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (articlesRes.data) setArticles(articlesRes.data);
    } catch (error) {
      console.error('Error loading blog data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = 
      article.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.title_th.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.excerpt_en?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (article.excerpt_th?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || article.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getArticlesByCategory = (categoryId: string) => 
    articles.filter(a => a.category_id === categoryId).slice(0, 3);

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer>
        <PageHeader title={t('info.title')} subtitle={t('info.subtitle')} />
        
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t('info.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 text-base rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
              !selectedCategory 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {language === 'th' ? 'ทั้งหมด' : 'All'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{cat.icon}</span>
              <span>{language === 'th' ? cat.name_th : cat.name_en}</span>
            </button>
          ))}
        </div>

        {/* If searching or category selected, show filtered articles */}
        {(searchQuery || selectedCategory) ? (
          <div className="space-y-3">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">{t('info.noResults')}</p>
              </div>
            ) : (
              filteredArticles.map((article, index) => (
                <button
                  key={article.id}
                  onClick={() => navigate(`/info/article/${article.slug}`)}
                  className="w-full text-left rounded-2xl bg-card border border-border/50 p-4 hover:bg-muted/30 transition-all animate-fade-in flex gap-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {article.cover_url ? (
                    <img 
                      src={article.cover_url} 
                      alt="" 
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {language === 'th' ? article.title_th : article.title_en}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {language === 'th' ? article.excerpt_th : article.excerpt_en}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>{article.view_count.toLocaleString()}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Category Cards */
          <div className="space-y-6">
            {categories.map((category, index) => {
              const theme = CATEGORY_THEMES[category.slug] || CATEGORY_THEMES['lifestyle'];
              const categoryArticles = getArticlesByCategory(category.id);
              
              return (
                <div 
                  key={category.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-full rounded-2xl p-5 mb-3 text-left transition-all hover:scale-[1.02]",
                      "bg-gradient-to-br border border-border/50",
                      theme.bg
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg",
                          theme.icon
                        )}>
                          {category.icon}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">
                            {language === 'th' ? category.name_th : category.name_en}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {language === 'th' ? category.description_th : category.description_en}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Category Articles Preview */}
                  {categoryArticles.length > 0 && (
                    <div className="space-y-2 pl-2">
                      {categoryArticles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => navigate(`/info/article/${article.slug}`)}
                          className="w-full text-left rounded-xl bg-card/50 border border-border/30 p-3 hover:bg-muted/30 transition-all flex items-center gap-3"
                        >
                          {article.cover_url ? (
                            <img 
                              src={article.cover_url} 
                              alt="" 
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm line-clamp-1">
                              {language === 'th' ? article.title_th : article.title_en}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Eye className="h-3 w-3" />
                              <span>{article.view_count.toLocaleString()}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {categories.length === 0 && articles.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">
              {language === 'th' ? 'ยังไม่มีบทความ' : 'No articles yet'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {language === 'th' ? 'เร็วๆ นี้' : 'Coming soon'}
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
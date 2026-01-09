import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, Calendar, User, Loader2, BookOpen } from "lucide-react";
import { format } from "date-fns";

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_th: string;
  content_en: string | null;
  content_th: string | null;
  excerpt_en: string | null;
  excerpt_th: string | null;
  cover_url: string | null;
  author_name: string | null;
  view_count: number;
  published_at: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name_en: string;
  name_th: string;
  icon: string;
}

export default function InfoArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadArticle();
    }
  }, [slug]);

  const loadArticle = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      // Fetch article
      const { data: articleData, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      
      if (articleData) {
        setArticle(articleData);
        
        // Increment view count
        await supabase
          .from('blog_articles')
          .update({ view_count: articleData.view_count + 1 })
          .eq('id', articleData.id);

        // Fetch category if exists
        if (articleData.category_id) {
          const { data: categoryData } = await supabase
            .from('blog_categories')
            .select('id, name_en, name_th, icon')
            .eq('id', articleData.category_id)
            .maybeSingle();
          
          if (categoryData) setCategory(categoryData);
        }
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!article) {
    return (
      <>
        <PageContainer>
          <div className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">{t('info.noResults')}</p>
            <Button variant="link" onClick={() => navigate("/info")} className="mt-2">
              {t('common.back')}
            </Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  const title = language === 'th' ? article.title_th : article.title_en;
  const content = language === 'th' ? article.content_th : article.content_en;

  return (
    <>
      <PageContainer className="pb-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/info")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {category && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <span>{category.icon}</span>
              <span>{language === 'th' ? category.name_th : category.name_en}</span>
            </div>
          )}
        </div>

        {/* Cover Image */}
        {article.cover_url && (
          <div className="mb-6 -mx-4 sm:mx-0">
            <img
              src={article.cover_url}
              alt={title}
              className="w-full h-48 sm:h-64 object-cover sm:rounded-2xl"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
          {title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
          {article.author_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{article.author_name}</span>
            </div>
          )}
          {article.published_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(article.published_at), 'MMM d, yyyy')}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{article.view_count.toLocaleString()} {language === 'th' ? 'ครั้ง' : 'views'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {content ? (
              content.split("\n\n").map((paragraph, index) => {
                // Handle bullet points
                if (paragraph.includes("\n•") || paragraph.startsWith("•")) {
                  const lines = paragraph.split("\n");
                  return (
                    <div key={index} className="my-4">
                      {lines.map((line, i) => {
                        if (line.startsWith("•")) {
                          return (
                            <div key={i} className="flex items-start gap-2 text-foreground my-1">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{line.replace("• ", "")}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="font-semibold text-foreground mb-2">{line}</p>;
                      })}
                    </div>
                  );
                }
                
                // Handle headings (lines ending with :)
                if (paragraph.endsWith(":") || paragraph.match(/^[A-Z].*:$/m)) {
                  return (
                    <h3 key={index} className="text-lg font-bold text-foreground mt-6 mb-3">
                      {paragraph}
                    </h3>
                  );
                }

                return (
                  <p key={index} className="text-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                );
              })
            ) : (
              <p className="text-muted-foreground italic">
                {language === 'th' ? 'ไม่มีเนื้อหา' : 'No content available'}
              </p>
            )}
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
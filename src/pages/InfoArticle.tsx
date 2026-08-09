import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, Calendar, User, Loader2, BookOpen, Youtube, Share2, Check, Link, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArticleLikeButton } from "@/components/ArticleLikeButton";
import { ArticleComments } from "@/components/ArticleComments";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { SEOHead } from "@/components/seo/SEOHead";
import { usePageLocale } from "@/components/seo/LocaleRouter";
import { alternateLanguagePathsFor, type Locale } from "@/lib/seoLocalePrefix";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import {
  buildArticleJsonLd,
  buildArticleBreadcrumbJsonLd,
  buildArticleFaqJsonLd,
  buildArticleMeta,
  extractFaqsFromContent,
  estimateReadingMinutes,
} from "@/lib/articleSeo";

// Helper to extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Security: Validate image URLs to prevent XSS via javascript: or malicious data: URLs
const isSafeImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Block javascript: protocol
  if (trimmedUrl.startsWith('javascript:')) return false;
  
  // Block vbscript: protocol
  if (trimmedUrl.startsWith('vbscript:')) return false;
  
  // Allow http/https URLs
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) return true;
  
  // Allow safe data: URLs (only image types, no script-capable formats)
  if (trimmedUrl.startsWith('data:')) {
    // Only allow actual image MIME types, block text/html, image/svg+xml (can contain scripts)
    const safeDataPatterns = [
      /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico)/i
    ];
    return safeDataPatterns.some(pattern => pattern.test(trimmedUrl));
  }
  
  // Allow relative URLs starting with /
  if (trimmedUrl.startsWith('/')) return true;
  
  // Block everything else (including bare data:text/html, etc.)
  return false;
};

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
  author_id: string | null;
  author_name: string | null;
  view_count: number;
  like_count: number;
  published_at: string | null;
  updated_at?: string | null;
  category_id: string | null;
  video_url: string | null;
}

interface Category {
  id: string;
  name_en: string;
  name_th: string;
  icon: string;
  slug: string;
}

// Base URL for sharing
const SHARE_BASE_URL = "https://testd-test.lovable.app";

export default function InfoArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const pageLocale = usePageLocale();
  const { trackArticleRead } = useQuestProgress();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const questTrackedRef = useRef(false);

  // Track article read quest after 15 seconds on page
  useEffect(() => {
    if (article && !questTrackedRef.current) {
      const timer = setTimeout(() => {
        trackArticleRead(language);
        questTrackedRef.current = true;
      }, 15000); // 15 seconds
      
      return () => clearTimeout(timer);
    }
  }, [article, language, trackArticleRead]);

  const handleShare = async () => {
    if (!article) return;
    
    const shareUrl = `${SHARE_BASE_URL}/info/article/${article.slug}`;
    const shareTitle = language === 'th' ? article.title_th : article.title_en;
    
    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: language === 'th' ? article.excerpt_th : article.excerpt_en,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to copy
      }
    }
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(language === 'th' ? 'คัดลอกลิงก์แล้ว!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(language === 'th' ? 'ไม่สามารถคัดลอกได้' : 'Failed to copy');
    }
  };

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
        setArticle(articleData as Article);
        
        // Increment view count (atomic, deduplicated per session)
        const viewKey = `article_viewed_${articleData.id}`;
        if (!sessionStorage.getItem(viewKey)) {
          sessionStorage.setItem(viewKey, '1');
          await supabase.rpc('increment_article_view', { p_article_id: articleData.id });
          setArticle(prev => prev ? { ...prev, view_count: prev.view_count + 1 } : prev);
        }

        // Fetch category if exists
        if (articleData.category_id) {
          const { data: categoryData } = await supabase
            .from('blog_categories')
            .select('id, name_en, name_th, icon, slug')
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

  // SEO locale follows the URL (/th or /en), never the user's UI preference —
  // otherwise the same URL emits different canonicals per visitor.
  const hasTh = !!(article.title_th && article.content_th);
  const hasEn = !!(article.title_en && article.content_en);
  const availableLocales: Locale[] = [
    ...(hasTh ? (['th'] as Locale[]) : []),
    ...(hasEn ? (['en'] as Locale[]) : []),
  ];
  // If this locale has no translation, canonicalise to the one that exists
  // instead of publishing a duplicate of the other language.
  const seoLocale: Locale =
    availableLocales.includes(pageLocale)
      ? pageLocale
      : (availableLocales[0] ?? 'th');

  const title = language === 'th' ? article.title_th : article.title_en;
  const content = language === 'th' ? article.content_th : article.content_en;
  const excerpt = (language === 'th' ? article.excerpt_th : article.excerpt_en) || '';
  const seoTitle = title.length > 57 ? `${title.slice(0, 57)}…` : title;
  const seoDesc = excerpt
    ? (excerpt.length > 157 ? `${excerpt.slice(0, 157)}…` : excerpt)
    : (language === 'th'
        ? 'อ่านบทความสุขภาพจาก testD โดยมูลนิธิ SWING — ข้อมูลที่เชื่อถือได้ เป็นความลับ'
        : 'Read trusted, confidential health articles from testD by SWING Foundation.');
  const canonicalPath = `/info/article/${article.slug}`;
  const lang: Locale = seoLocale;
  const categoryName = category ? (lang === 'th' ? category.name_th : category.name_en) : null;
  const faqs = extractFaqsFromContent(content);
  const readingMinutes = estimateReadingMinutes(content);

  const jsonLdBlocks: Record<string, unknown>[] = [
    buildArticleJsonLd({
      title,
      description: seoDesc,
      canonicalPath,
      content,
      coverUrl: article.cover_url,
      authorName: article.author_name,
      publishedAt: article.published_at,
      updatedAt: article.updated_at ?? null,
      categoryName,
      language: lang,
    }),
    buildArticleBreadcrumbJsonLd({ title, canonicalPath, categoryName, language: lang }),
  ];
  const faqJsonLd = buildArticleFaqJsonLd(faqs);
  if (faqJsonLd) jsonLdBlocks.push(faqJsonLd);

  const extraMeta = buildArticleMeta({
    authorName: article.author_name,
    publishedAt: article.published_at,
    updatedAt: article.updated_at ?? null,
    categoryName,
    readingMinutes,
    language: lang,
  });

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonicalPath={canonicalPath}
        alternateLanguages={alternateLanguagePathsFor(canonicalPath, availableLocales)}
        ogImage={article.cover_url || undefined}
        ogImageAlt={seoTitle}
        ogType="article"
        lang={lang}
        jsonLd={jsonLdBlocks}
        extraMeta={extraMeta}
      />

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

        {/* Share URL Card */}
        <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <Link className="h-4 w-4" />
            <span>{language === 'th' ? 'ลิงก์สำหรับแชร์' : 'Shareable Link'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-muted-foreground truncate font-mono">
              {SHARE_BASE_URL}/info/article/{article.slug}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  {language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  {language === 'th' ? 'แชร์' : 'Share'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Like Button */}
        <div className="mb-6">
          <ArticleLikeButton 
            articleId={article.id}
            authorId={article.author_id}
            initialLikeCount={article.like_count || 0}
          />
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
          {content ? (
            <ArticleMarkdown content={content} />
          ) : (
            <p className="text-muted-foreground italic">
              {language === 'th' ? 'ไม่มีเนื้อหา' : 'No content available'}
            </p>
          )}
        </div>


        {/* YouTube Video */}
        {article.video_url && extractYouTubeVideoId(article.video_url) && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Youtube className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium">
                {language === 'th' ? 'วิดีโอประกอบ' : 'Featured Video'}
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border shadow-card">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeVideoId(article.video_url)}?autoplay=1&mute=1`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        )}

        <RelatedArticles
          categoryId={article.category_id}
          categorySlug={category?.slug ?? null}
          currentArticleId={article.id}
        />

        {/* Comments Section */}
        <ArticleComments articleId={article.id} />
      </PageContainer>
      <BottomNav />
    </>
  );
}

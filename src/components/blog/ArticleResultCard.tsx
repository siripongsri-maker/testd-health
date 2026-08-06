import { useNavigate } from "react-router-dom";
import { Eye, Heart, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { BlogArticleCard, localePath } from "@/lib/blogTaxonomy";

interface Props {
  article: BlogArticleCard;
  categoryLabel?: string | null;
}

/** Compact, link-friendly article card reused by the category and search pages. */
export function ArticleResultCard({ article, categoryLabel }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isTh = language === "th";
  const title = isTh ? article.title_th : article.title_en;
  const excerpt = isTh ? article.excerpt_th : article.excerpt_en;
  const href = localePath(`/info/article/${article.slug}`, language);

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      className="flex gap-3 rounded-2xl glass p-3 hover:shadow-soft transition-all text-left"
    >
      {article.cover_url ? (
        <img
          src={article.cover_url}
          alt={title}
          loading="lazy"
          className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {categoryLabel && (
          <span className="text-[11px] font-medium text-primary">{categoryLabel}</span>
        )}
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{title}</h3>
        {excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{excerpt}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {article.view_count}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {article.like_count}
          </span>
        </div>
      </div>
    </a>
  );
}

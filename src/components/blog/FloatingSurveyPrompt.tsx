import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { surveyHref, type RelatedSurvey } from "@/hooks/useRelatedSurvey";

const DISMISS_PREFIX = "survey-prompt-dismissed-";
const DISMISS_DAYS = 7;

function isDismissed(surveyId: string) {
  try {
    const raw = localStorage.getItem(`${DISMISS_PREFIX}${surveyId}`);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Dismissible floating invitation shown once the reader is deep into the article. */
export function FloatingSurveyPrompt({ survey }: { survey: RelatedSurvey }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const th = language === "th";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDismissed(survey.id)) return;
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const ratio = scrolled / Math.max(document.body.scrollHeight, 1);
      if (ratio > 0.45) {
        setVisible(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [survey.id]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`${DISMISS_PREFIX}${survey.id}`, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const go = () => {
    const href = surveyHref(survey);
    if (href.startsWith("http")) window.open(href, "_blank", "noopener");
    else navigate(href);
  };

  return (
    <div className="fixed bottom-20 right-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] animate-fade-in sm:bottom-6 sm:right-6">
      <div className="relative rounded-2xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label={th ? "ปิด" : "Dismiss"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary">
              {th ? "สนใจเรื่องนี้ใช่ไหม" : "Interested in this topic?"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">
              {th ? survey.title_th : survey.title_en}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={go} className="h-8">
                {th ? "ทำแบบประเมิน" : "Take survey"}
              </Button>
              {survey.xp_reward > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-xp">
                  <Sparkles className="h-3 w-3" />+{survey.xp_reward} XP
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

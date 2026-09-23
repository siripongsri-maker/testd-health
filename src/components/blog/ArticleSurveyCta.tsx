import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { surveyHref, type RelatedSurvey } from "@/hooks/useRelatedSurvey";

export function ArticleSurveyCta({ survey }: { survey: RelatedSurvey }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const th = language === "th";
  const href = surveyHref(survey);

  const go = () => {
    if (href.startsWith("http")) window.open(href, "_blank", "noopener");
    else navigate(href);
  };

  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {th ? "อ่านจบแล้ว ลองทำแบบประเมินต่อ" : "Next step: take the survey"}
          </p>
          <h3 className="mt-1 text-base font-bold text-foreground">
            {th ? survey.title_th : survey.title_en}
          </h3>
          {(th ? survey.description_th : survey.description_en) && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {th ? survey.description_th : survey.description_en}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={go} className="gap-2">
              {th ? "ทำแบบประเมิน" : "Start survey"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {survey.xp_reward > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp/15 px-3 py-1 text-xs font-semibold text-xp">
                <Sparkles className="h-3.5 w-3.5" />+{survey.xp_reward} XP
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

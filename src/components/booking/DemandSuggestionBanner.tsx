import { Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import type { DayGuidance } from '@/lib/forecast/publicDemand';

interface Props {
  guidance: DayGuidance;
  loading?: boolean;
}

/**
 * Friendly demand-guidance banner shown above the time-slot picker.
 * Tone: supportive, non-judgmental.
 */
export function DemandSuggestionBanner({ guidance, loading }: Props) {
  const { language } = useLanguage();
  const isTh = language === 'th';

  if (loading) {
    return (
      <Card className="p-3 rounded-2xl border-primary/15 bg-primary/[0.04] animate-pulse">
        <div className="h-3 w-2/3 rounded bg-muted/60 mb-2" />
        <div className="h-2.5 w-3/4 rounded bg-muted/40" />
      </Card>
    );
  }

  return (
    <Card className="p-3.5 rounded-2xl border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02]">
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
            {isTh ? guidance.bannerHeadline_th : guidance.bannerHeadline_en}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {isTh ? guidance.bannerSub_th : guidance.bannerSub_en}
          </p>
          {guidance.recommendedSlots.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {isTh ? 'แนะนำ' : 'Recommended'}
              </span>
              {guidance.recommendedSlots.map((time) => (
                <span
                  key={time}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {time}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

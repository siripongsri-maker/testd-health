import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Driver } from '@/lib/forecast/forecastEngine';

interface Props {
  language: 'th' | 'en';
  scope: 'daily' | 'weekly' | 'monthly';
  context: {
    target_date?: string;
    forecast_arrivals?: number;
    forecast_completed?: number;
    peak_hours?: { start: number; end: number };
    confidence?: 'low' | 'medium' | 'high';
    pct_vs_previous?: number | null;
    pct_vs_baseline?: number | null;
    peak_day?: { date: string; n: number } | null;
    drivers: Driver[];
    branch_name?: string | null;
  };
  /** key to re-trigger fetch when scope/context change */
  triggerKey: string;
}

export function NarrativeCard({ language, scope, context, triggerKey }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNarrative(null);

    supabase.functions
      .invoke('forecast-narrative', {
        body: {
          language,
          scope,
          context: {
            ...context,
            drivers: context.drivers.map(d => ({
              label_th: d.label_th,
              label_en: d.label_en,
              effect: d.effect,
            })),
          },
        },
      })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError) {
          setError(language === 'th' ? 'ไม่สามารถสร้างคำอธิบายอัตโนมัติได้' : 'AI narrative unavailable');
        } else if (data?.error === 'credits_required') {
          setError(language === 'th' ? 'เครดิต AI ของ workspace หมด' : 'AI credits exhausted');
        } else if (data?.error === 'rate_limited') {
          setError(language === 'th' ? 'AI ถูกจำกัดอัตรา ลองใหม่ภายหลัง' : 'AI rate-limited');
        } else {
          setNarrative(data?.narrative ?? null);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-bold tracking-wide uppercase text-primary">
          {language === 'th' ? 'AI Insight' : 'AI Insight'}
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {language === 'th' ? 'กำลังสร้างคำอธิบาย...' : 'Generating narrative...'}
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : narrative ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{narrative}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {language === 'th' ? 'ไม่มีคำอธิบาย' : 'No narrative available'}
        </p>
      )}
    </Card>
  );
}

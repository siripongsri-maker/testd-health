import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DailyForecast } from '@/lib/forecast/forecastEngine';

interface Props {
  forecasts: DailyForecast[];
  language: 'th' | 'en';
}

const DOW_TH = ['', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DOW_EN = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CONF_LABEL = {
  th: { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' },
  en: { low: 'Low', medium: 'Med', high: 'High' },
};
const CONF_COLOR = {
  low: 'text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/30',
  medium: 'text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-950/30',
  high: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30',
};

export function DailyForecastList({ forecasts, language }: Props) {
  const dowLabels = language === 'th' ? DOW_TH : DOW_EN;
  const max = Math.max(1, ...forecasts.map(f => f.forecast_arrivals_high));

  return (
    <Card className="p-3">
      <p className="text-xs font-semibold mb-3">
        {language === 'th' ? `Forecast รายวัน (${forecasts.length} วัน)` : `Daily Forecast (${forecasts.length} days)`}
      </p>
      <div className="space-y-1.5">
        {forecasts.map((f) => {
          const d = new Date(f.date + 'T00:00:00');
          const day = d.getDate();
          const month = d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short' });
          const widthPct = (f.forecast_arrivals / max) * 100;
          const lowPct = (f.forecast_arrivals_low / max) * 100;
          const highPct = (f.forecast_arrivals_high / max) * 100;

          return (
            <div
              key={f.date}
              className={cn(
                'rounded-lg p-2 border transition-all',
                f.is_today ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-card'
              )}
            >
              <div className="flex items-center gap-2">
                {/* Date column */}
                <div className="w-14 shrink-0">
                  <p className="text-xs font-semibold leading-tight">{dowLabels[f.dow]} {day}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{month}</p>
                </div>

                {/* Bar with confidence band */}
                <div className="flex-1 relative h-6 bg-muted/50 rounded overflow-hidden">
                  {/* Confidence band (low to high) */}
                  <div
                    className="absolute top-0 bottom-0 bg-primary/20"
                    style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
                  />
                  {/* Forecast value */}
                  <div
                    className={cn(
                      'absolute top-0 bottom-0 rounded-l',
                      f.is_holiday ? 'bg-rose-400/60' : 'bg-primary'
                    )}
                    style={{ width: `${widthPct}%`, minWidth: f.forecast_arrivals > 0 ? '3px' : '0' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-1.5">
                    <span className="text-[10px] font-bold text-foreground/80 tabular-nums">
                      {f.forecast_arrivals}
                    </span>
                  </div>
                </div>

                {/* Numbers */}
                <div className="w-16 shrink-0 text-right">
                  <p className="text-xs font-bold tabular-nums leading-tight">{f.forecast_arrivals}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight tabular-nums">
                    ✓ {f.forecast_completed}
                  </p>
                </div>

                {/* Peak hours */}
                <div className="w-14 shrink-0 text-right">
                  <p className="text-[10px] font-mono leading-tight">
                    {String(f.peak_hours.start).padStart(2, '0')}-{String(f.peak_hours.end).padStart(2, '0')}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    {language === 'th' ? 'พีค' : 'peak'}
                  </p>
                </div>

                {/* Confidence */}
                <div
                  className={cn(
                    'w-10 shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-semibold uppercase',
                    CONF_COLOR[f.confidence]
                  )}
                  title={language === 'th' ? `ความมั่นใจ: ${CONF_LABEL.th[f.confidence]}` : `Confidence: ${CONF_LABEL.en[f.confidence]}`}
                >
                  {CONF_LABEL[language][f.confidence]}
                </div>
              </div>

              {/* Top 2 drivers inline */}
              {(f.is_holiday || f.drivers.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-1.5 pl-16">
                  {f.is_holiday && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                      🏖 {language === 'th' ? f.is_holiday.name_th : f.is_holiday.name_en}
                    </span>
                  )}
                  {f.drivers.slice(0, 2).map((d) => (
                    <span
                      key={d.key}
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded',
                        d.effect === 'up' && 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
                        d.effect === 'down' && 'bg-rose-100/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
                        d.effect === 'neutral' && 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {d.effect === 'up' ? '↑' : d.effect === 'down' ? '↓' : '·'}{' '}
                      {language === 'th' ? d.label_th : d.label_en}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

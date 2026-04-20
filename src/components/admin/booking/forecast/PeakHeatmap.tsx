import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HourlyBaselineRow, DailyForecast } from '@/lib/forecast/forecastEngine';

interface Props {
  hourly: HourlyBaselineRow[];
  forecasts: DailyForecast[]; // for marking today's peak
  language: 'th' | 'en';
}

const DOW_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DOW_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8..18

export function PeakHeatmap({ hourly, language }: Props) {
  const labels = language === 'th' ? DOW_TH : DOW_EN;

  // Build a map dow -> hour -> n
  const grid = new Map<number, Map<number, number>>();
  for (const row of hourly) {
    const inner = grid.get(row.dow) ?? new Map<number, number>();
    inner.set(row.hour, (inner.get(row.hour) ?? 0) + row.n);
    grid.set(row.dow, inner);
  }

  let max = 1;
  grid.forEach(m => m.forEach(v => { if (v > max) max = v; }));

  function intensity(n: number) {
    if (n === 0) return 0;
    return Math.min(1, Math.max(0.1, n / max));
  }

  return (
    <Card className="p-3">
      <p className="text-xs font-semibold mb-2">
        {language === 'th' ? 'Peak Heatmap (วัน × ชั่วโมง — 60 วันล่าสุด)' : 'Peak Heatmap (Day × Hour — last 60 days)'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="w-8" />
              {HOURS.map(h => (
                <th key={h} className="font-mono font-normal text-muted-foreground">
                  {String(h).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((dow, i) => (
              <tr key={dow}>
                <td className="text-right pr-2 text-muted-foreground font-medium">{labels[i]}</td>
                {HOURS.map(h => {
                  const n = grid.get(dow)?.get(h) ?? 0;
                  const op = intensity(n);
                  return (
                    <td
                      key={h}
                      className={cn(
                        'h-6 rounded text-center font-mono',
                        op === 0 ? 'bg-muted/30 text-muted-foreground/40' : 'text-foreground'
                      )}
                      style={op > 0 ? { backgroundColor: `hsl(var(--primary) / ${op * 0.7 + 0.1})` } : undefined}
                      title={`${labels[i]} ${h}:00 — ${n}`}
                    >
                      {n > 0 ? n : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

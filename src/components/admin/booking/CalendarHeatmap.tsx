import { Card } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface DateBucket { date: string; n: number; }

interface Props {
  data: DateBucket[];
  language: string;
}

const MONTH_LABELS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_LABELS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DOW_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface MonthGrid {
  year: number;
  month: number; // 0-11
  weeks: (DateBucket | null)[][]; // 6 weeks × 7 days
  total: number;
}

function buildMonths(data: DateBucket[]): MonthGrid[] {
  if (data.length === 0) return [];
  const map = new Map<string, number>();
  data.forEach(d => map.set(d.date, d.n));

  // Determine month range from data
  const dates = data.map(d => new Date(d.date + 'T00:00:00'));
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));

  const months: MonthGrid[] = [];
  const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
  const end = new Date(max.getFullYear(), max.getMonth(), 1);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // ISO weekday: Mon=1..Sun=7 -> column index 0..6
    const startCol = (firstDay.getDay() + 6) % 7;

    const cells: (DateBucket | null)[] = [];
    for (let i = 0; i < startCol; i++) cells.push(null);
    let total = 0;
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const n = map.get(dateStr) || 0;
      total += n;
      cells.push({ date: dateStr, n });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (DateBucket | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    months.push({ year, month, weeks, total });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function CalendarHeatmap({ data, language }: Props) {
  const months = useMemo(() => buildMonths(data), [data]);
  const maxN = useMemo(() => Math.max(1, ...data.map(d => d.n)), [data]);
  const monthLabels = language === 'th' ? MONTH_LABELS_TH : MONTH_LABELS_EN;
  const dowLabels = language === 'th' ? DOW_LABELS_TH : DOW_LABELS_EN;
  const todayStr = new Date().toISOString().slice(0, 10);

  if (months.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {language === 'th' ? 'ปฏิทินจำนวนการจอง (วันที่นัด)' : 'Bookings Calendar (appointment date)'}
        </p>
        <p className="text-xs text-muted-foreground text-center py-4">–</p>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-xs font-semibold flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {language === 'th' ? 'ปฏิทินจำนวนการจอง (วันที่นัด)' : 'Bookings Calendar (appointment date)'}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{language === 'th' ? 'น้อย' : 'Less'}</span>
          {[0.15, 0.35, 0.6, 0.85, 1].map((op, i) => (
            <div key={i} className="h-2.5 w-2.5 rounded-sm bg-primary" style={{ opacity: op }} />
          ))}
          <span>{language === 'th' ? 'มาก' : 'More'}</span>
        </div>
      </div>

      <div className={cn('grid gap-3', months.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
        {months.map(m => (
          <div key={`${m.year}-${m.month}`} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold">
                {monthLabels[m.month]} {m.year}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {m.total} {language === 'th' ? 'นัด' : 'appts'}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {dowLabels.map(d => (
                <div key={d} className="text-[9px] text-muted-foreground text-center font-medium">
                  {d}
                </div>
              ))}
            </div>

            <div className="space-y-0.5">
              {m.weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0.5">
                  {week.map((cell, ci) => {
                    if (!cell) return <div key={ci} className="aspect-square" />;
                    const intensity = cell.n === 0 ? 0 : 0.15 + (cell.n / maxN) * 0.85;
                    const isToday = cell.date === todayStr;
                    const day = parseInt(cell.date.slice(-2), 10);
                    return (
                      <div
                        key={ci}
                        className={cn(
                          'aspect-square rounded-sm flex flex-col items-center justify-center relative border',
                          cell.n > 0 ? 'border-transparent' : 'border-border/50 bg-muted/30',
                          isToday && 'ring-1 ring-primary'
                        )}
                        style={cell.n > 0 ? { backgroundColor: `hsl(var(--primary) / ${intensity})` } : undefined}
                        title={`${cell.date} — ${cell.n} ${language === 'th' ? 'นัด' : 'appts'}`}
                      >
                        <span
                          className={cn(
                            'text-[8px] leading-none opacity-60',
                            cell.n > 0 && intensity > 0.5 ? 'text-primary-foreground' : 'text-foreground'
                          )}
                        >
                          {day}
                        </span>
                        {cell.n > 0 && (
                          <span
                            className={cn(
                              'text-[10px] font-bold leading-none mt-0.5',
                              intensity > 0.5 ? 'text-primary-foreground' : 'text-foreground'
                            )}
                          >
                            {cell.n}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

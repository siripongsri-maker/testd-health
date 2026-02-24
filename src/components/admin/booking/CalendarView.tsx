import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DensityDay } from './types';

interface Props {
  year: number;
  month: number; // 0-indexed
  density: DensityDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function CalendarView({ year, month, density, selectedDate, onSelectDate }: Props) {
  const { language } = useLanguage();

  const densityMap = useMemo(() => {
    const map: Record<string, DensityDay> = {};
    density.forEach(d => { map[d.appointment_date] = d; });
    return map;
  }, [density]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const result: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      result.push(new Date(year, month, d));
    }
    return result;
  }, [year, month]);

  const dayNames = language === 'th'
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthNames = language === 'th'
    ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        {monthNames[month]} {year}
      </h3>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const d = densityMap[dateStr];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          const total = d?.total_count || 0;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-all hover:bg-muted/60",
                isSelected && "ring-2 ring-primary bg-primary/10",
                isToday && !isSelected && "bg-accent/30 font-bold"
              )}
            >
              <span className={cn("text-[11px]", isSelected && "font-bold text-primary")}>
                {day.getDate()}
              </span>
              {total > 0 && (
                <div className="flex gap-[2px]">
                  {(d?.new_count || 0) > 0 && (
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-500" title={`${d?.new_count} new`} />
                  )}
                  {(d?.returning_count || 0) > 0 && (
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500" title={`${d?.returning_count} returning`} />
                  )}
                  {(d?.cancelled_count || 0) > 0 && (
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive" title={`${d?.cancelled_count} cancelled`} />
                  )}
                </div>
              )}
              {total > 0 && (
                <span className="text-[9px] text-muted-foreground">{total}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

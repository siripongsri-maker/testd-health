import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { CalendarCheck, UserPlus, RotateCcw, XCircle, Activity } from 'lucide-react';
import type { DensityDay } from './types';

interface Props {
  density: DensityDay[];
  selectedDate: string;
}

export function DensityOverview({ density, selectedDate }: Props) {
  const { language } = useLanguage();

  // Sum totals for the period
  const totals = density.reduce(
    (acc, d) => ({
      total: acc.total + d.total_count,
      newCases: acc.newCases + d.new_count,
      returning: acc.returning + d.returning_count,
      cancelled: acc.cancelled + d.cancelled_count,
      completed: acc.completed + d.completed_count,
    }),
    { total: 0, newCases: 0, returning: 0, cancelled: 0, completed: 0 }
  );

  // Busy level (simple heuristic)
  const busyLevel = totals.total > 30 ? 'high' : totals.total > 15 ? 'medium' : 'low';
  const busyColors = {
    low: 'bg-green-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
  };

  const cards = [
    {
      icon: CalendarCheck,
      value: totals.total,
      label: language === 'th' ? 'นัดหมายทั้งหมด' : 'Total Appointments',
      accent: 'text-primary',
    },
    {
      icon: UserPlus,
      value: totals.newCases,
      label: language === 'th' ? 'ใหม่' : 'New',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: RotateCcw,
      value: totals.returning,
      label: language === 'th' ? 'กลับมาอีกครั้ง' : 'Returning',
      accent: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: XCircle,
      value: totals.cancelled,
      label: language === 'th' ? 'ยกเลิก' : 'Cancelled',
      accent: 'text-destructive',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {language === 'th' ? 'ภาพรวมคิวนัดหมาย' : 'Appointment Overview'}
        </h3>
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${busyColors[busyLevel]}`} />
            <span className="text-xs text-muted-foreground capitalize">{busyLevel}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <Card key={i} className="p-3 text-center">
            <c.icon className={`h-4 w-4 mx-auto mb-1 ${c.accent}`} />
            <p className={`text-xl font-bold ${c.accent}`}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Mini density bar for each day */}
      {density.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {density.map((d) => {
            const isSelected = d.appointment_date === selectedDate;
            const maxH = 40;
            const h = Math.max(4, Math.min(maxH, (d.total_count / Math.max(...density.map(x => x.total_count), 1)) * maxH));
            return (
              <div key={d.appointment_date} className="flex flex-col items-center gap-0.5 min-w-[28px]">
                <div
                  className={`w-4 rounded-sm transition-all ${isSelected ? 'bg-primary' : 'bg-primary/30'}`}
                  style={{ height: `${h}px` }}
                />
                <span className={`text-[9px] ${isSelected ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  {new Date(d.appointment_date + 'T00:00').getDate()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

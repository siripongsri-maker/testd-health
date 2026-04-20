import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Driver } from '@/lib/forecast/forecastEngine';

interface Props {
  drivers: Driver[];
  language: 'th' | 'en';
  title?: string;
}

const ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const COLORS = {
  up: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/40',
  down: 'text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/40',
  neutral: 'text-muted-foreground bg-muted/40 border-border/40',
};

export function ForecastDriversPanel({ drivers, language, title }: Props) {
  if (!drivers.length) return null;
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold mb-2 flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-primary" />
        {title ?? (language === 'th' ? 'ปัจจัยที่ส่งผลต่อ Forecast' : 'Forecast Drivers')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {drivers.map((d) => {
          const Icon = ICONS[d.effect];
          return (
            <Badge
              key={d.key}
              variant="outline"
              className={cn(
                'flex items-center gap-1 text-[11px] font-normal py-1 px-2 border',
                COLORS[d.effect]
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="leading-tight">{language === 'th' ? d.label_th : d.label_en}</span>
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}

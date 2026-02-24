import { useLanguage } from '@/lib/i18n';
import { getDisplayServices } from '@/lib/appointments';
import { Checkbox } from '@/components/ui/checkbox';
import { Hash, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedAppointment } from './types';
import { getStatusInfo } from './types';

interface Props {
  appointment: EnrichedAppointment;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (apt: EnrichedAppointment) => void;
  compact?: boolean;
}

export function AppointmentPill({ appointment: apt, selected, onToggleSelect, onClick, compact }: Props) {
  const { language } = useLanguage();
  const services = getDisplayServices(apt);
  const statusInfo = getStatusInfo(apt.status);

  return (
    <div
      className={cn(
        "group flex items-start gap-2 p-2 rounded-xl border transition-all cursor-pointer hover:shadow-md",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 bg-background hover:border-primary/30",
        compact && "p-1.5"
      )}
      onClick={() => onClick(apt)}
    >
      <div className="pt-0.5" onClick={(e) => { e.stopPropagation(); onToggleSelect(apt.id); }}>
        <Checkbox checked={selected} className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        {/* Time + Services */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-foreground">{(apt.start_time as string).slice(0, 5)}</span>
          <span className="text-sm">{services[0]?.icon || '🩺'}</span>
          <span className="text-xs font-medium truncate">
            {services.map(s => language === 'th' ? s.name_th : s.name_en).join(', ')}
          </span>
          {services.length > 1 && (
            <span className="text-[10px] text-muted-foreground">+{services.length - 1}</span>
          )}
        </div>

        {/* Branch + Referral */}
        {!compact && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {apt.booking_branches && (
              <>
                <MapPin className="h-3 w-3" />
                <span>{language === 'th' ? apt.booking_branches.name_th : apt.booking_branches.name_en}</span>
              </>
            )}
            {apt.referral_code && (
              <>
                <Hash className="h-3 w-3 text-primary" />
                <span className="font-mono font-bold text-primary text-[10px]">{apt.referral_code}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-1 items-end shrink-0">
        {/* Status badge */}
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusInfo.color)}>
          {language === 'th' ? statusInfo.labelTh : statusInfo.labelEn}
        </span>
        {/* New/Returning badge */}
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          apt.is_returning
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
        )}>
          {apt.is_returning
            ? (language === 'th' ? 'กลับมาอีกครั้ง' : 'Returning')
            : (language === 'th' ? 'ใหม่' : 'New')
          }
        </span>
      </div>
    </div>
  );
}

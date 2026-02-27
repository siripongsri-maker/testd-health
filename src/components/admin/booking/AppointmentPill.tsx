import { useLanguage } from '@/lib/i18n';
import { getDisplayServices } from '@/lib/appointments';
import { Checkbox } from '@/components/ui/checkbox';
import { Hash } from 'lucide-react';
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
        "group flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer hover:shadow-sm",
        selected ? "border-primary bg-primary/5" : "border-border/30 bg-background hover:border-primary/20",
        compact && "p-1.5"
      )}
      onClick={() => onClick(apt)}
    >
      <div className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(apt.id); }}>
        <Checkbox checked={selected} className="h-3.5 w-3.5" />
      </div>

      {/* Time */}
      <span className="text-xs font-bold text-foreground shrink-0 w-10 font-mono">{(apt.start_time as string).slice(0, 5)}</span>

      {/* Service icons (1-2) */}
      <span className="text-sm shrink-0">{services.slice(0, 2).map(s => s.icon).join('')}</span>

      {/* Referral code */}
      {apt.referral_code && (
        <span className="text-[10px] font-mono font-bold text-primary shrink-0 hidden sm:inline">{apt.referral_code}</span>
      )}

      {/* Contact info */}
      {(apt.contact_phone || apt.contact_email) && (
        <span className="text-[10px] text-muted-foreground truncate shrink-0 hidden md:inline max-w-[120px]" title={[apt.contact_phone, apt.contact_email].filter(Boolean).join(' / ')}>
          {apt.contact_phone || apt.contact_email}
        </span>
      )}

      {/* Branch (compact) */}
      {!compact && apt.booking_branches && (
        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {language === 'th' ? apt.booking_branches.name_th : apt.booking_branches.name_en}
        </span>
      )}
      {compact && <span className="flex-1" />}

      {/* Status dot + New/Return badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={cn("h-2 w-2 rounded-full", statusInfo.color.split(' ')[0])} title={language === 'th' ? statusInfo.labelTh : statusInfo.labelEn} />
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none",
          apt.is_returning
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
        )}>
          {apt.is_returning ? (language === 'th' ? 'กลับ' : 'Ret') : (language === 'th' ? 'ใหม่' : 'New')}
        </span>
      </div>
    </div>
  );
}

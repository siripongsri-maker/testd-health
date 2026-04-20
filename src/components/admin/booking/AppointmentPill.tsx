import { useLanguage } from '@/lib/i18n';
import { getDisplayServices } from '@/lib/appointments';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Hash, Bot, Zap, User, UserCheck } from 'lucide-react';
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

      {/* Contact info: phone > LINE > email */}
      {(apt.contact_phone || (apt as any).contact_line || apt.contact_email) && (
        <span className="text-[10px] text-muted-foreground truncate shrink-0 hidden md:inline max-w-[120px]" title={[apt.contact_phone, (apt as any).contact_line, apt.contact_email].filter(Boolean).join(' / ')}>
          {apt.contact_phone || (apt as any).contact_line || apt.contact_email}
        </span>
      )}

      {/* Branch (compact) */}
      {!compact && apt.booking_branches && (
        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {language === 'th' ? apt.booking_branches.name_th : apt.booking_branches.name_en}
        </span>
      )}
      {compact && <span className="flex-1" />}

      {/* Status dot + New/Return badge + Auto badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={cn("h-2 w-2 rounded-full", statusInfo.color.split(' ')[0])} title={language === 'th' ? statusInfo.labelTh : statusInfo.labelEn} />
        {(() => {
          const method = (apt as any).checkout_method as string | null;
          if (method === 'auto' || (apt as any).auto_checked_out_at) {
            return (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded-full leading-none bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-0.5" title={language === 'th' ? 'เช็คเอาท์อัตโนมัติ' : 'Auto checkout'}>
                <Bot className="h-2 w-2" />
                Auto
              </span>
            );
          }
          if (method === 'self') {
            return (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded-full leading-none bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-0.5" title={language === 'th' ? 'เช็คเอาท์เอง' : 'Self check-out'}>
                <User className="h-2 w-2" />
                Self
              </span>
            );
          }
          if (method === 'staff') {
            return (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded-full leading-none bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-0.5" title={language === 'th' ? 'เจ้าหน้าที่' : 'By staff'}>
                <UserCheck className="h-2 w-2" />
                Staff
              </span>
            );
          }
          return null;
        })()}
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

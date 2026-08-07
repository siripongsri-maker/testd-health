import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, Hash, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { getDisplayServices } from '@/lib/appointments';
import { referAppointmentToCounselor, fetchReferredAppointmentIds } from '@/lib/urgentReferral';
import type { EnrichedAppointment } from './types';
import { getUrgentSupportSignals } from './types';

interface Props {
  appointments: EnrichedAppointment[];
  onClickAppointment: (apt: EnrichedAppointment) => void;
}

export function UrgentCasesPanel({ appointments, onClickAppointment }: Props) {
  const { language } = useLanguage();
  const th = language === 'th';
  const [, setSyncedCount] = useState(0);
  const autoSynced = useRef<Set<string>>(new Set());

  const urgent = useMemo(
    () => appointments
      .map(apt => ({ apt, signals: getUrgentSupportSignals(apt) }))
      .filter(x => x.signals.length > 0 && !['cancelled', 'no_show'].includes(x.apt.status)),
    [appointments],
  );

  // Auto-push urgent cases into the counseling queue (idempotent) so counselors
  // always see them without relying on a manual click.
  useEffect(() => {
    if (urgent.length === 0) return;
    let cancelled = false;

    (async () => {
      const ids = urgent.map(u => u.apt.id);
      const existing = await fetchReferredAppointmentIds(ids);
      if (cancelled) return;
      if (existing.size > 0) {
        existing.forEach(id => autoSynced.current.add(id));
        setSyncedCount(existing.size);
      }

      for (const { apt, signals } of urgent) {
        if (existing.has(apt.id) || autoSynced.current.has(apt.id)) continue;
        autoSynced.current.add(apt.id);
        try {
          await referAppointmentToCounselor(apt, signals);
          if (!cancelled) setSyncedCount(count => count + 1);
        } catch (err) {
          console.error('URGENT_AUTO_REFERRAL_FAILED', apt.id, err);
          autoSynced.current.delete(apt.id);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [urgent]);

  if (urgent.length === 0) return null;

  return (
    <section
      role="alert"
      className="rounded-xl border border-destructive/60 bg-destructive/5 p-2 shadow-[0_0_0_3px_hsl(var(--destructive)/0.06)]"
    >
      <header className="mb-1.5 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
        </span>
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <h3 className="text-xs font-bold text-destructive">
          {th ? 'เคสเร่งด่วนวันนี้' : 'Urgent cases'}
        </h3>
        <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">{urgent.length}</Badge>
      </header>

      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {urgent.map(({ apt, signals }) => {
          const services = getDisplayServices(apt);
          return (
            <button
              key={apt.id}
              type="button"
              onClick={() => onClickAppointment(apt)}
              className="group min-h-0 rounded-lg border border-destructive/35 bg-background/80 p-1.5 text-left backdrop-blur-sm transition-colors hover:border-destructive/70"
              title={th ? 'กดเพื่อดูรายละเอียดเคส' : 'Click to view case details'}
            >
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-tight">
                <Clock className="h-3 w-3 shrink-0 text-destructive" />
                <span className="shrink-0">{String(apt.start_time || '').slice(0, 5)}</span>
                <span className="truncate font-medium text-foreground/80">
                  {services.map(s => (th ? s.name_th : s.name_en)).join(', ')}
                </span>
                <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {signals.map(s => (
                    <Badge
                      key={s.kind}
                      variant="destructive"
                      className="h-4 px-1 text-[9px] leading-none"
                      title={(th ? s.sourceTh : s.sourceEn) || undefined}
                    >
                      {th ? s.labelTh : s.labelEn}
                    </Badge>
                  ))}
                </div>
                {apt.booking_branches && (
                  <span className="inline-flex max-w-[35%] shrink-0 items-center gap-0.5 truncate" title={th ? apt.booking_branches.name_th : apt.booking_branches.name_en}>
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {th ? apt.booking_branches.name_th : apt.booking_branches.name_en}
                  </span>
                )}
                {apt.referral_code && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 font-mono" title={apt.referral_code}>
                    <Hash className="h-2.5 w-2.5" />{apt.referral_code}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

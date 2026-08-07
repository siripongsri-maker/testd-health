import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, MapPin, Loader2, UserPlus, Hash, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [referred, setReferred] = useState<Set<string>>(new Set());
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
      if (existing.size > 0) setReferred(prev => new Set([...prev, ...existing]));

      for (const { apt, signals } of urgent) {
        if (existing.has(apt.id) || autoSynced.current.has(apt.id)) continue;
        autoSynced.current.add(apt.id);
        try {
          await referAppointmentToCounselor(apt, signals);
          if (!cancelled) setReferred(prev => new Set(prev).add(apt.id));
        } catch (err) {
          console.error('URGENT_AUTO_REFERRAL_FAILED', apt.id, err);
          autoSynced.current.delete(apt.id);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [urgent]);

  if (urgent.length === 0) return null;

  const handleRefer = async (apt: EnrichedAppointment, signals: ReturnType<typeof getUrgentSupportSignals>) => {
    setBusyId(apt.id);
    try {
      const res = await referAppointmentToCounselor(apt, signals);
      setReferred(prev => new Set(prev).add(apt.id));
      toast.success(
        res.status === 'exists'
          ? (th ? 'เคสนี้อยู่ในคิวให้คำปรึกษาแล้ว' : 'Already in the counseling queue')
          : (th ? 'ส่งต่อให้ผู้ให้คำปรึกษาแล้ว' : 'Referred to counselor'),
      );
    } catch {
      toast.error(th ? 'ส่งต่อไม่สำเร็จ' : 'Referral failed');
    }
    setBusyId(null);
  };


  return (
    <section
      role="alert"
      className="rounded-2xl border-2 border-destructive/60 bg-destructive/5 p-3 shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]"
    >
      <header className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-bold text-destructive">
          {th ? 'เคสเร่งด่วนวันนี้' : 'Urgent cases'}
        </h3>
        <Badge variant="destructive" className="text-[10px]">{urgent.length}</Badge>
        <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
          {th ? 'กดที่การ์ดเพื่อดูรายละเอียด' : 'Tap a card for details'}
        </span>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {urgent.map(({ apt, signals }) => {
          const services = getDisplayServices(apt);
          const isReferred = referred.has(apt.id);
          return (
            <div
              key={apt.id}
              className="rounded-xl border border-destructive/40 bg-background/80 p-2.5 backdrop-blur-sm"
            >
              <button
                type="button"
                onClick={() => onClickAppointment(apt)}
                className="w-full text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5 text-destructive" />
                  {String(apt.start_time || '').slice(0, 5)}
                  <span className="truncate font-medium text-foreground/80">
                    {services.map(s => (th ? s.name_th : s.name_en)).join(', ')}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {signals.map(s => (
                    <Badge
                      key={s.kind}
                      variant="destructive"
                      className="text-[10px]"
                      title={(th ? s.sourceTh : s.sourceEn) || undefined}
                    >
                      {th ? s.labelTh : s.labelEn}
                      {(th ? s.sourceTh : s.sourceEn) && (
                        <span className="ml-1 font-normal opacity-80">· {th ? s.sourceTh : s.sourceEn}</span>
                      )}
                    </Badge>
                  ))}

                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {apt.booking_branches && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {th ? apt.booking_branches.name_th : apt.booking_branches.name_en}
                    </span>
                  )}
                  {apt.referral_code && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />{apt.referral_code}
                    </span>
                  )}
                </div>
              </button>

              <Button
                size="sm"
                variant={isReferred ? 'outline' : 'destructive'}
                className="mt-2 w-full h-8 text-xs"
                disabled={busyId === apt.id || isReferred}
                onClick={() => handleRefer(apt, signals)}
              >
                {busyId === apt.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    {isReferred
                      ? (th ? 'ส่งต่อแล้ว' : 'Referred')
                      : (th ? 'ส่งต่อผู้ให้คำปรึกษา' : 'Refer to counselor')}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

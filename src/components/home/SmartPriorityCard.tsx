import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  TestTube,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  Heart,
  Gift,
} from 'lucide-react';

// ── Priority types ──────────────────────────────────────────────
type PriorityKey =
  | 'book_first'
  | 'submit_result'
  | 'upcoming_appointment'
  | 'prevention_followup'
  | 'explore_engagement';

interface PriorityState {
  key: PriorityKey;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  ctaLabelTh: string;
  ctaLabelEn: string;
  ctaPath: string;
  secondaryCtaLabelTh?: string;
  secondaryCtaLabelEn?: string;
  secondaryCtaPath?: string;
  icon: React.ReactNode;
  accentClass: string; // tailwind gradient class
}

const PRIORITIES: Record<PriorityKey, Omit<PriorityState, 'key'>> = {
  book_first: {
    titleTh: 'เริ่มต้นดูแลสุขภาพของคุณ',
    titleEn: 'Start Your Health Journey',
    descTh: 'จองบริการตรวจหรือปรึกษากับเจ้าหน้าที่ได้เลย — ฟรี เป็นความลับ',
    descEn: 'Book a testing or consultation service — free & confidential.',
    ctaLabelTh: 'จองบริการ',
    ctaLabelEn: 'Book Now',
    ctaPath: '/booking',
    secondaryCtaLabelTh: 'ขอชุดตรวจฟรี',
    secondaryCtaLabelEn: 'Request Free Kit',
    secondaryCtaPath: '/hiv-selftest',
    icon: <Calendar className="h-7 w-7" />,
    accentClass: 'from-primary/20 to-primary/5',
  },
  submit_result: {
    titleTh: 'ยังไม่ได้ส่งผลตรวจของคุณ',
    titleEn: 'Submit Your Test Result',
    descTh: 'คุณได้รับชุดตรวจแล้ว — ส่งผลตรวจเพื่อรับคำแนะนำถัดไป',
    descEn: 'You received a test kit — submit your result for next steps.',
    ctaLabelTh: 'ส่งผลตรวจ',
    ctaLabelEn: 'Submit Result',
    ctaPath: '/hiv-selftest',
    icon: <TestTube className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--warning))]/20 to-[hsl(var(--warning))]/5',
  },
  upcoming_appointment: {
    titleTh: 'นัดหมายของคุณกำลังรออยู่',
    titleEn: 'Your Appointment is Waiting',
    descTh: 'ดูรายละเอียดนัดหมายหรือเช็คอินเมื่อถึงเวลา',
    descEn: 'View details or check in when it\'s time.',
    ctaLabelTh: 'ดูนัดหมาย',
    ctaLabelEn: 'View Appointment',
    ctaPath: '/my-appointments',
    icon: <ClipboardCheck className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5',
  },
  prevention_followup: {
    titleTh: 'พร้อมทำขั้นตอนถัดไปไหม?',
    titleEn: 'Ready for Your Next Step?',
    descTh: 'จากผลลัพธ์ Prevention Match — ลองดูบริการที่เหมาะกับคุณ',
    descEn: 'Based on your Prevention Match — explore services that fit you.',
    ctaLabelTh: 'จองบริการที่แนะนำ',
    ctaLabelEn: 'Book Recommended',
    ctaPath: '/booking',
    secondaryCtaLabelTh: 'แชร์ผลลัพธ์',
    secondaryCtaLabelEn: 'Share Result',
    secondaryCtaPath: '/prevention-match',
    icon: <Sparkles className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--rainbow-5))]/20 to-[hsl(var(--rainbow-6))]/5',
  },
  explore_engagement: {
    titleTh: 'คุณดูแลตัวเองดีมาก ✨',
    titleEn: 'You\'re Doing Great ✨',
    descTh: 'ไม่มีสิ่งเร่งด่วน — สำรวจรางวัลหรือร่วมเป้าหมายชุมชน',
    descEn: 'Nothing urgent — check rewards or join the community goal.',
    ctaLabelTh: 'ดูรางวัล',
    ctaLabelEn: 'View Rewards',
    ctaPath: '/progress',
    secondaryCtaLabelTh: 'Prevention Match',
    secondaryCtaLabelEn: 'Prevention Match',
    secondaryCtaPath: '/prevention-match',
    icon: <Gift className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--rainbow-3))]/15 to-[hsl(var(--rainbow-4))]/5',
  },
};

// ── Hook: determine priority ────────────────────────────────────
function usePriorityState(userId: string | undefined): { priority: PriorityKey; loading: boolean } {
  const [priority, setPriority] = useState<PriorityKey>('explore_engagement');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPriority('book_first');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function determine() {
      try {
        // Parallel fetch: appointments, selftest requests
        const [appointmentsRes, selftestRes] = await Promise.all([
          supabase
            .from('appointments')
            .select('id, status, appointment_date, start_time')
            .eq('user_id', userId!)
            .in('status', ['booked', 'confirmed', 'arrived', 'in_progress'])
            .gte('appointment_date', new Date().toISOString().split('T')[0])
            .order('appointment_date')
            .limit(1),
          supabase
            .from('hiv_selftest_requests')
            .select('id, status')
            .eq('user_id', userId!)
            .in('status', ['approved', 'shipped', 'delivered', 'received'])
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (cancelled) return;

        const hasUpcoming = (appointmentsRes.data?.length ?? 0) > 0;
        const hasPendingResult = (selftestRes.data?.length ?? 0) > 0;

        // Check if user has any past appointments or selftest at all
        if (!hasUpcoming && !hasPendingResult) {
          // Check if user ever booked anything
          const { count: totalBookings } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId!);

          const { count: totalSelftests } = await supabase
            .from('hiv_selftest_requests')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId!);

          if (cancelled) return;

          if ((totalBookings ?? 0) === 0 && (totalSelftests ?? 0) === 0) {
            setPriority('book_first');
          } else {
            // User has history but nothing active → engagement
            setPriority('explore_engagement');
          }
        } else if (hasPendingResult) {
          // Priority 2: has kit but no result submitted
          setPriority('submit_result');
        } else if (hasUpcoming) {
          // Priority 3: upcoming appointment
          setPriority('upcoming_appointment');
        }
      } catch (err) {
        console.error('SmartPriority error:', err);
        setPriority('book_first');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    determine();
    return () => { cancelled = true; };
  }, [userId]);

  return { priority, loading };
}

// ── Component ───────────────────────────────────────────────────
export function SmartPriorityCard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { priority, loading } = usePriorityState(user?.id);

  const p = useMemo<PriorityState>(
    () => ({ key: priority, ...PRIORITIES[priority] }),
    [priority]
  );

  if (loading) {
    return (
      <div className="rounded-2xl glass p-5 animate-pulse space-y-3">
        <div className="h-5 w-2/3 bg-muted/40 rounded-lg" />
        <div className="h-4 w-full bg-muted/30 rounded-lg" />
        <div className="h-10 w-1/2 bg-primary/20 rounded-xl" />
      </div>
    );
  }

  const title = language === 'th' ? p.titleTh : p.titleEn;
  const desc = language === 'th' ? p.descTh : p.descEn;
  const ctaLabel = language === 'th' ? p.ctaLabelTh : p.ctaLabelEn;
  const secondaryLabel = p.secondaryCtaLabelTh
    ? language === 'th'
      ? p.secondaryCtaLabelTh
      : p.secondaryCtaLabelEn
    : null;

  return (
    <section
      className={`
        relative overflow-hidden rounded-2xl 
        bg-gradient-to-br ${p.accentClass}
        border border-white/40
        backdrop-blur-xl
        shadow-[var(--shadow-glass)]
        p-5 sm:p-6
      `}
    >
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Section label */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-3">
        {language === 'th' ? '🎯 สิ่งที่ควรทำต่อวันนี้' : '🎯 Your Next Step Today'}
      </p>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {p.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {desc}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => navigate(p.ctaPath)}
              className="gap-1.5 shadow-[var(--shadow-button)]"
            >
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            {secondaryLabel && p.secondaryCtaPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(p.secondaryCtaPath!)}
                className="text-muted-foreground hover:text-foreground"
              >
                {secondaryLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

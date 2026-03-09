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
  Gift,
} from 'lucide-react';

// ── Priority types ──────────────────────────────────────────────
type PriorityKey =
  | 'submit_result'
  | 'upcoming_appointment'
  | 'book_first'
  | 'prevention_followup'
  | 'explore_engagement';

interface PriorityConfig {
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
  accentClass: string;
  urgent?: boolean;
}

const PRIORITIES: Record<PriorityKey, PriorityConfig> = {
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
    urgent: true,
  },
  upcoming_appointment: {
    titleTh: 'คุณมีนัดหมายที่กำลังจะมาถึง',
    titleEn: 'Your Appointment is Coming Up',
    descTh: 'ตรวจสอบรายละเอียดนัดหมายของคุณ',
    descEn: 'Check your appointment details.',
    ctaLabelTh: 'ดูนัดหมาย',
    ctaLabelEn: 'View Appointment',
    ctaPath: '/my-appointments',
    icon: <ClipboardCheck className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5',
  },
  book_first: {
    titleTh: 'เริ่มต้นดูแลสุขภาพของคุณ',
    titleEn: 'Start Your Health Journey',
    descTh: 'จองบริการตรวจหรือขอชุดตรวจฟรีได้ที่นี่',
    descEn: 'Book a testing service or request a free test kit.',
    ctaLabelTh: 'จองบริการ',
    ctaLabelEn: 'Book Now',
    ctaPath: '/booking',
    secondaryCtaLabelTh: 'ขอชุดตรวจฟรี',
    secondaryCtaLabelEn: 'Request Free Kit',
    secondaryCtaPath: '/hiv-selftest',
    icon: <Calendar className="h-7 w-7" />,
    accentClass: 'from-primary/20 to-primary/5',
  },
  prevention_followup: {
    titleTh: 'ผลลัพธ์ Prevention Match ของคุณพร้อมแล้ว',
    titleEn: 'Your Prevention Match Result is Ready',
    descTh: 'ดูคำแนะนำและบริการที่เหมาะกับคุณ',
    descEn: 'Explore recommendations and services that fit you.',
    ctaLabelTh: 'ดูคำแนะนำ',
    ctaLabelEn: 'View Recommendations',
    ctaPath: '/prevention-match',
    icon: <Sparkles className="h-7 w-7" />,
    accentClass: 'from-[hsl(var(--rainbow-5))]/20 to-[hsl(var(--rainbow-6))]/5',
  },
  explore_engagement: {
    titleTh: 'ดูแลสุขภาพอย่างต่อเนื่อง',
    titleEn: 'Keep Taking Care of Yourself',
    descTh: 'เข้าร่วมกิจกรรมชุมชนหรือสะสมรางวัล',
    descEn: 'Join community activities or collect rewards.',
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

// ── State helpers ───────────────────────────────────────────────
interface JourneyState {
  hasPendingResultSubmission: boolean;
  hasUpcomingAppointment: boolean;
  hasEverBooked: boolean;
  hasRequestedSelfTest: boolean;
  hasCompletedPreventionMatch: boolean;
  hasBookedAfterMatch: boolean;
}

async function evaluateJourney(userId: string): Promise<JourneyState> {
  const today = new Date().toISOString().split('T')[0];
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [pendingResultRes, upcomingRes, totalBookingsRes, totalSelftestsRes, matchRes] =
    await Promise.all([
      // P1: selftest delivered/received but no result submitted
      supabase
        .from('hiv_selftest_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['approved', 'shipped', 'delivered', 'received'])
        .is('test_result', null),

      // P2: upcoming appointment within 48h
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['booked', 'confirmed'])
        .gte('appointment_date', today)
        .lte('appointment_date', in48h),

      // P3: ever booked
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // P3: ever requested selftest
      supabase
        .from('hiv_selftest_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // P4: prevention match completed
      supabase
        .from('prevention_match_results' as any)
        .select('id, created_at', { count: 'exact', head: false })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  const hasMatch = (matchRes.data?.length ?? 0) > 0;
  // Check if user booked AFTER their latest match
  let hasBookedAfterMatch = false;
  if (hasMatch && matchRes.data?.[0]) {
    const matchDate = (matchRes.data[0] as any).created_at;
    if (matchDate) {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('created_at', matchDate);
      hasBookedAfterMatch = (count ?? 0) > 0;
    }
  }

  return {
    hasPendingResultSubmission: (pendingResultRes.count ?? 0) > 0,
    hasUpcomingAppointment: (upcomingRes.count ?? 0) > 0,
    hasEverBooked: (totalBookingsRes.count ?? 0) > 0,
    hasRequestedSelfTest: (totalSelftestsRes.count ?? 0) > 0,
    hasCompletedPreventionMatch: hasMatch,
    hasBookedAfterMatch,
  };
}

function determinePriority(state: JourneyState): PriorityKey {
  if (state.hasPendingResultSubmission) return 'submit_result';
  if (state.hasUpcomingAppointment) return 'upcoming_appointment';
  if (!state.hasEverBooked && !state.hasRequestedSelfTest) return 'book_first';
  if (state.hasCompletedPreventionMatch && !state.hasBookedAfterMatch) return 'prevention_followup';
  return 'explore_engagement';
}

// ── Hook ────────────────────────────────────────────────────────
function usePriorityState(userId: string | undefined) {
  const [priority, setPriority] = useState<PriorityKey>('explore_engagement');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPriority('book_first');
      setLoading(false);
      return;
    }

    let cancelled = false;

    evaluateJourney(userId)
      .then((state) => {
        if (!cancelled) setPriority(determinePriority(state));
      })
      .catch((err) => {
        console.error('SmartPriority error:', err);
        if (!cancelled) setPriority('book_first');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

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

  const p = useMemo(() => ({ key: priority, ...PRIORITIES[priority] }), [priority]);

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
    ? language === 'th' ? p.secondaryCtaLabelTh : p.secondaryCtaLabelEn
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
        animate-fade-in
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
        <div className={`
          flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 
          flex items-center justify-center text-primary
          ${p.urgent ? 'animate-pulse' : ''}
        `}>
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
              className={`gap-1.5 shadow-[var(--shadow-button)] ${p.urgent ? 'animate-pulse' : ''}`}
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

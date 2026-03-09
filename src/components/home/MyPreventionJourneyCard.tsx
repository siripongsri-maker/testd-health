import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { useJourneyState, JourneyState } from '@/hooks/useJourneyState';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck,
  Package,
  ClipboardCheck,
  Compass,
  Heart,
  ArrowRight,
  Check,
} from 'lucide-react';

// ── Step definition ─────────────────────────────────────────────
type StepStatus = 'completed' | 'current' | 'upcoming';

interface JourneyStep {
  labelTh: string;
  labelEn: string;
  helperTh: string;
  helperEn: string;
  completedTh: string;
  completedEn: string;
  icon: React.ReactNode;
  ctaPath?: string;
  ctaLabelTh?: string;
  ctaLabelEn?: string;
}

const STEPS: JourneyStep[] = [
  {
    labelTh: 'เริ่มต้นการดูแล',
    labelEn: 'Start Care',
    helperTh: 'จองบริการหรือขอชุดตรวจ',
    helperEn: 'Book a service or request a kit',
    completedTh: 'คุณเริ่มต้นแล้ว',
    completedEn: 'You\'ve started',
    icon: <CalendarCheck className="h-4 w-4" />,
    ctaPath: '/booking',
    ctaLabelTh: 'จองบริการ',
    ctaLabelEn: 'Book Now',
  },
  {
    labelTh: 'เข้าถึงบริการ',
    labelEn: 'Receive Access',
    helperTh: 'ยืนยันนัดหมายหรือรับชุดตรวจ',
    helperEn: 'Confirm appointment or receive kit',
    completedTh: 'ได้รับบริการแล้ว',
    completedEn: 'Access received',
    icon: <Package className="h-4 w-4" />,
  },
  {
    labelTh: 'ตรวจสุขภาพ',
    labelEn: 'Complete Check',
    helperTh: 'เข้ารับบริการหรือส่งผลตรวจ',
    helperEn: 'Attend service or submit result',
    completedTh: 'ตรวจสุขภาพเรียบร้อย',
    completedEn: 'Check completed',
    icon: <ClipboardCheck className="h-4 w-4" />,
    ctaPath: '/hiv-selftest',
    ctaLabelTh: 'ส่งผลตรวจ',
    ctaLabelEn: 'Submit Result',
  },
  {
    labelTh: 'รับคำแนะนำ',
    labelEn: 'Get Guidance',
    helperTh: 'ดูคำแนะนำจาก Prevention Match',
    helperEn: 'View Prevention Match results',
    completedTh: 'ได้รับคำแนะนำแล้ว',
    completedEn: 'Guidance received',
    icon: <Compass className="h-4 w-4" />,
    ctaPath: '/prevention-match',
    ctaLabelTh: 'ดูคำแนะนำ',
    ctaLabelEn: 'View Results',
  },
  {
    labelTh: 'ดูแลต่อเนื่อง',
    labelEn: 'Stay Engaged',
    helperTh: 'ร่วมกิจกรรมและสะสมรางวัล',
    helperEn: 'Join activities & collect rewards',
    completedTh: 'คุณดูแลตัวเองดีมาก ✨',
    completedEn: 'You\'re doing great ✨',
    icon: <Heart className="h-4 w-4" />,
    ctaPath: '/progress',
    ctaLabelTh: 'ดูรางวัล',
    ctaLabelEn: 'View Rewards',
  },
];

function resolveStepStatuses(state: JourneyState | null): StepStatus[] {
  if (!state) return ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];

  const stepCompleted = [
    // Step 1: Start Care
    state.hasEverBooked || state.hasRequestedSelfTest,
    // Step 2: Receive Access
    state.hasConfirmedAppointment || state.hasSelfTestDelivered,
    // Step 3: Complete Check
    state.hasCompletedAppointment || state.hasSubmittedResult,
    // Step 4: Get Guidance
    state.hasCompletedPreventionMatch || state.hasChatThread,
    // Step 5: Stay Engaged (soft — if they've done steps 1-3, consider engaged)
    (state.hasCompletedAppointment || state.hasSubmittedResult) &&
      (state.hasCompletedPreventionMatch || state.hasChatThread),
  ];

  const statuses: StepStatus[] = [];
  let foundCurrent = false;

  for (let i = 0; i < stepCompleted.length; i++) {
    if (stepCompleted[i]) {
      statuses.push('completed');
    } else if (!foundCurrent) {
      statuses.push('current');
      foundCurrent = true;
    } else {
      statuses.push('upcoming');
    }
  }

  return statuses;
}

// ── Component ───────────────────────────────────────────────────
export function MyPreventionJourneyCard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { state, loading } = useJourneyState(user?.id);

  const statuses = useMemo(() => resolveStepStatuses(state), [state]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl glass p-5 animate-pulse space-y-3">
        <div className="h-4 w-1/2 bg-muted/40 rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-muted/20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const completedCount = statuses.filter((s) => s === 'completed').length;

  return (
    <section className="rounded-2xl glass border border-white/30 backdrop-blur-xl shadow-[var(--shadow-glass)] p-5 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">
            {language === 'th' ? '🗺️ เส้นทางการดูแลของคุณ' : '🗺️ My Prevention Journey'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'th'
              ? 'ดูว่าคุณอยู่ขั้นตอนไหนแล้ว'
              : 'See where you are in your journey'}
          </p>
        </div>
        {/* Progress pill */}
        <div className="flex-shrink-0 bg-primary/10 rounded-full px-3 py-1">
          <span className="text-xs font-semibold text-primary">
            {completedCount}/{STEPS.length}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {STEPS.map((step, i) => {
          const status = statuses[i];
          const isLast = i === STEPS.length - 1;
          const label = language === 'th' ? step.labelTh : step.labelEn;
          const helper =
            status === 'completed'
              ? language === 'th' ? step.completedTh : step.completedEn
              : language === 'th' ? step.helperTh : step.helperEn;

          return (
            <div key={i} className="flex gap-3 relative">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={`
                    flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-primary text-primary-foreground'
                      : status === 'current'
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                        : 'bg-muted/30 text-muted-foreground/40'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[20px] transition-colors duration-300 ${
                      status === 'completed' ? 'bg-primary/40' : 'bg-muted/20'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                <p
                  className={`text-sm font-semibold leading-tight ${
                    status === 'upcoming'
                      ? 'text-muted-foreground/50'
                      : 'text-foreground'
                  }`}
                >
                  {label}
                </p>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    status === 'completed'
                      ? 'text-primary/70'
                      : status === 'current'
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/40'
                  }`}
                >
                  {helper}
                </p>

                {/* CTA for current step only */}
                {status === 'current' && step.ctaPath && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(step.ctaPath!)}
                    className="mt-2 h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {language === 'th' ? step.ctaLabelTh : step.ctaLabelEn}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

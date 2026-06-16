import { useNavigate } from 'react-router-dom';
import { TestTube, Package, MessageCircle, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';
import { openSupportChat } from '@/lib/openSupportChat';

const actions = [
  {
    icon: TestTube,
    titleTh: '🧪 ตรวจทันที',
    titleEn: '🧪 Test Now',
    descTh: 'รู้ผลเร็ว',
    descEn: 'Quick results',
    path: '/booking',
    event: 'homepage_cta_booking_click',
    accent: 'from-primary/15 to-primary/5',
  },
  {
    icon: Package,
    titleTh: '📦 ชุดตรวจถึงบ้าน',
    titleEn: '📦 Home Test Kit',
    descTh: 'ฟรี ไม่มีค่าใช้จ่าย',
    descEn: 'Free delivery',
    path: '/hiv-selftest',
    event: 'homepage_cta_selftest_click',
    accent: 'from-accent/15 to-accent/5',
  },
  {
    icon: MessageCircle,
    titleTh: '💬 คุยไม่ระบุตัวตน',
    titleEn: '💬 Anonymous Chat',
    descTh: 'ปลอดภัย ไม่ตัดสิน',
    descEn: 'Safe & judgment-free',
    path: '/support-chat',
    event: 'homepage_cta_support_click',
    accent: 'from-success/15 to-success/5',
  },
];

export function PrimaryActionCards() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 gap-3">
        {actions.map((a) => (
          <button
            key={a.path}
            onClick={() => {
              trackEvent(a.event, { source: 'homepage', section: 'action_cards' });
              navigate(a.path);
            }}
            className={`
              group relative overflow-hidden rounded-2xl 
              bg-gradient-to-r ${a.accent}
              border border-border/30
              p-4 text-left flex items-center gap-4
              hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5 
              active:scale-[0.98] transition-all duration-200
            `}
          >
            <div className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm">
              <a.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">
                {language === 'th' ? a.titleTh : a.titleEn}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'th' ? a.descTh : a.descEn}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}

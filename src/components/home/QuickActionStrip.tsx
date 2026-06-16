import { useNavigate } from 'react-router-dom';
import { TestTube, Package, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';
import { openSupportChat } from '@/lib/openSupportChat';

const actions = [
  {
    icon: TestTube,
    labelTh: 'ตรวจทันที',
    labelEn: 'Test Now',
    descTh: 'รู้ผลเร็ว',
    descEn: 'Quick results',
    path: '/booking',
    event: 'homepage_quick_booking',
  },
  {
    icon: Package,
    labelTh: 'ชุดตรวจถึงบ้าน',
    labelEn: 'Home Kit',
    descTh: 'ฟรี',
    descEn: 'Free',
    path: '/hiv-selftest',
    event: 'homepage_quick_selftest',
  },
  {
    icon: MessageCircle,
    labelTh: 'คุยเจ้าหน้าที่',
    labelEn: 'Chat Support',
    descTh: 'ไม่ระบุตัวตน',
    descEn: 'Anonymous',
    path: '/support-chat',
    event: 'homepage_quick_support',
  },
];

export function QuickActionStrip() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <section className="mb-6">
      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <button
            key={a.path}
            onClick={() => {
              trackEvent(a.event, { source: 'homepage', section: 'quick_strip' });
              if (a.path === '/support-chat') {
                openSupportChat();
                return;
              }
              navigate(a.path);
            }}
            className="group flex flex-col items-center gap-2 rounded-2xl glass border border-border/30 p-3 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <a.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground leading-tight">
                {language === 'th' ? a.labelTh : a.labelEn}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {language === 'th' ? a.descTh : a.descEn}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

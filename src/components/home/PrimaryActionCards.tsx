import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, TestTube, MessageCircle, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { getOrderedActions } from '@/lib/ctaPriority';

const baseActions = [
  {
    icon: TestTube,
    title: 'รับชุดตรวจ HIV ฟรี ส่งถึงบ้าน',
    desc: 'รับชุดตรวจ HIV ส่งถึงบ้าน ตรวจเองได้',
    path: '/hiv-selftest',
  },
  {
    icon: Calendar,
    title: 'จองตรวจ HIV ฟรี วันนี้',
    desc: 'จองนัดตรวจ HIV ฟรีที่คลินิกใกล้คุณ',
    path: '/booking',
  },
  {
    icon: MessageCircle,
    title: 'คุยกับเจ้าหน้าที่ (ไม่ระบุตัวตน)',
    desc: 'คุยกับทีมงานก่อน ไม่ต้องเปิดเผยตัวตน',
    path: '/support-chat',
  },
];

export function PrimaryActionCards() {
  const navigate = useNavigate();

  return (
    <section className="mb-6">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1 mb-2">
        🎯 เริ่มดูแลสุขภาพของคุณวันนี้
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a) => (
          <button
            key={a.path}
            onClick={() => {
              const eventMap: Record<string, string> = {
                '/hiv-selftest': 'homepage_cta_selftest_click',
                '/booking': 'homepage_cta_booking_click',
                '/support-chat': 'homepage_cta_support_click',
              };
              trackEvent(eventMap[a.path] || 'homepage_cta_click', { source: 'homepage', section: 'primary_cards', target: a.path });
              navigate(a.path);
            }}
            className="glass glass-shine rounded-2xl p-4 text-left flex items-start gap-3 hover:shadow-soft hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <a.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1 shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}

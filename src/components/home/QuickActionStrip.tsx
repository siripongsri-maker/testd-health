import { useNavigate } from 'react-router-dom';
import { TestTube, ClipboardCheck } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

const actions = [
  {
    icon: TestTube,
    labelTh: 'ขอชุดตรวจ',
    labelEn: 'Request Kit',
    descTh: 'ด้วยตัวเอง',
    descEn: 'Self-request',
    path: '/hiv-selftest',
    event: 'homepage_quick_selftest_request',
  },
  {
    icon: ClipboardCheck,
    labelTh: 'รายงานผลชุดตรวจ',
    labelEn: 'Report Result',
    descTh: 'ส่งผลตรวจ',
    descEn: 'Submit result',
    path: '/hiv-selftest',
    event: 'homepage_quick_report_result',
  },
];

export function QuickActionStrip() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <section className="mb-6">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.event}
            onClick={() => {
              trackEvent(a.event, { source: 'homepage', section: 'quick_strip' });
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

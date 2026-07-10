import { openSupportChat } from "@/lib/openSupportChat";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Compass } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

export function HeroSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === 'th';

  return (
    <section className="text-center sm:text-left space-y-4 mb-6">
      <div className="space-y-2.5">
        <h1 className="text-[28px] leading-[1.15] sm:text-4xl font-bold text-foreground tracking-tight">
          {isTh ? (
            <>อยากรู้<br /><span className="text-primary">ตรวจได้ฟรี</span></>
          ) : (
            <>Want to know your status?<br /><span className="text-primary">Test free, anytime.</span></>
          )}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-[320px] mx-auto sm:mx-0 leading-relaxed">
          {isTh
            ? 'รู้ผลเร็ว ปลอดภัย เป็นความลับ'
            : 'Quick results. Safe. Confidential.'}
        </p>
      </div>

      {/* CTAs — primary stands out, secondary lighter */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 pt-1">
        <Button
          variant="default"
          className="h-12 px-6 rounded-full text-sm font-semibold gap-2 shadow-md shadow-primary/20 sm:min-w-[160px]"
          onClick={() => {
            trackEvent('homepage_cta_primary_click', { source: 'homepage', section: 'hero' });
            navigate('/booking');
          }}
        >
          {isTh ? 'เริ่มตรวจเลย' : 'Get Tested'}
          <ArrowRight className="h-4 w-4" />
        </Button>


        <Button
          variant="ghost"
          className="h-12 px-4 rounded-full text-sm font-medium gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60"
          onClick={() => {
            trackEvent('homepage_cta_journey_click', { source: 'homepage', section: 'hero' });
            openSupportChat();
          }}
        >
          <Compass className="h-4 w-4" />
          {isTh ? 'ปรึกษาออนไลน์' : 'Chat online'}
        </Button>
      </div>

    </section>
  );
}

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

export function HeroSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <section className="text-center space-y-5 mb-8 pt-2">
      {/* Headline */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight tracking-tight">
          {language === 'th' ? (
            <>ตรวจ HIV ฟรี<br /><span className="text-primary">ใกล้คุณ</span></>
          ) : (
            <>Free HIV Testing<br /><span className="text-primary">Near You</span></>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === 'th'
            ? 'ง่าย • เป็นส่วนตัว • ไม่ต้องเปิดเผยตัวตน'
            : 'Easy • Private • Anonymous'}
        </p>
      </div>

      {/* Primary CTA */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <Button
          variant="hero"
          size="lg"
          className="w-full max-w-[280px] h-14 text-base font-bold rounded-2xl gap-2"
          onClick={() => {
            trackEvent('homepage_cta_primary_click', { source: 'homepage', section: 'hero' });
            navigate('/booking');
          }}
        >
          {language === 'th' ? 'เริ่มตรวจ' : 'Get Tested'}
          <ArrowRight className="h-5 w-5" />
        </Button>

        <Button
          variant="hero-outline"
          size="lg"
          className="w-full max-w-[280px] h-12 text-sm rounded-2xl gap-2"
          onClick={() => {
            trackEvent('homepage_cta_support_click', { source: 'homepage', section: 'hero' });
            navigate('/support-chat');
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {language === 'th' ? 'คุยกับเจ้าหน้าที่' : 'Talk to Support'}
        </Button>
      </div>

      {/* Trust strip */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">🔒 {language === 'th' ? 'เป็นความลับ' : 'Confidential'}</span>
        <span className="flex items-center gap-1">✅ {language === 'th' ? 'ฟรี' : 'Free'}</span>
        <span className="flex items-center gap-1">⚡ {language === 'th' ? 'ใช้เวลาไม่นาน' : 'Quick'}</span>
      </div>
    </section>
  );
}

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Compass } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

export function HeroSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <section className="text-center space-y-5 mb-6 pt-2">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight tracking-tight">
          {language === 'th' ? (
            <>ดูแลตัวเอง<br /><span className="text-primary">ในจังหวะของคุณเอง</span></>
          ) : (
            <>Take care of yourself,<br /><span className="text-primary">on your own time</span></>
          )}
        </h1>
        <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
          {language === 'th'
            ? 'ตรวจ พูดคุย และเรียนรู้ ในแบบที่คุณสบายใจ'
            : 'Test, chat, and learn in a way that feels right for you.'}
        </p>
      </div>

      {/* CTAs */}
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
          {language === 'th' ? 'เริ่มตรวจเลย' : 'Get Tested'}
          <ArrowRight className="h-5 w-5" />
        </Button>

        <Button
          variant="hero-outline"
          size="lg"
          className="w-full max-w-[280px] h-12 text-sm rounded-2xl gap-2"
          onClick={() => {
            trackEvent('homepage_cta_journey_click', { source: 'homepage', section: 'hero' });
            navigate('/virtual');
          }}
        >
          <Compass className="h-4 w-4" />
          {language === 'th' ? 'ลองดูเส้นทางของคุณ' : 'Find what works for you'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
        <span>🔒 {language === 'th' ? 'เป็นความลับ' : 'Confidential'}</span>
        <span>{language === 'th' ? 'ฟรี' : 'Free'}</span>
        <span>{language === 'th' ? 'ใช้เวลาไม่นาน' : 'Quick'}</span>
      </div>
    </section>
  );
}

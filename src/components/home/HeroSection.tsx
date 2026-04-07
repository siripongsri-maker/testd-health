import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, TestTube, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { getCtaPriority } from '@/lib/ctaPriority';

export function HeroSection() {
  const navigate = useNavigate();
  const priority = getCtaPriority();
  const bookingFirst = priority === 'booking';

  return (
    <section className="text-center space-y-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
        ตรวจ HIV ฟรี ใกล้คุณ<br />
        <span className="text-primary">ง่าย เป็นส่วนตัว</span>
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        เลือกได้ว่าจะตรวจที่คลินิก รับชุดตรวจที่บ้าน หรือคุยกับเจ้าหน้าที่ก่อน — ฟรี และไม่ต้องเปิดเผยตัวตน
      </p>

      {/* Primary CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {priority === 'support' ? (
          <>
            <Button
              variant="hero"
              className="flex-1 sm:flex-none sm:min-w-[180px]"
              onClick={() => { trackEvent('homepage_cta_support_click', { source: 'homepage', section: 'hero' }); navigate('/support-chat'); }}
            >
              <MessageCircle className="h-5 w-5" />
              คุยกับเจ้าหน้าที่ (ไม่ระบุตัวตน)
            </Button>
            <Button
              variant="hero-outline"
              className="flex-1 sm:flex-none sm:min-w-[180px]"
              onClick={() => { trackEvent('homepage_cta_selftest_click', { source: 'homepage', section: 'hero' }); navigate('/hiv-selftest'); }}
            >
              <TestTube className="h-5 w-5" />
              รับชุดตรวจ HIV ฟรี ส่งถึงบ้าน
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="hero"
              className="flex-1 sm:flex-none sm:min-w-[180px]"
              onClick={() => {
                const ev = bookingFirst ? 'homepage_cta_booking_click' : 'homepage_cta_selftest_click';
                trackEvent(ev, { source: 'homepage', section: 'hero' });
                navigate(bookingFirst ? '/booking' : '/hiv-selftest');
              }}
            >
              {bookingFirst ? <Calendar className="h-5 w-5" /> : <TestTube className="h-5 w-5" />}
              {bookingFirst ? 'จองตรวจ HIV ฟรี วันนี้' : 'รับชุดตรวจ HIV ฟรี ส่งถึงบ้าน'}
            </Button>
            <Button
              variant="hero-outline"
              className="flex-1 sm:flex-none sm:min-w-[180px]"
              onClick={() => {
                const ev = bookingFirst ? 'homepage_cta_selftest_click' : 'homepage_cta_booking_click';
                trackEvent(ev, { source: 'homepage', section: 'hero' });
                navigate(bookingFirst ? '/hiv-selftest' : '/booking');
              }}
            >
              {bookingFirst ? <TestTube className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
              {bookingFirst ? 'รับชุดตรวจ HIV ฟรี ส่งถึงบ้าน' : 'จองตรวจ HIV ฟรี วันนี้'}
            </Button>
          </>
        )}
      </div>

      {/* Trust microcopy */}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <span>✅ ฟรี ไม่มีค่าใช้จ่าย</span>
        <span>🔒 ไม่ต้องใช้ชื่อจริง</span>
        <span>⏱ ใช้เวลาไม่นาน</span>
      </div>

      {/* Secondary CTA */}
      <button
        onClick={() => { trackEvent('homepage_cta_support_click', { source: 'homepage', section: 'hero' }); navigate('/support-chat'); }}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <MessageCircle className="h-4 w-4" />
        คุยกับเจ้าหน้าที่ (ไม่ระบุตัวตน)
      </button>
    </section>
  );
}

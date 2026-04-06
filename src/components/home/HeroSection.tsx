import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, TestTube, MessageCircle } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();

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
        <Button
          variant="hero"
          className="flex-1 sm:flex-none sm:min-w-[180px]"
          onClick={() => navigate('/booking')}
        >
          <Calendar className="h-5 w-5" />
          จองตรวจที่คลินิก
        </Button>
        <Button
          variant="hero-outline"
          className="flex-1 sm:flex-none sm:min-w-[180px]"
          onClick={() => navigate('/hiv-selftest')}
        >
          <TestTube className="h-5 w-5" />
          รับชุดตรวจฟรี
        </Button>
      </div>

      {/* Secondary CTA */}
      <button
        onClick={() => navigate('/support-chat')}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <MessageCircle className="h-4 w-4" />
        ขอคำปรึกษาก่อน
      </button>
    </section>
  );
}

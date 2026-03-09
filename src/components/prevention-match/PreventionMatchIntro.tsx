import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandHeader } from './BrandHeader';

interface Props {
  onStart: () => void;
}

export function PreventionMatchIntro({ onStart }: Props) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
          {/* Decorative gradient blobs */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-primary/20 via-pink-500/15 to-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-blue-500/15 rounded-full blur-3xl" />

          <div className="relative z-10 space-y-6">
            {/* Branding */}
            <BrandHeader size="lg" />

            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="text-white h-10 w-10" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Prevention Match</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                ตอบคำถามสั้น ๆ เพื่อค้นหาสไตล์การดูแลสุขภาพ การเดท และคู่ที่เข้ากับคุณ
              </p>
            </div>

            {/* Helper */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
              <span>⏱</span>
              <span>ใช้เวลาไม่ถึง 1 นาที</span>
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full rounded-xl text-base font-semibold h-12"
              onClick={onStart}
            >
              เริ่มแบบทดสอบ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

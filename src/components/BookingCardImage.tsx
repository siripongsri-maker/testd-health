import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Camera, Share2 } from 'lucide-react';

interface BookingCardImageProps {
  referralCode: string;
  branchName: string;
  appointmentDate: string;
  startTime: string;
  servicesSummary?: string;
  status?: string;
}

export function BookingCardImage({
  referralCode,
  branchName,
  appointmentDate,
  startTime,
  servicesSummary,
  status,
}: BookingCardImageProps) {
  const { language } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const generatePng = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error('Image generation failed', err);
      return null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    const blob = await generatePng();
    if (!blob) {
      toast.error(language === 'th' ? 'สร้างรูปไม่สำเร็จ' : 'Failed to generate image');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${referralCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(language === 'th' ? 'บันทึกรูปแล้ว ✅' : 'Image saved ✅');
  }, [generatePng, referralCode, language]);

  const handleShare = useCallback(async () => {
    const blob = await generatePng();
    if (!blob) {
      toast.error(language === 'th' ? 'สร้างรูปไม่สำเร็จ' : 'Failed to generate image');
      return;
    }
    const file = new File([blob], `booking-${referralCode}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: language === 'th' ? 'นัดหมายของฉัน' : 'My Appointment',
          files: [file],
        });
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          toast.error(language === 'th' ? 'แชร์ไม่สำเร็จ' : 'Share failed');
        }
      }
    } else {
      // Fallback to download
      handleSave();
    }
  }, [generatePng, referralCode, language, handleSave]);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const timeDisplay = startTime?.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* The card to be captured */}
      <div
        ref={cardRef}
        style={{
          width: 380,
          padding: 28,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #f5f0ff 100%)',
          borderRadius: 20,
          border: '2px solid #e0e7ff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative corner */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: 80,
          background: 'linear-gradient(135deg, transparent 50%, #818cf8 50%)',
          borderRadius: '0 18px 0 0', opacity: 0.15,
        }} />

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
            {language === 'th' ? 'บัตรนัดหมาย' : 'Booking Card'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>SWING / TestD</div>
        </div>

        {/* Referral code - LARGEST */}
        <div style={{
          background: '#ffffff',
          border: '2px dashed #818cf8',
          borderRadius: 14,
          padding: '14px 16px',
          textAlign: 'center',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {language === 'th' ? 'รหัสนัดหมาย' : 'Booking Code'}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 32,
            fontWeight: 900,
            color: '#4f46e5',
            letterSpacing: 4,
            lineHeight: 1.2,
          }}>
            {referralCode}
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{branchName}</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span style={{ fontSize: 14, color: '#334155' }}>{appointmentDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{timeDisplay}</span>
            </div>
          </div>
          {servicesSummary && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🩺</span>
              <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{servicesSummary}</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        {status && (
          <div style={{
            display: 'inline-block',
            background: '#dbeafe',
            color: '#2563eb',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 14,
          }}>
            {status}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            📱 {language === 'th' ? 'แสดงหน้าจอนี้ให้เจ้าหน้าที่ลงทะเบียน' : 'Show this to registration staff'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5 flex-1"
          onClick={handleSave}
        >
          <Camera className="h-3.5 w-3.5" />
          {language === 'th' ? 'บันทึกเป็นรูป' : 'Save as image'}
        </Button>
        {canShare && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 flex-1"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5" />
            {language === 'th' ? 'แชร์' : 'Share'}
          </Button>
        )}
      </div>

      {/* Helper note */}
      <p className="text-[10px] text-muted-foreground text-center">
        {language === 'th'
          ? "บน iPhone ให้กด 'แชร์' แล้วเลือก 'บันทึกรูปภาพ'"
          : "On iPhone, tap Share then choose Save Image."}
      </p>
    </div>
  );
}

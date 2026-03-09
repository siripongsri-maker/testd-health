import { QRCodeSVG } from 'qrcode.react';

interface Props {
  size?: number;
  className?: string;
}

function getQuizUrl() {
  // Use published URL if available, fallback to current origin
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://testd-health.lovable.app';
  return `${base}/prevention-match`;
}

export function PreventionMatchQrCard({ size = 100, className = '' }: Props) {
  const url = getQuizUrl();

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="bg-white rounded-xl p-2.5 shadow-sm">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#1a1a2e"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center">
        สแกนเพื่อค้นหาสไตล์ของคุณ
      </p>
    </div>
  );
}

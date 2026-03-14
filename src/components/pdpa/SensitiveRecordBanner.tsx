import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface SensitiveRecordBannerProps {
  classification?: string;
  className?: string;
}

/** Warning banner shown when viewing sensitive / highly restricted data */
export function SensitiveRecordBanner({ classification = 'sensitive', className = '' }: SensitiveRecordBannerProps) {
  const { language } = useLanguage();
  const th = language === 'th';
  const isHighlyRestricted = classification === 'highly_restricted';

  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${
      isHighlyRestricted 
        ? 'border-destructive/30 bg-destructive/5' 
        : 'border-warning/30 bg-warning/5'
    } ${className}`}>
      <ShieldAlert className={`h-5 w-5 shrink-0 ${
        isHighlyRestricted ? 'text-destructive' : 'text-warning'
      }`} />
      <div>
        <p className={`text-sm font-medium ${
          isHighlyRestricted ? 'text-destructive' : 'text-warning'
        }`}>
          {isHighlyRestricted
            ? (th ? '⚠️ ข้อมูลจำกัดขั้นสูง — เข้าถึงเมื่อจำเป็นเท่านั้น' : '⚠️ Highly Restricted Data — Access only when necessary')
            : (th ? '🔒 ข้อมูลส่วนบุคคลที่ละเอียดอ่อน — ข้อมูลนี้ได้รับการคุ้มครองภายใต้ PDPA' : '🔒 Sensitive Personal Data — Protected under Thailand PDPA')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {th
            ? 'การเข้าถึงทั้งหมดจะถูกบันทึกไว้ ห้ามแชร์ ส่งออก หรือคัดลอกโดยไม่ได้รับอนุญาต'
            : 'All access is logged. Do not share, export, or copy without authorization.'}
        </p>
      </div>
    </div>
  );
}

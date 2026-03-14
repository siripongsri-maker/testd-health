import { Shield, Info } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface PrivacyNoticeBannerProps {
  /** What data is being collected */
  purposeTh: string;
  purposeEn: string;
  /** Optional: why it's needed */
  reasonTh?: string;
  reasonEn?: string;
  className?: string;
}

/** Just-in-time privacy notice — show before collecting sensitive data */
export function PrivacyNoticeBanner({ purposeTh, purposeEn, reasonTh, reasonEn, className = '' }: PrivacyNoticeBannerProps) {
  const { language } = useLanguage();
  const th = language === 'th';

  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {th ? 'ทำไมเราต้องการข้อมูลนี้' : 'Why we need this data'}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {th ? purposeTh : purposeEn}
          </p>
          {(reasonTh || reasonEn) && (
            <div className="flex items-start gap-1.5 mt-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {th ? reasonTh : reasonEn}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

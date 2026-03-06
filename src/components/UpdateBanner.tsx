import { RefreshCw, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface UpdateBannerProps {
  messageTh: string;
  messageEn: string;
  hasUnsavedWork: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  isUpdating?: boolean;
}

export function UpdateBanner({ messageTh, messageEn, hasUnsavedWork, onUpdate, onDismiss, isUpdating = false }: UpdateBannerProps) {
  const { language } = useLanguage();

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50 animate-slide-up",
      "sm:left-auto sm:right-4 sm:max-w-sm"
    )}>
      <div className="relative flex items-center gap-3 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-lg p-4 shadow-lg">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/60 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground">
            {language === 'th' ? messageTh : messageEn}
          </p>
          {hasUnsavedWork && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'th'
                ? '⚠️ คุณมีข้อมูลที่ยังไม่ได้บันทึก'
                : '⚠️ You have unsaved work'}
            </p>
          )}
        </div>

        <button
          onClick={onUpdate}
          disabled={isUpdating}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isUpdating ? (language === 'th' ? 'กำลังอัปเดต...' : 'Updating...') : (language === 'th' ? 'อัปเดต' : 'Update')}
        </button>
      </div>
    </div>
  );
}

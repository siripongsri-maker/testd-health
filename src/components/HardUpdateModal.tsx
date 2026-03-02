import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface HardUpdateModalProps {
  messageTh: string;
  messageEn: string;
  hasUnsavedWork: boolean;
  onUpdate: () => void;
  onDefer: () => void;
  canDefer: boolean;
}

export function HardUpdateModal({ messageTh, messageEn, hasUnsavedWork, onUpdate, onDefer, canDefer }: HardUpdateModalProps) {
  const { language } = useLanguage();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {language === 'th' ? 'จำเป็นต้องอัปเดต' : 'Update Required'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? messageTh : messageEn}
            </p>
          </div>

          {hasUnsavedWork && (
            <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {language === 'th'
                  ? '⚠️ ระบบจะพยายามบันทึกข้อมูลของคุณก่อนรีเฟรช'
                  : '⚠️ The system will try to save your data before refreshing'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full pt-2">
            <Button onClick={onUpdate} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {language === 'th' ? 'อัปเดตตอนนี้' : 'Update Now'}
            </Button>

            {canDefer && hasUnsavedWork && (
              <Button variant="ghost" size="sm" onClick={onDefer} className="text-muted-foreground">
                {language === 'th' ? 'เลื่อนออกไป 60 วินาที' : 'Defer for 60 seconds'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogIn } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface SessionTimeoutDialogProps {
  open: boolean;
  onReLogin: () => void;
}

/** Shown when staff session times out due to inactivity */
export function SessionTimeoutDialog({ open, onReLogin }: SessionTimeoutDialogProps) {
  const { language } = useLanguage();
  const th = language === 'th';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-4" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle>{th ? 'เซสชันหมดเวลา' : 'Session Timed Out'}</DialogTitle>
              <DialogDescription>
                {th
                  ? 'เซสชันของคุณหมดเวลาเนื่องจากไม่มีการใช้งาน กรุณาเข้าสู่ระบบอีกครั้งเพื่อดำเนินการต่อ'
                  : 'Your session has timed out due to inactivity. Please log in again to continue.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
          <p className="text-xs text-muted-foreground">
            {th
              ? '🔒 มาตรการนี้ช่วยปกป้องข้อมูลที่ละเอียดอ่อนตาม PDPA'
              : '🔒 This security measure protects sensitive data under PDPA compliance.'}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onReLogin} className="w-full gap-2">
            <LogIn className="h-4 w-4" />
            {th ? 'เข้าสู่ระบบอีกครั้ง' : 'Log in again'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

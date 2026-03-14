import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface AccessReasonPromptProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  targetLabel?: string;
}

/** Prompt staff to provide a reason before accessing sensitive records */
export function AccessReasonPrompt({ open, onConfirm, onCancel, targetLabel }: AccessReasonPromptProps) {
  const [reason, setReason] = useState('');
  const { language } = useLanguage();
  const th = language === 'th';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <ShieldAlert className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle>
                {th ? 'ยืนยันการเข้าถึง' : 'Confirm Access'}
              </DialogTitle>
              <DialogDescription>
                {th
                  ? `คุณกำลังจะเข้าถึงข้อมูลที่ละเอียดอ่อน${targetLabel ? ` (${targetLabel})` : ''} กรุณาระบุเหตุผล`
                  : `You are about to access sensitive data${targetLabel ? ` (${targetLabel})` : ''}. Please provide a reason.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={th ? 'ระบุเหตุผลในการเข้าถึง...' : 'State your reason for access...'}
          rows={3}
          maxLength={500}
        />

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {th ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={reason.trim().length < 3}>
            {th ? 'ยืนยัน' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

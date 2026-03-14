import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileDown, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface ExportApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  exportType: string;
  recordCount: number;
  classification?: string;
  loading?: boolean;
}

/** Require reason before exporting sensitive data */
export function ExportApprovalModal({
  open, onOpenChange, onConfirm, exportType, recordCount, classification = 'internal', loading
}: ExportApprovalModalProps) {
  const [reason, setReason] = useState('');
  const { language } = useLanguage();
  const th = language === 'th';
  const isSensitive = classification === 'sensitive' || classification === 'highly_restricted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isSensitive ? 'bg-destructive/10' : 'bg-primary/10'
            }`}>
              {isSensitive ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <FileDown className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <DialogTitle>{th ? 'ยืนยันการส่งออก' : 'Confirm Export'}</DialogTitle>
              <DialogDescription>
                {th ? `ส่งออก ${recordCount} รายการ — ${exportType}` : `Export ${recordCount} records — ${exportType}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Badge variant={isSensitive ? 'destructive' : 'secondary'}>
            {classification}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {th ? 'การส่งออกจะถูกบันทึกในระบบตรวจสอบ' : 'This export will be recorded in the audit log'}
          </span>
        </div>

        {isSensitive && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">
              {th
                ? '⚠️ ไฟล์ที่ส่งออกประกอบด้วยข้อมูลส่วนบุคคลที่ละเอียดอ่อน ห้ามแชร์โดยไม่ได้รับอนุญาต'
                : '⚠️ This export contains sensitive personal data. Do not share without authorization.'}
            </p>
          </div>
        )}

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={th ? 'ระบุวัตถุประสงค์การส่งออก...' : 'State the purpose of this export...'}
          rows={2}
          maxLength={300}
        />

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {th ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            variant={isSensitive ? 'destructive' : 'default'}
            onClick={() => onConfirm(reason)}
            disabled={reason.trim().length < 3 || loading}
          >
            {loading ? (th ? 'กำลังส่งออก...' : 'Exporting...') : (th ? 'ยืนยันส่งออก' : 'Confirm Export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

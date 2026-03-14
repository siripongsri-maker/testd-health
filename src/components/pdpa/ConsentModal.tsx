import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { ConsentVersion } from '@/hooks/useConsent';

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentVersion: ConsentVersion;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

export function ConsentModal({ open, onOpenChange, consentVersion, onAccept, onDecline, loading }: ConsentModalProps) {
  const { language } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const th = language === 'th';

  const title = th ? consentVersion.title_th : consentVersion.title_en;
  const summary = th ? consentVersion.summary_th : consentVersion.summary_en;
  const fullText = th ? consentVersion.full_text_th : consentVersion.full_text_en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                v{consentVersion.version}
              </p>
            </div>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {summary}
          </DialogDescription>
        </DialogHeader>

        {/* Expandable full text */}
        <div className="mt-2">
          <button
            onClick={() => setShowFull(!showFull)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {showFull
              ? (th ? 'ซ่อนรายละเอียด' : 'Hide details')
              : (th ? 'อ่านเพิ่มเติม' : 'Read more')}
            {showFull ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showFull && (
            <ScrollArea className="max-h-48 mt-2 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {fullText}
              </p>
            </ScrollArea>
          )}
        </div>

        {/* Checkbox */}
        <div className="mt-4 rounded-lg border border-border p-3 bg-muted/30">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-relaxed">
              {th
                ? 'ข้าพเจ้ายินยอมให้ประมวลผลข้อมูลตามวัตถุประสงค์ที่ระบุไว้ข้างต้น'
                : 'I consent to the processing of my data for the purposes described above.'}
            </span>
          </label>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onDecline} disabled={loading}>
            {th ? 'ปฏิเสธ' : 'Decline'}
          </Button>
          <Button onClick={onAccept} disabled={!agreed || loading}>
            {loading
              ? (th ? 'กำลังบันทึก...' : 'Saving...')
              : (th ? 'ยินยอม' : 'Accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

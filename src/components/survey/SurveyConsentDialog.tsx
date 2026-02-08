import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Eye, Lock, UserX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SurveyConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (isAnonymous: boolean) => void;
  consentTextTh?: string;
  consentTextEn?: string;
  allowAnonymous?: boolean;
}

export function SurveyConsentDialog({
  open,
  onOpenChange,
  onConsent,
  consentTextTh = "ข้อมูลของคุณจะถูกเก็บรักษาเป็นความลับและใช้เพื่อการวิจัยเท่านั้น",
  consentTextEn = "Your data will be kept confidential and used for research purposes only.",
  allowAnonymous = true,
}: SurveyConsentDialogProps) {
  const { language } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const handleContinue = () => {
    if (agreed) {
      onConsent(isAnonymous);
    }
  };

  const privacyPoints = [
    {
      icon: Lock,
      text_th: "ข้อมูลของคุณจะถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย",
      text_en: "Your data is encrypted and stored securely",
    },
    {
      icon: Eye,
      text_th: "ใช้เพื่อการวิจัยและปรับปรุงบริการเท่านั้น",
      text_en: "Used only for research and service improvement",
    },
    {
      icon: UserX,
      text_th: "จะไม่มีการแชร์ข้อมูลกับบุคคลที่สาม",
      text_en: "Data will not be shared with third parties",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {language === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {language === 'th' ? consentTextTh : consentTextEn}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {privacyPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm text-foreground">
                  {language === 'th' ? point.text_th : point.text_en}
                </span>
              </div>
            );
          })}
        </div>

        {allowAnonymous && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <UserX className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {language === 'th' ? 'ตอบแบบไม่ระบุตัวตน' : 'Respond anonymously'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' 
                    ? 'ไม่เชื่อมโยงกับบัญชีของคุณ' 
                    : 'Not linked to your account'}
                </p>
              </div>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
        )}

        <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
          <Checkbox
            id="consent"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
            {language === 'th'
              ? 'ฉันได้อ่านและยอมรับนโยบายความเป็นส่วนตัวในการเก็บข้อมูล'
              : 'I have read and accept the privacy policy for data collection'}
          </Label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!agreed}
            className="flex-1"
          >
            {language === 'th' ? 'เริ่มทำแบบสำรวจ' : 'Start Survey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

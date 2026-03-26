import { useLanguage } from "@/lib/i18n";
import { Shield, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

export function FeedbackIntroCard({ data, update }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'แบบประเมินความพึงพอใจ' : 'Client Feedback & Outcome Form'}
        </h1>
        <p className="text-sm text-foreground/80">
          {language === 'th' ? 'และผลลัพธ์การบริการ' : ''}
        </p>
      </div>

      {/* Privacy notice */}
      <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          {language === 'th' ? 'ข้อมูลของคุณปลอดภัย' : 'Your data is safe'}
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6">
          <li>🔒 {language === 'th' ? 'ข้อมูลทุกอย่างถูกเก็บเป็นความลับ' : 'All data is kept confidential'}</li>
          <li>👤 {language === 'th' ? 'ไม่ระบุตัวตน' : 'Anonymous'}</li>
          <li>✋ {language === 'th' ? 'การตอบเป็นความสมัครใจ' : 'Voluntary participation'}</li>
        </ul>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {language === 'th' ? 'วันที่รับบริการ' : 'Service Date'}
        </Label>
        <Input
          type="date"
          value={data.service_date}
          onChange={e => update({ service_date: e.target.value })}
          className="rounded-xl"
        />
      </div>

      {/* Channel */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {language === 'th' ? 'ช่องทางบริการ' : 'Service Channel'}
        </Label>
        <RadioGroup value={data.channel} onValueChange={v => update({ channel: v })} className="grid grid-cols-3 gap-2">
          {[
            { value: 'clinic', th: '🏥 คลินิก', en: '🏥 Clinic' },
            { value: 'outreach', th: '🚐 Outreach', en: '🚐 Outreach' },
            { value: 'online', th: '💻 Online', en: '💻 Online' },
          ].map(opt => (
            <Label
              key={opt.value}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                ${data.channel === opt.value ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}
            >
              <RadioGroupItem value={opt.value} className="sr-only" />
              {language === 'th' ? opt.th : opt.en}
            </Label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

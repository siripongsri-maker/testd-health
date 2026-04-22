import { useLanguage } from "@/lib/i18n";
import { Shield, Lock, SkipForward } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
          {language === 'th' ? 'แบบประเมินความพึงพอใจและผลลัพธ์การบริการ' : 'Client Feedback & Outcome Form'}
        </h1>
        <p className="text-xs text-foreground/70">
          {language === 'th'
            ? 'ใช้เวลาประมาณ 2–3 นาที · ขอบคุณที่ช่วยพัฒนาบริการของเรา'
            : 'Takes about 2–3 minutes · Thank you for helping us improve'}
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
          <li>👤 {language === 'th' ? 'ไม่ระบุตัวตน (Anonymous)' : 'Anonymous'}</li>
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
            { value: 'outreach', th: '🚐 ลงพื้นที่ (Outreach)', en: '🚐 Outreach' },
            { value: 'online', th: '💻 ออนไลน์ (Online)', en: '💻 Online' },
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

      {/* Skip UIC option — prominent */}
      <div className={`rounded-2xl border-2 p-5 space-y-3 transition-all ${
        data.skip_uic
          ? 'border-primary bg-primary/10'
          : 'border-primary/40 bg-primary/5'
      }`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <SkipForward className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {language === 'th'
                ? 'ไม่อยากกรอก รหัสประจำตัวผู้รับบริการ (UIC)?'
                : "Don't want to enter a UIC?"}
            </p>
            <p className="text-xs text-foreground/70 leading-relaxed">
              {language === 'th'
                ? 'ถ้าคุณเลือกบริการ การลดอันตราย (Harm Reduction) หรือ สุขภาพจิต (Mental Health) ระบบจะขอ UIC ในขั้นตอนถัดไป — กดปุ่มด้านล่างเพื่อ ข้าม ขั้นตอนนั้นได้เลย'
                : 'If you pick Harm Reduction or Mental Health, the next step asks for a UIC — tap below to skip it.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={data.skip_uic ? 'default' : 'outline'}
          size="lg"
          onClick={() => update({ skip_uic: !data.skip_uic, uic: data.skip_uic ? data.uic : '' })}
          className="w-full font-semibold"
        >
          <SkipForward className="h-5 w-5 mr-2" />
          {data.skip_uic
            ? (language === 'th' ? '✓ จะข้ามขั้นตอน UIC แล้ว (แตะอีกครั้งเพื่อยกเลิก)' : '✓ Will skip UIC (tap to undo)')
            : (language === 'th' ? 'ข้ามขั้นตอน UIC' : 'Skip UIC step')}
        </Button>

        {data.skip_uic && (
          <p className="text-xs text-foreground/70 text-center font-medium">
            {language === 'th'
              ? '🎉 เรียบร้อย! ระบบจะไม่ถาม UIC และส่งฟอร์มได้ตามปกติ'
              : '🎉 Done! UIC will be skipped and the form will submit normally.'}
          </p>
        )}
      </div>
    </div>
  );
}

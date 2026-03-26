import { useLanguage } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

export function OpenFeedbackSection({ data, update }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">
          💬 {language === 'th' ? 'ความคิดเห็นเพิ่มเติม' : 'Additional Feedback'}
        </h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">13.</span>
          {language === 'th' ? 'มีอะไรอยากบอกเราเพิ่มเติมไหม?' : 'Anything else you\'d like to tell us?'}
        </p>
        <p className="text-xs text-muted-foreground">
          {language === 'th' ? 'ไม่จำเป็นต้องตอบ' : 'Optional'}
        </p>
        <Textarea
          value={data.open_feedback}
          onChange={e => update({ open_feedback: e.target.value })}
          placeholder={language === 'th' ? 'พิมพ์ข้อความที่นี่...' : 'Type here...'}
          className="min-h-[120px] rounded-xl"
          maxLength={2000}
        />
      </div>
    </div>
  );
}

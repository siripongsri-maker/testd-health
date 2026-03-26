import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

const referralOptions = [
  { value: 'accessed', th: 'เข้ารับบริการแล้ว', en: 'Already accessed' },
  { value: 'intending', th: 'ตั้งใจจะไปแต่ยังไม่ได้เข้ารับบริการ', en: 'Intending but not yet accessed' },
  { value: 'not_accessed', th: 'ไม่เข้ารับบริการ', en: 'Not accessed' },
];

const outcomeOptions = [
  { value: 'much_better', th: 'ดีขึ้นมาก', en: 'Much better' },
  { value: 'slightly_better', th: 'ดีขึ้นเล็กน้อย', en: 'Slightly better' },
  { value: 'no_change', th: 'ไม่เปลี่ยนแปลง', en: 'No change' },
  { value: 'worse', th: 'แย่ลง', en: 'Worse' },
];

export function MentalHealthSection({ data, update }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">
          🧠 {language === 'th' ? 'สุขภาพจิต' : 'Mental Health'}
        </h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">11.</span>
          {language === 'th' ? 'คุณได้เข้ารับบริการสุขภาพจิตที่ได้รับการส่งต่อหรือไม่' : 'Did you access the referred mental health service?'}
        </p>
        <div className="space-y-1.5">
          {referralOptions.map(opt => (
            <button key={opt.value} type="button" onClick={() => update({ mh_referral: opt.value })}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border
                ${data.mh_referral === opt.value ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-transparent bg-muted/30 text-muted-foreground'}`}>
              {language === 'th' ? opt.th : opt.en}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">12.</span>
          {language === 'th' ? 'หลังรับบริการด้านสุขภาพจิต คุณรู้สึกว่าสุขภาวะทางจิตใจของคุณเป็นอย่างไร' : 'How do you feel about your mental wellbeing after the service?'}
        </p>
        <div className="space-y-1.5">
          {outcomeOptions.map(opt => (
            <button key={opt.value} type="button" onClick={() => update({ mh_outcome: opt.value })}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border
                ${data.mh_outcome === opt.value ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-transparent bg-muted/30 text-muted-foreground'}`}>
              {language === 'th' ? opt.th : opt.en}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

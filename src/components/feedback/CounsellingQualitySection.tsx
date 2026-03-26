import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

const questions = [
  { key: 'q1' as const, th: 'คุณรู้สึกสบายใจ และได้รับการปฏิบัติด้วยความเคารพ ไม่ถูกตัดสินตลอดการพูดคุย', en: 'You felt comfortable and were treated with respect without judgment' },
  { key: 'q2' as const, th: 'ผู้ให้คำปรึกษาพูดคุยเรื่องเพศสัมพันธ์และการใช้สารได้อย่างเปิดเผยและเป็นกันเอง', en: 'The counselor discussed sex and substance use openly and friendly' },
  { key: 'q3' as const, th: 'คุณได้รับข้อมูล HIV/STI และวิธีป้องกันที่ชัดเจนและเข้าใจง่าย', en: 'You received clear and easy-to-understand HIV/STI prevention info' },
  { key: 'q4' as const, th: 'ผู้ให้คำปรึกษาแจ้งผลตรวจและอธิบายระยะฟักตัวจนคุณเข้าใจดี', en: 'The counselor explained test results and window periods clearly' },
  { key: 'q5' as const, th: 'คุณได้รับการสาธิตใช้ถุงยางอนามัย และมีแผนติดตามบริการที่ชัดเจน', en: 'You received condom demo and a clear follow-up plan' },
];

const likertOptions = [
  { value: 4, th: 'เห็นด้วยอย่างยิ่ง', en: 'Strongly Agree' },
  { value: 3, th: 'เห็นด้วย', en: 'Agree' },
  { value: 2, th: 'เฉยๆ', en: 'Neutral' },
  { value: 1, th: 'ไม่เห็นด้วย', en: 'Disagree' },
  { value: 0, th: 'ไม่เห็นด้วยอย่างยิ่ง', en: 'Strongly Disagree' },
];

export function CounsellingQualitySection({ data, update }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">
          {language === 'th' ? 'คุณภาพการให้คำปรึกษา' : 'Counselling Quality'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {language === 'th' ? 'กรุณาทำเครื่องหมายตรงกับความรู้สึกของคุณ' : 'Please rate each statement'}
        </p>
      </div>

      {questions.map((q, idx) => (
        <div key={q.key} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            <span className="text-primary font-bold mr-1">{idx + 1}.</span>
            {language === 'th' ? q.th : q.en}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {likertOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ [q.key]: opt.value })}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border
                  ${data[q.key] === opt.value
                    ? 'border-primary bg-primary/10 text-foreground font-medium'
                    : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}
              >
                {language === 'th' ? opt.th : opt.en}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

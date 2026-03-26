import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

const serviceOptions = [
  { value: 'sti', th: '💊 STI treatment / care', en: '💊 STI treatment / care' },
  { value: 'prep', th: '🛡️ PrEP', en: '🛡️ PrEP' },
  { value: 'pep', th: '⚡ PEP', en: '⚡ PEP' },
  { value: 'art', th: '💜 ART', en: '💜 ART' },
  { value: 'harm_reduction', th: '🧡 Harm Reduction / ข้อมูล Chemsex', en: '🧡 Harm Reduction / Chemsex info' },
  { value: 'mental_health', th: '🧠 สุขภาพจิต / Psychosocial', en: '🧠 Mental Health / Psychosocial' },
  { value: 'none', th: '❌ ไม่ได้รับบริการเพิ่มเติม', en: '❌ No additional services' },
];

export function ServicesReceivedSection({ data, update }: Props) {
  const { language } = useLanguage();

  const toggle = (value: string) => {
    if (value === 'none') {
      update({ services: ['none'] });
      return;
    }
    const next = data.services.includes(value)
      ? data.services.filter(s => s !== value)
      : [...data.services.filter(s => s !== 'none'), value];
    update({ services: next });
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">
          <span className="text-primary mr-1">8.</span>
          {language === 'th' ? 'วันนี้คุณได้รับบริการอะไรบ้าง?' : 'What services did you receive today?'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {language === 'th' ? 'เลือกได้มากกว่า 1 ข้อ' : 'Select all that apply'}
        </p>
      </div>

      <div className="space-y-2">
        {serviceOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`w-full text-left px-4 py-3.5 rounded-xl text-sm transition-all border-2
              ${data.services.includes(opt.value)
                ? 'border-primary bg-primary/10 text-foreground font-medium'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30'}`}
          >
            {language === 'th' ? opt.th : opt.en}
          </button>
        ))}
      </div>
    </div>
  );
}

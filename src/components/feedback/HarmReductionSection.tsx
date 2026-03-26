import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

const knowledgeItems = [
  { key: 'hr_k1' as const, th: 'ใช้ถุงยางอนามัยและ/หรืออุปกรณ์ฉีดที่สะอาดทุกครั้งลดความเสี่ยง HIV และไวรัสตับอักเสบ C', en: 'Using condoms and clean injection equipment reduces HIV and Hep C risk' },
  { key: 'hr_k2' as const, th: 'การผสมสารหลายชนิดพร้อมกันเพิ่มความเสี่ยงต่อหัวใจและการหยุดหายใจ', en: 'Mixing multiple substances increases cardiac and respiratory risks' },
  { key: 'hr_k3' as const, th: 'การวางแผนการใช้สารและมีคนเฝ้าช่วยลดอันตรายได้มากขึ้น', en: 'Planning use and having someone watch helps reduce harm' },
];

const intentionOptions = [
  { value: 'more_condoms', th: 'ใช้ถุงยางอนามัยสม่ำเสมอมากขึ้น', en: 'Use condoms more consistently' },
  { value: 'regular_testing', th: 'ตรวจ HIV / STI เป็นประจำมากขึ้น', en: 'Test for HIV/STI more regularly' },
  { value: 'clean_equipment', th: 'ใช้อุปกรณ์ฉีดที่สะอาด', en: 'Use clean injection equipment' },
  { value: 'plan_substance_use', th: 'วางแผนการใช้สาร / หลีกเลี่ยงการผสมสาร', en: 'Plan substance use / avoid mixing' },
  { value: 'seek_help', th: 'ขอความช่วยเหลือเมื่อจำเป็น', en: 'Seek help when needed' },
  { value: 'no_change', th: 'ยังไม่มีการเปลี่ยนแปลง', en: 'No changes yet' },
];

export function HarmReductionSection({ data, update }: Props) {
  const { language } = useLanguage();

  const toggleIntention = (value: string) => {
    if (value === 'no_change') {
      update({ hr_intentions: ['no_change'] });
      return;
    }
    const next = data.hr_intentions.includes(value)
      ? data.hr_intentions.filter(i => i !== value)
      : [...data.hr_intentions.filter(i => i !== 'no_change'), value];
    update({ hr_intentions: next });
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">
          🧡 {language === 'th' ? 'Harm Reduction' : 'Harm Reduction'}
        </h2>
      </div>

      {/* Knowledge */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">9.</span>
          {language === 'th' ? 'ความรู้ — รู้ หรือ ไม่รู้?' : 'Knowledge check'}
        </p>
        {knowledgeItems.map(k => (
          <div key={k.key} className="rounded-lg bg-muted/20 p-3 space-y-2">
            <p className="text-xs text-foreground leading-relaxed">{language === 'th' ? k.th : k.en}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => update({ [k.key]: true })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border
                  ${data[k.key] === true ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-border bg-background text-muted-foreground'}`}>
                ✅ {language === 'th' ? 'รู้' : 'Know'}
              </button>
              <button type="button" onClick={() => update({ [k.key]: false })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border
                  ${data[k.key] === false ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'border-border bg-background text-muted-foreground'}`}>
                ❓ {language === 'th' ? 'ไม่รู้' : "Don't know"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Intentions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">10.</span>
          {language === 'th' ? 'หลังรับข้อมูลวันนี้ คุณตั้งใจจะเปลี่ยนอะไรบ้าง?' : 'What changes do you plan to make?'}
        </p>
        <div className="space-y-1.5">
          {intentionOptions.map(opt => (
            <button key={opt.value} type="button" onClick={() => toggleIntention(opt.value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border
                ${data.hr_intentions.includes(opt.value) ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
              {language === 'th' ? opt.th : opt.en}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

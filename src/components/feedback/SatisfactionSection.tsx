import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

export function SatisfactionSection({ data, update }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Q6: Satisfaction */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">6.</span>
          {language === 'th' ? 'โดยรวมคุณพึงพอใจกับบริการวันนี้มากน้อยแค่ไหน' : 'Overall, how satisfied are you with today\'s service?'}
        </p>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => update({ satisfaction: v })}
              className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all border-2
                ${data.satisfaction === v
                  ? 'border-primary bg-primary text-primary-foreground scale-110'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>{language === 'th' ? 'น้อยที่สุด' : 'Very Low'}</span>
          <span>{language === 'th' ? 'มากที่สุด' : 'Very High'}</span>
        </div>
      </div>

      {/* Q7: Self-efficacy */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">
          <span className="text-primary font-bold mr-1">7.</span>
          {language === 'th' ? 'หลังรับบริการวันนี้ คุณรู้สึกมั่นใจในการดูแลสุขภาพตัวเองมากขึ้นไหม' : 'After today\'s service, do you feel more confident about your health?'}
        </p>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => update({ self_efficacy: v })}
              className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all border-2
                ${data.self_efficacy === v
                  ? 'border-primary bg-primary text-primary-foreground scale-110'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>{language === 'th' ? 'ไม่เลย' : 'Not at all'}</span>
          <span>{language === 'th' ? 'มากที่สุด' : 'Very much'}</span>
        </div>
      </div>
    </div>
  );
}

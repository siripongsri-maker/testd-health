import { useLanguage } from "@/lib/i18n";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";

interface Props {
  type: 'sti' | 'prep' | 'pep' | 'art';
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}

const config = {
  sti: {
    title: { th: 'โรคติดต่อทางเพศสัมพันธ์ (STI) — การรักษาและความรู้', en: 'STI — Treatment & Knowledge' },
    icon: '💊',
    statusKey: 'sti_status' as const,
    statusOptions: [
      { value: 'treated', th: 'ได้รับยา / รักษาแล้ว', en: 'Treated' },
      { value: 'waiting_results', th: 'อยู่ระหว่างรอผล', en: 'Waiting for results' },
      { value: 'follow_up', th: 'นัดหมายครั้งถัดไปแล้ว', en: 'Follow-up scheduled' },
      { value: 'not_treated', th: 'ไม่ได้รับการรักษา', en: 'Not treated' },
    ],
    knowledge: [
      { key: 'sti_k1' as const, th: 'STI ที่ไม่รักษาจะเพิ่มความเสี่ยงในการติดและแพร่เชื้อ HIV', en: 'Untreated STIs increase HIV risk' },
      { key: 'sti_k2' as const, th: 'STI บางชนิดไม่มีอาการ แต่ยังแพร่เชื้อได้', en: 'Some STIs have no symptoms but can spread' },
      { key: 'sti_k3' as const, th: 'ควรตรวจ STI ทุก 3 เดือน ถ้ามีคู่นอนหลายคน', en: 'Screen every 3 months with multiple partners' },
    ],
  },
  prep: {
    title: { th: 'PrEP — สถานะและความรู้', en: 'PrEP — Status & Knowledge' },
    icon: '🛡️',
    statusKey: 'prep_status' as const,
    statusOptions: [
      { value: 'started_today', th: 'เริ่มกินใหม่วันนี้', en: 'Started today' },
      { value: 'continuing', th: 'กินต่อเนื่องอยู่แล้ว', en: 'Already continuing' },
      { value: 'informed', th: 'ได้รับข้อมูลแต่ยังไม่เริ่ม', en: 'Informed but not started' },
      { value: 'declined', th: 'ไม่ประสงค์ใช้', en: 'Declined' },
    ],
    knowledge: [
      { key: 'prep_k1' as const, th: 'PrEP ต้องกินทุกวันจึงป้องกัน HIV ได้อย่างมีประสิทธิภาพ', en: 'PrEP must be taken daily for effective HIV prevention' },
      { key: 'prep_k2' as const, th: 'PrEP ไม่ป้องกัน STI อื่น เช่น ซิฟิลิส หรือหนองใน', en: 'PrEP does not protect against other STIs' },
      { key: 'prep_k3' as const, th: 'ต้องตรวจ HIV และไตทุก 3 เดือนขณะกิน PrEP', en: 'HIV and kidney tests required every 3 months on PrEP' },
    ],
  },
  pep: {
    title: { th: 'PEP — สถานะและความรู้', en: 'PEP — Status & Knowledge' },
    icon: '⚡',
    statusKey: 'pep_status' as const,
    statusOptions: [
      { value: 'started', th: 'ได้รับยาและเริ่มกินแล้ว', en: 'Received and started' },
      { value: 'received_not_started', th: 'ได้รับยาแต่ยังไม่ได้เริ่ม', en: 'Received but not started' },
      { value: 'not_received', th: 'ไม่ได้รับยา', en: 'Not received' },
    ],
    knowledge: [
      { key: 'pep_k1' as const, th: 'PEP ต้องเริ่มกินภายใน 72 ชั่วโมงหลังเสี่ยง', en: 'PEP must start within 72 hours of exposure' },
      { key: 'pep_k2' as const, th: 'ต้องกินต่อเนื่องครบ 28 วัน จึงจะมีผล', en: 'Must complete full 28-day course' },
      { key: 'pep_k3' as const, th: 'PEP ไม่ใช่ยาคุมฉุกเฉิน ใช้เฉพาะกรณีเสี่ยงจริงๆ', en: 'PEP is not emergency contraception — for real exposure only' },
    ],
  },
  art: {
    title: { th: 'ART — สถานะและความรู้', en: 'ART — Status & Knowledge' },
    icon: '💜',
    statusKey: 'art_status' as const,
    statusOptions: [
      { value: 'started', th: 'เริ่มรักษาแล้ว', en: 'Treatment started' },
      { value: 'scheduled', th: 'มีนัดแต่ยังไม่ได้เริ่ม', en: 'Scheduled but not started' },
      { value: 'evaluating', th: 'อยู่ระหว่างรอการประเมิน', en: 'Under evaluation' },
      { value: 'no_appointment', th: 'ยังไม่มีนัด', en: 'No appointment yet' },
    ],
    knowledge: [
      { key: 'art_k1' as const, th: 'กินยา ART สม่ำเสมอทำให้ปริมาณไวรัสลดจนตรวจไม่พบ (Undetectable)', en: 'Consistent ART leads to undetectable viral load' },
      { key: 'art_k2' as const, th: 'เมื่อ Undetectable = Untransmittable (U=U) ไม่แพร่เชื้อทางเพศสัมพันธ์', en: 'U=U: Undetectable means Untransmittable' },
      { key: 'art_k3' as const, th: 'ไม่หยุดยาเองแม้รู้สึกดีขึ้นแล้ว', en: 'Never stop medication even if feeling better' },
    ],
  },
};

export function ServiceKnowledgeCard({ type, data, update }: Props) {
  const { language } = useLanguage();
  const c = config[type];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <span>{c.icon}</span>
        {language === 'th' ? c.title.th : c.title.en}
      </h3>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {language === 'th' ? 'สถานะ' : 'Status'}
        </p>
        <div className="space-y-1.5">
          {c.statusOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ [c.statusKey]: opt.value })}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border
                ${data[c.statusKey] === opt.value
                  ? 'border-primary bg-primary/10 text-foreground font-medium'
                  : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
            >
              {language === 'th' ? opt.th : opt.en}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge checks */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {language === 'th' ? 'ความรู้ — รู้ หรือ ไม่รู้?' : 'Knowledge check — Know or Don\'t know?'}
        </p>
        {c.knowledge.map(k => (
          <div key={k.key} className="rounded-lg bg-muted/20 p-3 space-y-2">
            <p className="text-xs text-foreground leading-relaxed">
              {language === 'th' ? k.th : k.en}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => update({ [k.key]: true })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border
                  ${data[k.key] === true
                    ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-border bg-background text-muted-foreground hover:border-green-400'}`}
              >
                ✅ {language === 'th' ? 'รู้' : 'Know'}
              </button>
              <button
                type="button"
                onClick={() => update({ [k.key]: false })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border
                  ${data[k.key] === false
                    ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400'
                    : 'border-border bg-background text-muted-foreground hover:border-orange-400'}`}
              >
                ❓ {language === 'th' ? 'ไม่รู้' : "Don't know"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

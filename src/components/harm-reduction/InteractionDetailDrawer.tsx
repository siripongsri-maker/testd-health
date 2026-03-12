import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle, Heart, Shield, MessageCircle,
  BookOpen, Zap, Activity, ShieldAlert, ShieldCheck, HelpCircle,
  Phone,
} from "lucide-react";
import { trackEvent } from "@/hooks/useAnalytics";

export interface InteractionDetail {
  id: string;
  substance_a_id: string;
  substance_b_id: string;
  risk_level: string;
  description_th: string | null;
  description_en: string | null;
  interaction_type: string | null;
  summary_th: string | null;
  summary_en: string | null;
  why_risky_th: string | null;
  why_risky_en: string | null;
  possible_effects_th: string[];
  possible_effects_en: string[];
  warning_signs_th: string[];
  warning_signs_en: string[];
  harm_reduction_tips_th: string[];
  harm_reduction_tips_en: string[];
  emergency_signs_th: string[];
  emergency_signs_en: string[];
  is_priority: boolean;
}

interface Props {
  interaction: InteractionDetail | null;
  nameA: string;
  nameB: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onViewSubstance?: (id: string) => void;
}

/* ── Calm health risk meta using design tokens ── */
const riskMeta: Record<string, {
  labelEn: string; labelTh: string;
  badgeBg: string; badgeText: string;
  cardBg: string;
  Icon: React.ElementType;
}> = {
  critical: {
    labelEn: "Critical risk", labelTh: "ความเสี่ยงวิกฤต",
    badgeBg: "bg-hr-risk-critical/15", badgeText: "text-hr-risk-critical",
    cardBg: "bg-hr-risk-critical/[0.06]",
    Icon: ShieldAlert,
  },
  high: {
    labelEn: "High risk", labelTh: "ความเสี่ยงสูง",
    badgeBg: "bg-hr-risk-high/12", badgeText: "text-hr-risk-high",
    cardBg: "bg-hr-risk-high/[0.06]",
    Icon: AlertTriangle,
  },
  moderate: {
    labelEn: "Caution", labelTh: "ควรระวัง",
    badgeBg: "bg-hr-risk-caution/15", badgeText: "text-hr-risk-high-caution",
    cardBg: "bg-hr-risk-caution/[0.08]",
    Icon: Shield,
  },
  low: {
    labelEn: "Lower relative risk", labelTh: "ความเสี่ยงต่ำกว่าเมื่อเทียบกัน",
    badgeBg: "bg-hr-risk-low/15", badgeText: "text-hr-risk-low",
    cardBg: "bg-hr-risk-low/[0.06]",
    Icon: ShieldCheck,
  },
  unknown: {
    labelEn: "Limited evidence", labelTh: "ข้อมูลยังจำกัด",
    badgeBg: "bg-hr-risk-unknown/12", badgeText: "text-hr-risk-unknown",
    cardBg: "bg-hr-surface",
    Icon: HelpCircle,
  },
};

const interactionTypeLabels: Record<string, { en: string; th: string }> = {
  stimulant_depressant: { en: "Stimulant + Depressant", th: "สารกระตุ้น + สารกดประสาท" },
  respiratory_depression: { en: "Respiratory Depression Risk", th: "เสี่ยงหายใจล้มเหลว" },
  cardiovascular: { en: "Cardiovascular Risk", th: "เสี่ยงหัวใจ" },
  serotonin_toxicity: { en: "Serotonin Toxicity Risk", th: "เสี่ยง Serotonin Syndrome" },
  stimulant_stimulant: { en: "Stimulant + Stimulant", th: "สารกระตุ้น + สารกระตุ้น" },
  depressant_depressant: { en: "Depressant + Depressant", th: "สารกดประสาท + สารกดประสาท" },
  psychedelic_amplification: { en: "Psychedelic Amplification", th: "เพิ่มผลหลอนประสาท" },
  dehydration_overheating: { en: "Dehydration / Overheating", th: "ขาดน้ำ / ร้อนเกิน" },
  dissociation_blackout: { en: "Dissociation / Blackout", th: "สับสน / หมดสติ" },
};

/* ── Section card ── */
function DetailSection({ icon: Icon, title, items, iconBg, variant = "list" }: {
  icon: React.ElementType;
  title: string;
  items: string[];
  iconBg: string;
  variant?: "list" | "chips";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card p-5 space-y-3" style={{ boxShadow: "var(--hr-card-shadow)" }}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h4 className="text-[14px] font-semibold text-foreground">{title}</h4>
      </div>
      {variant === "chips" ? (
        <div className="flex flex-wrap gap-2 ml-12">
          {items.map((item, i) => (
            <span key={i} className="text-[13px] px-3 py-1.5 rounded-full bg-hr-surface text-muted-foreground border border-hr-divider">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-2 ml-12">
          {items.map((item, i) => (
            <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2.5">
              <span className="text-hr-divider mt-1 select-none">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InteractionDetailDrawer({ interaction: int, nameA, nameB, open, onClose, onNavigate, onViewSubstance }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  if (!int) return null;

  const risk = riskMeta[int.risk_level] || riskMeta.unknown;
  const RiskIcon = risk.Icon;
  const typeLabel = int.interaction_type
    ? (interactionTypeLabels[int.interaction_type] || { en: int.interaction_type, th: int.interaction_type })
    : null;
  const isCritical = int.risk_level === "critical";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-[20px] px-6 pb-12 pt-8 bg-background">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-bold text-foreground text-left leading-snug">
            {nameA} + {nameB}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* ── Risk badge row ── */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className={`${risk.badgeBg} ${risk.badgeText} text-[13px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 font-medium`}>
              <RiskIcon className="h-4 w-4" />
              {isEn ? risk.labelEn : risk.labelTh}
            </span>
            {typeLabel && (
              <span className="text-[12px] px-2.5 py-1 rounded-full border border-hr-divider text-muted-foreground font-normal">
                {isEn ? typeLabel.en : typeLabel.th}
              </span>
            )}
          </div>

          {/* ── Summary ── */}
          {(int.summary_th || int.summary_en) && (
            <p className="text-[15px] text-foreground/85 leading-relaxed">
              {isEn ? int.summary_en : int.summary_th}
            </p>
          )}

          {/* ── Divider ── */}
          <div className="h-px bg-hr-divider" />

          {/* ── Why risky ── */}
          {(int.why_risky_th || int.why_risky_en) && (
            <div className={`rounded-2xl ${risk.cardBg} p-5 space-y-3`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-hr-risk-high-caution/15 flex items-center justify-center">
                  <AlertTriangle className="h-[18px] w-[18px] text-hr-risk-high-caution" />
                </div>
                <h4 className="text-[14px] font-semibold text-foreground">
                  {isEn ? "Why this combination may increase risk" : "ทำไมคู่นี้จึงเพิ่มความเสี่ยง"}
                </h4>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed ml-12">
                {isEn ? int.why_risky_en : int.why_risky_th}
              </p>
            </div>
          )}

          {/* ── Effects (chips) ── */}
          <DetailSection
            icon={Zap}
            title={isEn ? "Possible effects" : "ผลที่อาจเกิดขึ้น"}
            items={isEn ? int.possible_effects_en : int.possible_effects_th}
            iconBg="bg-hr-risk-caution/15 text-hr-risk-high-caution"
            variant="chips"
          />

          {/* ── Warning signs ── */}
          <DetailSection
            icon={Activity}
            title={isEn ? "Signs to watch for" : "อาการที่ควรสังเกต"}
            items={isEn ? int.warning_signs_en : int.warning_signs_th}
            iconBg="bg-hr-risk-high/10 text-hr-risk-high"
          />

          {/* ── Harm reduction ── */}
          <DetailSection
            icon={Shield}
            title={isEn ? "Ways to reduce harm" : "วิธีลดความเสี่ยงเบื้องต้น"}
            items={isEn ? int.harm_reduction_tips_en : int.harm_reduction_tips_th}
            iconBg="bg-hr-teal/10 text-hr-teal"
          />

          {/* ── Emergency signs ── */}
          <DetailSection
            icon={ShieldAlert}
            title={isEn ? "When to get urgent help" : "เมื่อไหร่ควรขอความช่วยเหลือทันที"}
            items={isEn ? int.emergency_signs_en : int.emergency_signs_th}
            iconBg="bg-hr-risk-critical/10 text-hr-risk-critical"
          />

          {/* ── Supportive microcopy ── */}
          <p className="text-[12px] text-muted-foreground/50 text-center leading-relaxed px-4 py-2">
            {isEn
              ? "If something feels off, it's okay to ask for help early. You do not need to wait until things get worse."
              : "หากรู้สึกว่ามีอะไรผิดปกติ สามารถขอความช่วยเหลือได้เลย ไม่จำเป็นต้องรอจนอาการแย่ลง"}
          </p>

          {/* ── Support CTA ── */}
          <div className="rounded-2xl bg-hr-teal/[0.05] border border-hr-teal/15 p-5 space-y-4" style={{ boxShadow: "var(--hr-card-shadow)" }}>
            <p className="text-[14px] font-semibold text-foreground">
              {isEn ? "Support is available" : "พร้อมให้ความช่วยเหลือ"}
            </p>
            <div className="space-y-2.5">
              <Button
                size="sm"
                className="rounded-[14px] text-[14px] h-12 w-full justify-start gap-3 bg-hr-teal hover:bg-hr-teal/90 text-white"
                onClick={() => {
                  trackEvent("hr_combo_support_click", { action: "counselor", combo: `${nameA}+${nameB}` });
                  onNavigate("support");
                }}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                {isEn ? "Talk to a counselor" : "ปรึกษาเรา"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-[14px] text-[14px] h-12 w-full justify-start gap-3 border-hr-teal/30 text-hr-teal hover:bg-hr-teal/5"
                onClick={() => {
                  trackEvent("hr_combo_support_click", { action: "mental_health", combo: `${nameA}+${nameB}` });
                  onNavigate("check");
                }}
              >
                <Heart className="h-[18px] w-[18px]" />
                {isEn ? "Mental health support" : "สุขภาพจิต"}
              </Button>
            </div>

            {isCritical && (
              <a
                href="tel:1669"
                className="flex items-center gap-2.5 text-[13px] text-hr-risk-critical font-medium pt-1"
              >
                <Phone className="h-4 w-4" />
                {isEn ? "Emergency: Call 1669" : "ฉุกเฉิน: โทร 1669"}
              </a>
            )}

            <p className="text-[12px] text-muted-foreground/50">
              {isEn ? "Emergency: 1669 | Mental health: 1323" : "ฉุกเฉิน: 1669 | สุขภาพจิต: 1323"}
            </p>
          </div>

          {/* ── Learn about each substance ── */}
          {onViewSubstance && (
            <div className="flex gap-2.5">
              <Button
                size="sm"
                variant="ghost"
                className="text-[13px] h-10 rounded-xl flex-1 justify-start gap-2.5 hover:bg-hr-surface"
                onClick={() => { onClose(); onViewSubstance(int.substance_a_id); }}
              >
                <BookOpen className="h-4 w-4" />
                {nameA}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[13px] h-10 rounded-xl flex-1 justify-start gap-2.5 hover:bg-hr-surface"
                onClick={() => { onClose(); onViewSubstance(int.substance_b_id); }}
              >
                <BookOpen className="h-4 w-4" />
                {nameB}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

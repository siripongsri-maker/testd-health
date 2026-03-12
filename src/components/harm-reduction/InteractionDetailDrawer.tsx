import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

/* ── Premium risk meta ── */
const riskMeta: Record<string, {
  labelEn: string; labelTh: string;
  badge: string; cardBg: string;
  Icon: React.ElementType;
}> = {
  critical: {
    labelEn: "Critical risk", labelTh: "ความเสี่ยงวิกฤต",
    badge: "bg-rose-900/90 text-rose-50",
    cardBg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40",
    Icon: ShieldAlert,
  },
  high: {
    labelEn: "High risk", labelTh: "ความเสี่ยงสูง",
    badge: "bg-red-600/85 text-red-50",
    cardBg: "bg-red-50/40 dark:bg-red-950/15 border-red-200/50 dark:border-red-900/30",
    Icon: AlertTriangle,
  },
  moderate: {
    labelEn: "Caution", labelTh: "ควรระวัง",
    badge: "bg-amber-500/80 text-amber-950",
    cardBg: "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/50 dark:border-amber-900/30",
    Icon: Shield,
  },
  low: {
    labelEn: "Lower relative risk", labelTh: "ความเสี่ยงต่ำกว่าเมื่อเทียบกัน",
    badge: "bg-emerald-600/20 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-200",
    cardBg: "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/50 dark:border-emerald-900/30",
    Icon: ShieldCheck,
  },
  unknown: {
    labelEn: "Limited evidence", labelTh: "ข้อมูลยังจำกัด",
    badge: "bg-muted text-muted-foreground",
    cardBg: "bg-muted/20 border-border/30",
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

/* ── Section card component ── */
function DetailSection({ icon: Icon, title, items, iconBg, variant = "list" }: {
  icon: React.ElementType;
  title: string;
  items: string[];
  iconBg: string;
  variant?: "list" | "chips";
}) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="border border-border/20 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">{title}</h4>
        </div>
        {variant === "chips" ? (
          <div className="flex flex-wrap gap-1.5 ml-[42px]">
            {items.map((item, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/50 text-muted-foreground">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5 ml-[42px]">
            {items.map((item, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-muted-foreground/30 mt-0.5 select-none">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl px-5 pb-10 pt-6">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-base font-bold text-foreground text-left leading-snug">
            {nameA} + {nameB}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-3">
          {/* ── Risk badge row ── */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={`${risk.badge} text-xs px-3 py-1 rounded-full border-0 inline-flex items-center gap-1.5 font-medium`}>
              <RiskIcon className="h-3.5 w-3.5" />
              {isEn ? risk.labelEn : risk.labelTh}
            </Badge>
            {typeLabel && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-normal border-border/40">
                {isEn ? typeLabel.en : typeLabel.th}
              </Badge>
            )}
          </div>

          {/* ── Summary ── */}
          {(int.summary_th || int.summary_en) && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {isEn ? int.summary_en : int.summary_th}
            </p>
          )}

          {/* ── Why risky ── */}
          {(int.why_risky_th || int.why_risky_en) && (
            <Card className={`border ${risk.cardBg} shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">
                    {isEn ? "Why this combination may increase risk" : "ทำไมคู่นี้จึงเพิ่มความเสี่ยง"}
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed ml-[42px]">
                  {isEn ? int.why_risky_en : int.why_risky_th}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Possible effects (chips) ── */}
          <DetailSection
            icon={Zap}
            title={isEn ? "Possible effects" : "ผลที่อาจเกิดขึ้น"}
            items={isEn ? int.possible_effects_en : int.possible_effects_th}
            iconBg="bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            variant="chips"
          />

          {/* ── Warning signs ── */}
          <DetailSection
            icon={Activity}
            title={isEn ? "Signs to watch for" : "อาการที่ควรสังเกต"}
            items={isEn ? int.warning_signs_en : int.warning_signs_th}
            iconBg="bg-orange-100/80 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />

          {/* ── Harm reduction tips ── */}
          <DetailSection
            icon={Shield}
            title={isEn ? "Ways to reduce harm" : "วิธีลดความเสี่ยงเบื้องต้น"}
            items={isEn ? int.harm_reduction_tips_en : int.harm_reduction_tips_th}
            iconBg="bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />

          {/* ── Emergency signs ── */}
          <DetailSection
            icon={ShieldAlert}
            title={isEn ? "When to get urgent help" : "เมื่อไหร่ควรขอความช่วยเหลือทันที"}
            items={isEn ? int.emergency_signs_en : int.emergency_signs_th}
            iconBg="bg-rose-100/80 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
          />

          {/* ── Supportive microcopy ── */}
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed px-4">
            {isEn
              ? "If something feels off, it's okay to ask for help early. You do not need to wait until things get worse."
              : "หากรู้สึกว่ามีอะไรผิดปกติ สามารถขอความช่วยเหลือได้เลย ไม่จำเป็นต้องรอจนอาการแย่ลง"}
          </p>

          {/* ── Support CTA ── */}
          <Card className="border border-primary/15 bg-primary/[0.03] shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                {isEn ? "Support is available" : "พร้อมให้ความช่วยเหลือ"}
              </p>
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="rounded-xl text-xs h-10 w-full justify-start gap-2"
                  onClick={() => {
                    trackEvent("hr_combo_support_click", { action: "counselor", combo: `${nameA}+${nameB}` });
                    onNavigate("support");
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {isEn ? "Talk to a counselor" : "ปรึกษาเรา"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-10 w-full justify-start gap-2"
                  onClick={() => {
                    trackEvent("hr_combo_support_click", { action: "mental_health", combo: `${nameA}+${nameB}` });
                    onNavigate("check");
                  }}
                >
                  <Heart className="h-4 w-4" />
                  {isEn ? "Mental health support" : "สุขภาพจิต"}
                </Button>
              </div>

              {/* Emergency line */}
              {isCritical && (
                <a
                  href="tel:1669"
                  className="flex items-center gap-2 text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {isEn ? "Emergency: Call 1669" : "ฉุกเฉิน: โทร 1669"}
                </a>
              )}

              <p className="text-[10px] text-muted-foreground/60">
                {isEn ? "Emergency: 1669 | Mental health: 1323" : "ฉุกเฉิน: 1669 | สุขภาพจิต: 1323"}
              </p>
            </CardContent>
          </Card>

          {/* ── Learn about each substance ── */}
          {onViewSubstance && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-[11px] h-9 rounded-xl flex-1 justify-start gap-2"
                onClick={() => { onClose(); onViewSubstance(int.substance_a_id); }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {nameA}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[11px] h-9 rounded-xl flex-1 justify-start gap-2"
                onClick={() => { onClose(); onViewSubstance(int.substance_b_id); }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {nameB}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle, Heart, Shield, MessageCircle,
  Phone, BookOpen, Zap, Activity,
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

const riskMeta: Record<string, { labelEn: string; labelTh: string; color: string; bg: string }> = {
  critical: { labelEn: "Critical Risk", labelTh: "เสี่ยงวิกฤต", color: "bg-red-700 text-white", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50" },
  high: { labelEn: "High Risk", labelTh: "เสี่ยงสูง", color: "bg-destructive text-destructive-foreground", bg: "bg-destructive/5 border-destructive/20" },
  moderate: { labelEn: "Caution", labelTh: "ระวัง", color: "bg-amber-500 text-white", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40" },
  low: { labelEn: "Lower Risk", labelTh: "เสี่ยงต่ำกว่า", color: "bg-emerald-500 text-white", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40" },
  unknown: { labelEn: "Unknown", labelTh: "ไม่ทราบ", color: "bg-muted text-muted-foreground", bg: "bg-muted/30 border-border" },
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

function ListSection({ icon: Icon, title, items, iconColor }: {
  icon: React.ElementType; title: string; items: string[]; iconColor: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="border border-border/30">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">{title}</h4>
        </div>
        <ul className="space-y-1 ml-9">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
              <span className="text-muted-foreground/50 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function InteractionDetailDrawer({ interaction: int, nameA, nameB, open, onClose, onNavigate, onViewSubstance }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  if (!int) return null;

  const risk = riskMeta[int.risk_level] || riskMeta.unknown;
  const typeLabel = int.interaction_type ? (interactionTypeLabels[int.interaction_type] || { en: int.interaction_type, th: int.interaction_type }) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-bold text-foreground text-left">
            {nameA} + {nameB}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 mt-1">
          {/* Risk badge + type */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={`${risk.color} text-xs px-2 py-0.5`}>
              {isEn ? risk.labelEn : risk.labelTh}
            </Badge>
            {typeLabel && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {isEn ? typeLabel.en : typeLabel.th}
              </Badge>
            )}
          </div>

          {/* Summary */}
          {(int.summary_th || int.summary_en) && (
            <p className="text-sm text-foreground font-medium">
              {isEn ? int.summary_en : int.summary_th}
            </p>
          )}

          {/* Why risky */}
          {(int.why_risky_th || int.why_risky_en) && (
            <Card className={`border ${risk.bg}`}>
              <CardContent className="p-3">
                <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  {isEn ? "Why is this risky?" : "ทำไมถึงเสี่ยง?"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEn ? int.why_risky_en : int.why_risky_th}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Effects, warnings, tips, emergency */}
          <ListSection
            icon={Zap}
            title={isEn ? "Possible Effects" : "ผลที่อาจเกิดขึ้น"}
            items={isEn ? int.possible_effects_en : int.possible_effects_th}
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <ListSection
            icon={Activity}
            title={isEn ? "Warning Signs" : "สัญญาณเตือน"}
            items={isEn ? int.warning_signs_en : int.warning_signs_th}
            iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />
          <ListSection
            icon={Shield}
            title={isEn ? "Harm Reduction Tips" : "เคล็ดลับลดอันตราย"}
            items={isEn ? int.harm_reduction_tips_en : int.harm_reduction_tips_th}
            iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <ListSection
            icon={AlertTriangle}
            title={isEn ? "When to Seek Emergency Help" : "เมื่อไหร่ควรขอความช่วยเหลือฉุกเฉิน"}
            items={isEn ? int.emergency_signs_en : int.emergency_signs_th}
            iconColor="bg-destructive/10 text-destructive"
          />

          {/* CTAs */}
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {isEn ? "Need support?" : "ต้องการความช่วยเหลือ?"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full text-xs h-7" onClick={() => {
                  trackEvent("hr_combo_support_click", { action: "counselor", combo: `${nameA}+${nameB}` });
                  onNavigate("support");
                }}>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {isEn ? "Talk to Counselor" : "ปรึกษาเรา"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs h-7" onClick={() => {
                  trackEvent("hr_combo_support_click", { action: "mental_health", combo: `${nameA}+${nameB}` });
                  onNavigate("check");
                }}>
                  <Heart className="h-3 w-3 mr-1" />
                  {isEn ? "Mental Health" : "สุขภาพจิต"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isEn ? "Emergency: Call 1669 | Mental health: 1323" : "ฉุกเฉิน: โทร 1669 | สุขภาพจิต: 1323"}
              </p>
            </CardContent>
          </Card>

          {/* View substance links */}
          {onViewSubstance && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-xs h-7 rounded-full" onClick={() => { onClose(); onViewSubstance(int.substance_a_id); }}>
                <BookOpen className="h-3 w-3 mr-1" />
                {nameA}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 rounded-full" onClick={() => { onClose(); onViewSubstance(int.substance_b_id); }}>
                <BookOpen className="h-3 w-3 mr-1" />
                {nameB}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

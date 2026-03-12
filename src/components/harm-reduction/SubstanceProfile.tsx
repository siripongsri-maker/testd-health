import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown, AlertTriangle, Heart, Brain, Flame,
  Clock, Zap, Timer, TrendingDown, ShieldAlert,
  HeartHandshake, MessageCircle, Phone,
} from "lucide-react";
import type { Substance, SubstanceInteraction } from "./SubstanceLibrary";

interface Props {
  substance: Substance;
  interactions: SubstanceInteraction[];
  allSubstances: Substance[];
  onNavigate: (tab: string) => void;
}

function RiskBar({ level, label }: { level: number; label: string }) {
  const pct = (level / 5) * 100;
  const color =
    level >= 4
      ? "bg-destructive"
      : level >= 3
      ? "bg-amber-500"
      : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{level}/5</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  items,
  iconColor,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  iconColor: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items || items.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border border-border/30">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">{title}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            <ul className="space-y-1.5 ml-10">
              {items.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                  <span className="text-muted-foreground/50 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function SubstanceProfile({ substance: s, interactions, allSubstances, onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const timeline = s.duration_timeline as {
    onset_th?: string; onset_en?: string;
    peak_th?: string; peak_en?: string;
    duration_th?: string; duration_en?: string;
    crash_th?: string; crash_en?: string;
  } | null;

  const routes = (s.routes_of_use as { name_th: string; name_en: string }[]) || [];

  const getName = (id: string) => {
    const sub = allSubstances.find((x) => x.id === id);
    return sub ? (isEn ? sub.name_en : sub.name_th) : "?";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl">{s.icon}</span>
        <div>
          <h2 className="text-xl font-bold text-foreground">{isEn ? s.name_en : s.name_th}</h2>
          <p className="text-xs text-muted-foreground">{isEn ? s.category_en : s.category_th}</p>
        </div>
      </div>

      {/* Overview */}
      {(s.overview_th || s.overview_en) && (
        <Card className="border border-border/30">
          <CardContent className="p-3.5">
            <p className="text-sm text-foreground leading-relaxed">
              {isEn ? s.overview_en : s.overview_th}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk Indicator Bento */}
      <Card className="border border-border/30">
        <CardContent className="p-3.5 space-y-2.5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            {isEn ? "Risk Profile" : "ระดับความเสี่ยง"}
          </h3>
          <RiskBar level={s.addiction_risk} label={isEn ? "Addiction Risk" : "ความเสี่ยงการเสพติด"} />
          <RiskBar level={s.heart_risk} label={isEn ? "Heart / Body Risk" : "ความเสี่ยงต่อหัวใจ/ร่างกาย"} />
          <RiskBar level={s.mental_health_risk} label={isEn ? "Mental Health Risk" : "ความเสี่ยงต่อสุขภาพจิต"} />
        </CardContent>
      </Card>

      {/* Routes of use */}
      {routes.length > 0 && (
        <Card className="border border-border/30">
          <CardContent className="p-3.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
              {isEn ? "Common Routes of Use" : "วิธีการใช้ที่พบบ่อย"}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {routes.map((r, i) => (
                <span key={i} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                  {isEn ? r.name_en : r.name_th}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duration timeline */}
      {timeline && (timeline.onset_th || timeline.onset_en) && (
        <Card className="border border-border/30">
          <CardContent className="p-3.5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-primary" />
              {isEn ? "Duration Timeline" : "ไทม์ไลน์ระยะเวลา"}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: isEn ? "Onset" : "เริ่มออกฤทธิ์", val: isEn ? timeline.onset_en : timeline.onset_th },
                { label: isEn ? "Peak" : "จุดสูงสุด", val: isEn ? timeline.peak_en : timeline.peak_th },
                { label: isEn ? "Duration" : "ระยะเวลา", val: isEn ? timeline.duration_en : timeline.duration_th },
                { label: isEn ? "Crash" : "ช่วงลง", val: isEn ? timeline.crash_en : timeline.crash_th },
              ]
                .filter((x) => x.val)
                .map((x, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{x.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{x.val}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsible effect sections */}
      <CollapsibleSection
        icon={Zap}
        title={isEn ? "Short-term Effects" : "ผลกระทบระยะสั้น"}
        items={isEn ? s.short_effects_en : s.short_effects_th}
        iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        defaultOpen
      />
      <CollapsibleSection
        icon={Clock}
        title={isEn ? "Medium-term Effects" : "ผลกระทบระยะกลาง"}
        items={isEn ? s.mid_effects_en : s.mid_effects_th}
        iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
      />
      <CollapsibleSection
        icon={TrendingDown}
        title={isEn ? "Long-term Effects" : "ผลกระทบระยะยาว"}
        items={isEn ? s.long_effects_en : s.long_effects_th}
        iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      />
      <CollapsibleSection
        icon={Brain}
        title={isEn ? "Withdrawal Symptoms" : "อาการถอนยา"}
        items={isEn ? s.withdrawal_en : s.withdrawal_th}
        iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
      />
      <CollapsibleSection
        icon={Heart}
        title={isEn ? "Harm Reduction Tips" : "เคล็ดลับลดอันตราย"}
        items={isEn ? s.harm_reduction_tips_en : s.harm_reduction_tips_th}
        iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        defaultOpen
      />
      <CollapsibleSection
        icon={AlertTriangle}
        title={isEn ? "When to Seek Medical Help" : "เมื่อไหร่ควรพบแพทย์"}
        items={isEn ? s.emergency_signs_en : s.emergency_signs_th}
        iconColor="bg-destructive/10 text-destructive"
      />

      {/* Drug Interactions */}
      {interactions.length > 0 && (
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="p-3.5 space-y-2.5">
            <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {isEn ? "Drug Interaction Warnings" : "คำเตือนปฏิกิริยาระหว่างสาร"}
            </h3>
            {interactions.map((int) => {
              const otherName = int.substance_a_id === s.id
                ? getName(int.substance_b_id)
                : getName(int.substance_a_id);
              const riskBg =
                int.risk_level === "high" || int.risk_level === "critical"
                  ? "bg-destructive/10 border-destructive/20"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30";
              return (
                <div key={int.id} className={`rounded-lg border p-2.5 ${riskBg}`}>
                  <p className="text-xs font-medium text-foreground">
                    ⚠️ {isEn ? s.name_en : s.name_th} + {otherName}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isEn ? int.description_en : int.description_th}
                  </p>
                  <span className={`inline-block text-[9px] mt-1 px-1.5 py-0.5 rounded-full font-medium uppercase ${
                    int.risk_level === "critical"
                      ? "bg-destructive text-destructive-foreground"
                      : int.risk_level === "high"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-amber-200 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300"
                  }`}>
                    {int.risk_level}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {isEn ? "Need support?" : "ต้องการความช่วยเหลือ?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Our counselors are here for you — no judgment."
              : "ทีมให้คำปรึกษาของเราพร้อมช่วยคุณ — ไม่ตัดสิน"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button size="sm" className="rounded-full text-xs h-8" onClick={() => onNavigate("support")}>
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Talk to Counselor" : "ปรึกษาเรา"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8" onClick={() => onNavigate("check")}>
              <HeartHandshake className="h-3.5 w-3.5 mr-1.5" />
              {isEn ? "Mental Health Check" : "ตรวจสุขภาพจิต"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isEn ? "Emergency: Call 1669 | Mental health: 1323" : "ฉุกเฉิน: โทร 1669 | สุขภาพจิต: 1323"}
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-2xl bg-muted/40 p-3.5">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isEn
            ? "⚕️ This information is provided for harm reduction and health education. It does not promote or encourage substance use. Always consult a healthcare professional."
            : "⚕️ ข้อมูลนี้จัดทำเพื่อการลดอันตรายและสุขศึกษา ไม่ได้ส่งเสริมหรือสนับสนุนการใช้สาร ควรปรึกษาแพทย์เสมอ"}
        </p>
      </div>
    </div>
  );
}

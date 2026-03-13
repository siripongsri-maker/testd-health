import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";
import { SwingClinicCard } from "./SwingClinicCard";
import {
  AlertTriangle, Phone, MessageCircle, Wind, HeartPulse,
} from "lucide-react";

interface Props {
  userId?: string;
  onNavigateSupport: () => void;
}

interface WarningSign {
  id: string;
  labelEn: string;
  labelTh: string;
  severity: "moderate" | "severe";
}

const WARNING_SIGNS: WarningSign[] = [
  { id: "breathing", labelEn: "Breathing seems slow or difficult", labelTh: "หายใจช้าหรือหายใจลำบาก", severity: "severe" },
  { id: "unconscious", labelEn: "Hard to wake / unresponsive", labelTh: "ปลุกไม่ตื่น / ไม่ตอบสนอง", severity: "severe" },
  { id: "chest", labelEn: "Chest pain or pressure", labelTh: "เจ็บหน้าอกหรือแน่นหน้าอก", severity: "severe" },
  { id: "seizure", labelEn: "Seizure or convulsions", labelTh: "ชักหรือกระตุก", severity: "severe" },
  { id: "panic", labelEn: "Severe panic or fear", labelTh: "ตื่นตระหนกหรือกลัวมาก", severity: "moderate" },
  { id: "confusion", labelEn: "Severe confusion", labelTh: "สับสนอย่างรุนแรง", severity: "moderate" },
  { id: "crash", labelEn: "Overwhelming emotional crash", labelTh: "อารมณ์ตกอย่างรุนแรง", severity: "moderate" },
  { id: "faint", labelEn: "Fainting or collapse", labelTh: "เป็นลมหรือหมดสติ", severity: "severe" },
];

export function SafetyEscalation({ userId, onNavigateSupport }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasSevere = WARNING_SIGNS.some(w => selected.has(w.id) && w.severity === "severe");
  const hasAny = selected.size > 0;

  const handleSubmit = async () => {
    const items = Array.from(selected);
    trackEvent("hr_safety_alert", { signs: items, severe: hasSevere });
    try {
      await supabase.from("hr_safety_alert_events").insert({
        user_id: userId || null,
        anonymous_token: userId ? null : `anon-${Date.now()}`,
        alert_type: hasSevere ? "severe_warning" : "moderate_warning",
        severity: hasSevere ? "severe" : "moderate",
        response_action: items.join(","),
      });
    } catch {}
    setSubmitted(true);
  };

  if (submitted || hasSevere) {
    return (
      <div className="space-y-4">
        {/* Emergency card */}
        <Card className="border-2 border-destructive/50 bg-destructive/5">
          <CardContent className="p-5 space-y-4 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-destructive">
              {isEn ? "Get help now" : "ขอความช่วยเหลือเดี๋ยวนี้"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {isEn
                ? "These signs may need urgent medical attention. Please reach out for help immediately."
                : "อาการเหล่านี้อาจต้องการความช่วยเหลือทางการแพทย์เร่งด่วน กรุณาขอความช่วยเหลือทันที"}
            </p>
            <div className="space-y-2">
              <Button className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => window.open("tel:1669")}>
                <Phone className="h-4 w-4 mr-2" />
                {isEn ? "Call Emergency 1669" : "โทรฉุกเฉิน 1669"}
              </Button>
              <Button variant="outline" className="w-full rounded-xl"
                onClick={() => window.open("tel:1323")}>
                <HeartPulse className="h-4 w-4 mr-2" />
                {isEn ? "Mental Health Hotline 1323" : "สายด่วนสุขภาพจิต 1323"}
              </Button>
              <Button variant="outline" className="w-full rounded-xl" onClick={onNavigateSupport}>
                <MessageCircle className="h-4 w-4 mr-2" />
                {isEn ? "Talk to counselor" : "ปรึกษาผู้เชี่ยวชาญ"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grounding only for moderate */}
        {!hasSevere && (
          <Card className="border border-border/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {isEn ? "Grounding exercise" : "แบบฝึกหัดทำให้สงบ"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "Try breathing slowly: inhale for 4 counts, hold for 4, exhale for 6. Repeat 5 times."
                  : "ลองหายใจช้าๆ: สูดเข้า 4 จังหวะ กลั้น 4 จังหวะ หายใจออก 6 จังหวะ ทำซ้ำ 5 ครั้ง"}
              </p>
            </CardContent>
          </Card>
        )}

        <SwingClinicCard userId={userId} sourceContext="safety_escalation" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-foreground">
              {isEn ? "Warning Signs" : "สัญญาณเตือน"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Select any warning signs you or someone near you is experiencing."
              : "เลือกอาการเตือนที่คุณหรือคนใกล้ชิดกำลังพบ"}
          </p>
          <div className="space-y-2">
            {WARNING_SIGNS.map(w => (
              <div key={w.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selected.has(w.id)
                    ? w.severity === "severe" ? "border-destructive/50 bg-destructive/5" : "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10"
                    : "border-border/40"
                }`}
                onClick={() => toggle(w.id)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected.has(w.id) ? "border-destructive bg-destructive" : "border-muted-foreground/30"
                }`}>
                  {selected.has(w.id) && <div className="w-2 h-2 rounded-full bg-destructive-foreground" />}
                </div>
                <span className="text-sm text-foreground">{isEn ? w.labelEn : w.labelTh}</span>
                {w.severity === "severe" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium ml-auto">
                    {isEn ? "Urgent" : "เร่งด่วน"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {hasAny && (
            <Button className="w-full rounded-xl" onClick={handleSubmit}>
              {isEn ? "Get support recommendations" : "ดูคำแนะนำการช่วยเหลือ"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

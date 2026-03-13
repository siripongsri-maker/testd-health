import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/hooks/useAnalytics";
import { recordServiceEvent } from "@/lib/servicePathway";
import {
  Brain, Wind, HeartHandshake, Building2, Phone,
  Sunrise, ArrowRight, ArrowLeft, CheckCircle2, Shield,
} from "lucide-react";

interface Props {
  userId?: string;
  pathwayId?: string | null;
  onComplete: (distressLevel: string) => void;
  onNavigate: (target: string) => void;
}

// PHQ-4 Ultra-brief screening (Kroenke et al. 2009)
const PHQ4_QUESTIONS = [
  {
    id: "anxious",
    enText: "Over the past 2 weeks, how often have you felt nervous, anxious, or on edge?",
    thText: "ใน 2 สัปดาห์ที่ผ่านมา คุณรู้สึกกังวล กระวนกระวาย หรือไม่สบายใจบ่อยแค่ไหน?",
    domain: "anxiety",
  },
  {
    id: "worry",
    enText: "Over the past 2 weeks, how often have you been unable to stop or control worrying?",
    thText: "ใน 2 สัปดาห์ที่ผ่านมา คุณหยุดกังวลหรือควบคุมความกังวลไม่ได้บ่อยแค่ไหน?",
    domain: "anxiety",
  },
  {
    id: "interest",
    enText: "Over the past 2 weeks, how often have you had little interest or pleasure in doing things?",
    thText: "ใน 2 สัปดาห์ที่ผ่านมา คุณรู้สึกไม่สนใจหรือไม่มีความสุขในการทำสิ่งต่างๆ บ่อยแค่ไหน?",
    domain: "depression",
  },
  {
    id: "hopeless",
    enText: "Over the past 2 weeks, how often have you felt down, depressed, or hopeless?",
    thText: "ใน 2 สัปดาห์ที่ผ่านมา คุณรู้สึกหดหู่ ซึมเศร้า หรือสิ้นหวังบ่อยแค่ไหน?",
    domain: "depression",
  },
];

const OPTIONS = [
  { value: 0, enLabel: "Not at all", thLabel: "ไม่เลย" },
  { value: 1, enLabel: "Several days", thLabel: "หลายวัน" },
  { value: 2, enLabel: "More than half the days", thLabel: "มากกว่าครึ่งของวัน" },
  { value: 3, enLabel: "Nearly every day", thLabel: "เกือบทุกวัน" },
];

export default function MentalHealthCheckin({ userId, pathwayId, onComplete, onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  const currentQ = PHQ4_QUESTIONS[step];
  const totalQ = PHQ4_QUESTIONS.length;
  const progress = completed ? 100 : (step / totalQ) * 100;

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (step < totalQ - 1) {
      setStep(step + 1);
    } else {
      // Calculate score and distress level
      const total = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      let distress: string;
      if (total <= 2) distress = "none";
      else if (total <= 5) distress = "mild";
      else if (total <= 8) distress = "moderate";
      else distress = "severe";

      setCompleted(true);

      trackEvent("mental_health_screen_completed", { score: total, distress });

      if (pathwayId) {
        recordServiceEvent(pathwayId, "mental_health_screen_completed", userId, {
          mental_health_referral_needed: distress === "moderate" || distress === "severe",
        });
      }

      onComplete(distress);
    }
  };

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const distressLevel = totalScore <= 2 ? "none" : totalScore <= 5 ? "mild" : totalScore <= 8 ? "moderate" : "severe";

  // Results screen
  if (completed) {
    const nextSteps = [
      ...(distressLevel === "none" || distressLevel === "mild"
        ? [
            { icon: Wind, labelTh: "เทคนิคผ่อนคลาย / หายใจ", labelEn: "Breathing & grounding", action: "recovery_mode" },
            { icon: Shield, labelTh: "วางแผนดูแลตัวเอง", labelEn: "Build a safer plan", action: "safer_plan" },
          ]
        : []),
      ...(distressLevel === "moderate" || distressLevel === "severe"
        ? [
            { icon: HeartHandshake, labelTh: "พูดคุยกับผู้เชี่ยวชาญ", labelEn: "Talk to a counselor", action: "support" },
            { icon: Building2, labelTh: "ปรึกษา SWING Clinic", labelEn: "SWING Clinic consultation", action: "clinic" },
          ]
        : []),
      ...(distressLevel === "severe"
        ? [
            { icon: Phone, labelTh: "โทร 1323 (สายด่วนสุขภาพจิต)", labelEn: "Call 1323 (Mental Health Hotline)", action: "emergency" },
          ]
        : []),
    ];

    return (
      <div className="space-y-4">
        <Card className="border-border/60 overflow-hidden">
          <div className={`h-1.5 ${distressLevel === "severe" ? "bg-red-500" : distressLevel === "moderate" ? "bg-amber-500" : "bg-emerald-500"}`} />
          <CardContent className="pt-5 pb-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {isEn ? "Check-in complete" : "เช็กใจเบื้องต้นเสร็จสิ้น"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {isEn
                  ? "This is not a diagnosis. It helps suggest what support might be useful for you."
                  : "ผลนี้ไม่ใช่การวินิจฉัย แต่ช่วยแนะนำบริการที่อาจเหมาะกับคุณ"}
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Badge
                variant="secondary"
                className={
                  distressLevel === "severe"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : distressLevel === "moderate"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                }
              >
                {distressLevel === "none" && (isEn ? "No significant distress" : "ไม่พบความเครียดที่มีนัยสำคัญ")}
                {distressLevel === "mild" && (isEn ? "Mild distress" : "ความเครียดเล็กน้อย")}
                {distressLevel === "moderate" && (isEn ? "Moderate distress" : "ความเครียดปานกลาง")}
                {distressLevel === "severe" && (isEn ? "Significant distress" : "ความเครียดสูง")}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isEn ? "Suggested next steps" : "ขั้นตอนถัดไปที่แนะนำ"}
              </p>
              {nextSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-auto py-2.5 text-left"
                    onClick={() => {
                      if (step.action === "emergency") {
                        window.location.href = "tel:1323";
                      } else {
                        onNavigate(step.action);
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{isEn ? step.labelEn : step.labelTh}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Question flow
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {isEn ? "Mental health check-in" : "เช็กใจเบื้องต้น"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {isEn
            ? "Not a diagnosis — helps recommend the right support for you"
            : "ไม่ใช่การวินิจฉัย แต่ช่วยแนะนำบริการที่เหมาะกับคุณ"}
        </p>
      </div>

      <Progress value={progress} className="h-1.5" />

      <Card className="border-border/60">
        <CardContent className="pt-5 pb-4 space-y-4">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {isEn ? currentQ.enText : currentQ.thText}
          </p>

          <div className="grid gap-2">
            {OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={answers[currentQ.id] === opt.value ? "default" : "outline"}
                className="justify-start h-auto py-2.5 text-left"
                onClick={() => handleAnswer(opt.value)}
              >
                <span className="text-sm">{isEn ? opt.enLabel : opt.thLabel}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              {step > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-3 w-3" />
                  {isEn ? "Back" : "กลับ"}
                </Button>
              )}
            </span>
            <span>{step + 1} / {totalQ}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { openSupportChat } from "@/lib/openSupportChat";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import { CitationChips } from "@/components/seo/CitationChips";
import { PageReferences } from "@/components/seo/PageReferences";
import { DistressCard } from "@/components/harm-reduction/DistressCard";
import {
  Shield, ChevronRight, ChevronLeft, CheckCircle2,
  ShieldAlert, ShieldCheck, Heart, Brain, Pill,
  AlertTriangle, Phone, MessageCircle, CalendarDays,
  TestTube, Package, HeartHandshake, Stethoscope,
  BookOpen, ExternalLink,
} from "lucide-react";

/* ================================================================
   VALIDATED SCREENING INSTRUMENTS
   ================================================================ */

// --- ASSIST-Lite (WHO) ---
// 3 core questions per substance category, scored 0-2 each
interface AssistSubstance {
  key: string;
  labelEn: string;
  labelTh: string;
  icon: string;
}

const ASSIST_SUBSTANCES: AssistSubstance[] = [
  { key: "alcohol", labelEn: "Alcohol", labelTh: "แอลกอฮอล์", icon: "🍺" },
  { key: "tobacco", labelEn: "Tobacco / Nicotine", labelTh: "บุหรี่ / นิโคติน", icon: "🚬" },
  { key: "cannabis", labelEn: "Cannabis", labelTh: "กัญชา", icon: "🌿" },
  { key: "stimulants", labelEn: "Stimulants (Meth, MDMA, Cocaine)", labelTh: "สารกระตุ้น (ไอซ์, MDMA, โคเคน)", icon: "⚡" },
  { key: "sedatives", labelEn: "Sedatives (GHB, Benzos, Ketamine)", labelTh: "สารกดประสาท (GHB, ยานอนหลับ, คีตามีน)", icon: "💊" },
  { key: "opioids", labelEn: "Opioids (Heroin, Tramadol)", labelTh: "สารกลุ่มฝิ่น (เฮโรอีน, ทรามาดอล)", icon: "💉" },
  { key: "poppers", labelEn: "Poppers / Inhalants", labelTh: "Poppers / สารสูดดม", icon: "🧪" },
  { key: "other", labelEn: "Other substances", labelTh: "สารอื่นๆ", icon: "❓" },
];

// ASSIST-Lite: 3 questions adapted for mobile
const ASSIST_QUESTIONS = [
  {
    id: "q1_ever",
    en: "Have you ever used this substance?",
    th: "คุณเคยใช้สารนี้หรือไม่?",
    options: [
      { value: 0, en: "No", th: "ไม่เคย" },
      { value: 1, en: "Yes, but not in the past 3 months", th: "เคย แต่ไม่ได้ใช้ใน 3 เดือนที่ผ่านมา" },
      { value: 2, en: "Yes, in the past 3 months", th: "เคย ใช้ใน 3 เดือนที่ผ่านมา" },
    ],
  },
  {
    id: "q2_frequency",
    en: "In the past 3 months, how often have you used it?",
    th: "ใน 3 เดือนที่ผ่านมา คุณใช้สารนี้บ่อยแค่ไหน?",
    options: [
      { value: 0, en: "Never", th: "ไม่เคย" },
      { value: 1, en: "Once or twice", th: "ครั้งหรือสองครั้ง" },
      { value: 2, en: "Monthly", th: "รายเดือน" },
      { value: 3, en: "Weekly", th: "รายสัปดาห์" },
      { value: 4, en: "Daily or almost daily", th: "ทุกวันหรือเกือบทุกวัน" },
    ],
    showIf: 2, // Only show if q1 answer >= 2
  },
  {
    id: "q3_concern",
    en: "Has your use of this substance led to problems or concern from others?",
    th: "การใช้สารนี้เคยทำให้เกิดปัญหาหรือผู้อื่นเป็นห่วงหรือไม่?",
    options: [
      { value: 0, en: "No", th: "ไม่" },
      { value: 1, en: "Yes, but only recently", th: "ใช่ แต่เพิ่งเกิดขึ้น" },
      { value: 2, en: "Yes, ongoing", th: "ใช่ เป็นปัญหาต่อเนื่อง" },
    ],
    showIf: 2,
  },
];

// --- AUDIT-C (WHO) ---
const AUDIT_C_QUESTIONS = [
  {
    id: "audit1",
    en: "How often do you have a drink containing alcohol?",
    th: "คุณดื่มเครื่องดื่มที่มีแอลกอฮอล์บ่อยแค่ไหน?",
    options: [
      { value: 0, en: "Never", th: "ไม่เคย" },
      { value: 1, en: "Monthly or less", th: "เดือนละครั้งหรือน้อยกว่า" },
      { value: 2, en: "2-4 times a month", th: "2-4 ครั้งต่อเดือน" },
      { value: 3, en: "2-3 times a week", th: "2-3 ครั้งต่อสัปดาห์" },
      { value: 4, en: "4+ times a week", th: "4 ครั้งขึ้นไปต่อสัปดาห์" },
    ],
  },
  {
    id: "audit2",
    en: "How many standard drinks on a typical day when drinking?",
    th: "วันที่ดื่ม คุณดื่มกี่แก้วโดยทั่วไป?",
    options: [
      { value: 0, en: "1-2", th: "1-2 แก้ว" },
      { value: 1, en: "3-4", th: "3-4 แก้ว" },
      { value: 2, en: "5-6", th: "5-6 แก้ว" },
      { value: 3, en: "7-9", th: "7-9 แก้ว" },
      { value: 4, en: "10+", th: "10 แก้วขึ้นไป" },
    ],
  },
  {
    id: "audit3",
    en: "How often do you have 6 or more drinks on one occasion?",
    th: "คุณดื่มตั้งแต่ 6 แก้วขึ้นไปในครั้งเดียวบ่อยแค่ไหน?",
    options: [
      { value: 0, en: "Never", th: "ไม่เคย" },
      { value: 1, en: "Less than monthly", th: "น้อยกว่าเดือนละครั้ง" },
      { value: 2, en: "Monthly", th: "เดือนละครั้ง" },
      { value: 3, en: "Weekly", th: "สัปดาห์ละครั้ง" },
      { value: 4, en: "Daily or almost daily", th: "ทุกวันหรือเกือบทุกวัน" },
    ],
  },
];

// --- PHQ-4 (Kroenke) ---
const PHQ4_QUESTIONS = [
  { id: "phq1", en: "Feeling nervous, anxious, or on edge", th: "รู้สึกกังวล วิตก หรือกระสับกระส่าย", domain: "anxiety" as const },
  { id: "phq2", en: "Not being able to stop or control worrying", th: "ไม่สามารถหยุดหรือควบคุมความกังวลได้", domain: "anxiety" as const },
  { id: "phq3", en: "Little interest or pleasure in doing things", th: "รู้สึกเบื่อหน่ายหรือไม่มีความสุขในการทำสิ่งต่างๆ", domain: "depression" as const },
  { id: "phq4", en: "Feeling down, depressed, or hopeless", th: "รู้สึกหดหู่ ซึมเศร้า หรือสิ้นหวัง", domain: "depression" as const },
];

const PHQ4_OPTIONS = [
  { value: 0, en: "Not at all", th: "ไม่เลย" },
  { value: 1, en: "Several days", th: "หลายวัน" },
  { value: 2, en: "More than half the days", th: "มากกว่าครึ่งของวัน" },
  { value: 3, en: "Nearly every day", th: "เกือบทุกวัน" },
];

// --- C-SSRS Screener (Columbia) ---
const CSSRS_QUESTIONS = [
  { id: "cssrs1", en: "Have you wished you were dead or wished you could go to sleep and not wake up?", th: "คุณเคยหวังว่าตัวเองตายไปแล้วหรือหวังว่านอนหลับแล้วไม่ตื่นขึ้นมาหรือไม่?" },
  { id: "cssrs2", en: "Have you had any actual thoughts of killing yourself?", th: "คุณเคยมีความคิดที่จะทำร้ายตัวเองจริงๆ หรือไม่?" },
];

// --- Service needs ---
const SERVICE_OPTIONS = [
  { key: "hiv_test", en: "HIV / STI testing", th: "ตรวจ HIV / STI", icon: TestTube },
  { key: "selftest_kit", en: "HIV self-test kit", th: "ชุดตรวจ HIV ด้วยตนเอง", icon: Package },
  { key: "prep_pep", en: "PrEP / PEP information", th: "ข้อมูล PrEP / PEP", icon: Shield },
  { key: "swing_clinic", en: "SWING Clinic appointment", th: "นัดหมาย SWING Clinic", icon: CalendarDays },
  { key: "counseling", en: "Counseling", th: "ปรึกษาเรื่องทั่วไป", icon: MessageCircle },
  { key: "mental_health", en: "Mental health support", th: "สนับสนุนสุขภาพจิต", icon: Brain },
  { key: "overdose_help", en: "Overdose / urgent medical help", th: "ช่วยเหลือฉุกเฉิน / overdose", icon: AlertTriangle },
  { key: "violence_support", en: "Support after violence / coercion", th: "สนับสนุนหลังถูกทำร้าย / บังคับ", icon: HeartHandshake },
  { key: "peer_support", en: "Peer support", th: "การสนับสนุนจากเพื่อน", icon: Heart },
  { key: "follow_up", en: "Follow-up contact", th: "ติดต่อติดตามผล", icon: Phone },
];

/* ================================================================
   STEPS
   ================================================================ */

type Step = "consent" | "substance" | "alcohol" | "mental" | "crisis" | "services" | "results";

interface Props {
  userId?: string;
  onNavigateSupport?: () => void;
}

interface ScreeningState {
  // ASSIST-Lite per substance
  assistAnswers: Record<string, Record<string, number>>;
  // AUDIT-C
  auditAnswers: Record<string, number>;
  // PHQ-4
  phqAnswers: Record<string, number>;
  // C-SSRS
  cssrsAnswers: Record<string, boolean>;
  // Services
  selectedServices: string[];
  // Chemsex-specific
  injection: boolean;
  slam: boolean;
  mixing: boolean;
}

const INITIAL_STATE: ScreeningState = {
  assistAnswers: {},
  auditAnswers: {},
  phqAnswers: {},
  cssrsAnswers: {},
  selectedServices: [],
  injection: false,
  slam: false,
  mixing: false,
};

/* ================================================================
   SCORING
   ================================================================ */

interface SubstanceRisk { key: string; label: string; level: "low" | "moderate" | "high"; score: number; }

function computeAssistRisks(answers: Record<string, Record<string, number>>, isEn: boolean): SubstanceRisk[] {
  const risks: SubstanceRisk[] = [];
  for (const sub of ASSIST_SUBSTANCES) {
    const a = answers[sub.key];
    if (!a || a.q1_ever === 0) continue;
    const total = (a.q1_ever || 0) + (a.q2_frequency || 0) + (a.q3_concern || 0);
    const label = isEn ? sub.labelEn : sub.labelTh;
    if (total >= 5) risks.push({ key: sub.key, label, level: "high", score: total });
    else if (total >= 2) risks.push({ key: sub.key, label, level: "moderate", score: total });
    else risks.push({ key: sub.key, label, level: "low", score: total });
  }
  return risks;
}

function computeAuditScore(answers: Record<string, number>): number {
  return Object.values(answers).reduce((s, v) => s + v, 0);
}

function computePHQ4(answers: Record<string, number>) {
  const anxiety = (answers.phq1 || 0) + (answers.phq2 || 0);
  const depression = (answers.phq3 || 0) + (answers.phq4 || 0);
  const total = anxiety + depression;
  let level: "low" | "elevated" | "high" = "low";
  if (total >= 6) level = "high";
  else if (total >= 3) level = "elevated";
  return { total, anxiety, depression, level };
}

function hasCrisisRisk(cssrs: Record<string, boolean>): boolean {
  return Object.values(cssrs).some(v => v);
}

/* ================================================================
   COMPONENT
   ================================================================ */

export function RiskScreening({ userId, onNavigateSupport }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [state, setState] = useState<ScreeningState>(INITIAL_STATE);
  const [step, setStep] = useState<Step>("consent");
  const [consentGiven, setConsentGiven] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);

  // Determine step order dynamically
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ["consent", "substance"];
    // Alcohol follow-up if alcohol used
    const alcoholUsed = state.assistAnswers.alcohol?.q1_ever && state.assistAnswers.alcohol.q1_ever >= 2;
    if (alcoholUsed) s.push("alcohol");
    s.push("mental");
    // Crisis only if PHQ elevated
    const phq = computePHQ4(state.phqAnswers);
    if (phq.level === "elevated" || phq.level === "high") s.push("crisis");
    s.push("services", "results");
    return s;
  }, [state.assistAnswers, state.phqAnswers]);

  const stepIdx = steps.indexOf(step);
  const progress = steps.length > 1 ? (stepIdx / (steps.length - 1)) * 100 : 0;

  const goNext = () => {
    if (stepIdx < steps.length - 1) {
      const next = steps[stepIdx + 1];
      setStep(next);
      if (next === "substance") setCurrentSubIdx(0);
    }
  };

  const goBack = () => {
    if (stepIdx > 0) setStep(steps[stepIdx - 1]);
  };

  // Find substances used (q1 >= 2) for screening
  const usedSubstances = ASSIST_SUBSTANCES.filter(
    s => state.assistAnswers[s.key]?.q1_ever && state.assistAnswers[s.key].q1_ever >= 2
  );

  const setAssist = (subKey: string, qId: string, val: number) => {
    setState(s => ({
      ...s,
      assistAnswers: {
        ...s.assistAnswers,
        [subKey]: { ...s.assistAnswers[subKey], [qId]: val },
      },
    }));
  };

  const setAudit = (qId: string, val: number) => {
    setState(s => ({ ...s, auditAnswers: { ...s.auditAnswers, [qId]: val } }));
  };

  const setPHQ = (qId: string, val: number) => {
    setState(s => ({ ...s, phqAnswers: { ...s.phqAnswers, [qId]: val } }));
  };

  const setCSSRS = (qId: string, val: boolean) => {
    setState(s => ({ ...s, cssrsAnswers: { ...s.cssrsAnswers, [qId]: val } }));
  };

  const toggleService = (key: string) => {
    setState(s => ({
      ...s,
      selectedServices: s.selectedServices.includes(key)
        ? s.selectedServices.filter(k => k !== key)
        : [...s.selectedServices, key],
    }));
  };

  // Save results
  const handleFinish = async () => {
    const substanceRisks = computeAssistRisks(state.assistAnswers, isEn);
    const auditScore = computeAuditScore(state.auditAnswers);
    const phq = computePHQ4(state.phqAnswers);
    const crisis = hasCrisisRisk(state.cssrsAnswers);
    const highSubstanceRisk = substanceRisks.some(r => r.level === "high");

    const riskLevel = crisis ? "critical" : (highSubstanceRisk || phq.level === "high" || auditScore >= 8)
      ? "high" : (substanceRisks.some(r => r.level === "moderate") || phq.level === "elevated" || auditScore >= 4)
        ? "moderate" : "low";

    const recommendations: string[] = [];
    if (highSubstanceRisk) recommendations.push("substance_support", "swing_clinic");
    if (auditScore >= 8) recommendations.push("alcohol_support");
    else if (auditScore >= 4) recommendations.push("alcohol_awareness");
    if (phq.level === "high") recommendations.push("mental_health_support", "counseling");
    else if (phq.level === "elevated") recommendations.push("self_care", "counseling");
    if (crisis) recommendations.push("urgent_safety", "crisis_support");
    if (state.injection || state.slam) recommendations.push("injection_safety", "swing_clinic");
    if (state.mixing) recommendations.push("avoid_mixing");

    goNext(); // Move to results

    if (consentGiven) {
      setSaving(true);
      try {
        const anonToken = userId ? undefined : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await supabase.from("hr_screenings").insert({
          user_id: userId || null,
          anonymous_token: anonToken || null,
          status: "completed",
          risk_level: riskLevel,
          recommendations: [...new Set(recommendations)],
          completed_at: new Date().toISOString(),
        });
        trackEvent("hr_screening_completed", { risk_level: riskLevel, method: "validated" });
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Computed results for display
  const substanceRisks = computeAssistRisks(state.assistAnswers, isEn);
  const auditScore = computeAuditScore(state.auditAnswers);
  const phq = computePHQ4(state.phqAnswers);
  const crisis = hasCrisisRisk(state.cssrsAnswers);

  /* === Radio helper === */
  const RadioQ = ({ qId, options, value, onChange }: {
    qId: string;
    options: { value: number; en: string; th: string }[];
    value: number | undefined;
    onChange: (v: number) => void;
  }) => (
    <RadioGroup value={String(value ?? "")} onValueChange={v => onChange(parseInt(v))}>
      <div className="space-y-2">
        {options.map(opt => (
          <div
            key={opt.value}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              value === opt.value ? "border-primary bg-primary/5" : "border-border/40 hover:border-border"
            }`}
            onClick={() => onChange(opt.value)}
          >
            <RadioGroupItem value={String(opt.value)} id={`${qId}-${opt.value}`} />
            <Label htmlFor={`${qId}-${opt.value}`} className="text-sm cursor-pointer flex-1">
              {isEn ? opt.en : opt.th}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );

  /* === Substance card stepper for ASSIST === */
  const SubstanceStep = () => {
    // Phase 1: Select which substances used (q1 for all)
    // Phase 2: For each used substance, ask q2 + q3 + chemsex-specific
    const allAnsweredQ1 = ASSIST_SUBSTANCES.every(s => state.assistAnswers[s.key]?.q1_ever !== undefined);

    if (!allAnsweredQ1) {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{isEn ? "Substance Use Screening" : "การคัดกรองการใช้สาร"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "For each substance, select the option that best describes your experience."
              : "สำหรับแต่ละสาร เลือกตัวเลือกที่ตรงกับประสบการณ์ของคุณ"}
          </p>
          <div className="space-y-3">
            {ASSIST_SUBSTANCES.map(sub => (
              <div key={sub.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sub.icon}</span>
                  <span className="text-sm font-semibold">{isEn ? sub.labelEn : sub.labelTh}</span>
                </div>
                <RadioQ
                  qId={`assist-q1-${sub.key}`}
                  options={ASSIST_QUESTIONS[0].options}
                  value={state.assistAnswers[sub.key]?.q1_ever}
                  onChange={v => setAssist(sub.key, "q1_ever", v)}
                />
              </div>
            ))}
          </div>
          <MethodChip label={isEn ? "Based on WHO ASSIST screening approach" : "อ้างอิงแนวทางคัดกรอง WHO ASSIST"} />
        </div>
      );
    }

    // Phase 2: Follow-up for used substances
    if (usedSubstances.length > 0 && currentSubIdx < usedSubstances.length) {
      const sub = usedSubstances[currentSubIdx];
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sub.icon}</span>
            <h2 className="text-lg font-bold">{isEn ? sub.labelEn : sub.labelTh}</h2>
            <span className="text-xs text-muted-foreground ml-auto">{currentSubIdx + 1}/{usedSubstances.length}</span>
          </div>
          {ASSIST_QUESTIONS.filter(q => q.showIf !== undefined).map(q => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">{isEn ? q.en : q.th}</p>
              <RadioQ
                qId={`${sub.key}-${q.id}`}
                options={q.options}
                value={state.assistAnswers[sub.key]?.[q.id]}
                onChange={v => setAssist(sub.key, q.id, v)}
              />
            </div>
          ))}
          {/* Chemsex-specific for stimulants/sedatives */}
          {(sub.key === "stimulants" || sub.key === "sedatives") && currentSubIdx === usedSubstances.findIndex(s => s.key === sub.key) && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <p className="text-sm font-medium text-muted-foreground">{isEn ? "Additional context" : "ข้อมูลเพิ่มเติม"}</p>
              {[
                { key: "mixing" as const, en: "Mix multiple substances", th: "ผสมสารหลายชนิด" },
                { key: "injection" as const, en: "Use injection", th: "ใช้เข็มฉีด" },
                { key: "slam" as const, en: "Slam (inject for chemsex)", th: "Slam (ฉีดสารเพื่อ chemsex)" },
              ].map(item => (
                <div key={item.key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  state[item.key] ? "border-primary bg-primary/5" : "border-border/40"
                }`} onClick={() => setState(s => ({ ...s, [item.key]: !s[item.key] }))}>
                  <Checkbox checked={state[item.key]} />
                  <span className="text-sm">{isEn ? item.en : item.th}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {currentSubIdx > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setCurrentSubIdx(i => i - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {isEn ? "Previous" : "ก่อนหน้า"}
              </Button>
            )}
            <Button className="flex-1" onClick={() => {
              if (currentSubIdx < usedSubstances.length - 1) setCurrentSubIdx(i => i + 1);
              else goNext();
            }}>
              {currentSubIdx < usedSubstances.length - 1 ? (isEn ? "Next Substance" : "สารถัดไป") : (isEn ? "Continue" : "ดำเนินการต่อ")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <MethodChip label={isEn ? "Based on WHO ASSIST screening approach" : "อ้างอิงแนวทางคัดกรอง WHO ASSIST"} />
        </div>
      );
    }

    // No substances used → auto advance
    return (
      <div className="space-y-4 text-center py-4">
        <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
        <h2 className="text-lg font-bold">{isEn ? "No recent substance use reported" : "ไม่มีการรายงานการใช้สารเมื่อเร็วๆ นี้"}</h2>
        <p className="text-sm text-muted-foreground">{isEn ? "Great. Let's continue with the next section." : "ดีมาก ไปส่วนถัดไปกันเลย"}</p>
        <Button onClick={goNext}>{isEn ? "Continue" : "ดำเนินการต่อ"} <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Stethoscope className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{stepIdx + 1}/{steps.length}</span>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-5">
          {/* === CONSENT === */}
          {step === "consent" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{isEn ? "Privacy & Consent" : "ความเป็นส่วนตัวและความยินยอม"}</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>{isEn
                  ? "This screening uses recognized public health questionnaires to help recommend services suited to your needs."
                  : "การคัดกรองนี้ใช้แบบสอบถามสาธารณสุขที่ได้รับการยอมรับเพื่อแนะนำบริการที่เหมาะกับคุณ"}</p>
                <div className="p-3 rounded-xl bg-muted/30 space-y-1">
                  <p className="font-medium text-foreground">{isEn ? "Important:" : "สิ่งสำคัญ:"}</p>
                  <ul className="space-y-1 text-xs">
                    <li>• {isEn ? "This is a screening tool, not a diagnosis" : "นี่คือเครื่องมือคัดกรอง ไม่ใช่การวินิจฉัย"}</li>
                    <li>• {isEn ? "Your answers help recommend services" : "คำตอบช่วยแนะนำบริการที่เหมาะสม"}</li>
                    <li>• {isEn ? "You can skip non-urgent questions" : "คุณสามารถข้ามคำถามที่ไม่เร่งด่วนได้"}</li>
                    <li>• {isEn ? "All data is anonymous and confidential" : "ข้อมูลทั้งหมดไม่ระบุตัวตนและเป็นความลับ"}</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Checkbox checked={consentGiven} onCheckedChange={(v) => setConsentGiven(!!v)} id="consent" />
                <Label htmlFor="consent" className="text-sm cursor-pointer">
                  {isEn ? "I consent to store my screening results for personalized recommendations" : "ฉันยินยอมให้เก็บผลคัดกรองเพื่อคำแนะนำส่วนบุคคล"}
                </Label>
              </div>
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {isEn
                  ? "Assessment approach based on validated public health screening tools"
                  : "แนวทางการประเมินอ้างอิงเครื่องมือคัดกรองสาธารณสุขที่ผ่านการตรวจสอบ"}
              </p>
            </div>
          )}

          {/* === SUBSTANCE (ASSIST-Lite) === */}
          {step === "substance" && <SubstanceStep />}

          {/* === ALCOHOL (AUDIT-C) === */}
          {step === "alcohol" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{isEn ? "Alcohol Use Assessment" : "การประเมินการใช้แอลกอฮอล์"}</h2>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Since you mentioned alcohol use, these questions help us better understand your drinking patterns."
                  : "เนื่องจากคุณระบุว่าใช้แอลกอฮอล์ คำถามเหล่านี้ช่วยให้เข้าใจรูปแบบการดื่มของคุณ"}
              </p>
              {AUDIT_C_QUESTIONS.map(q => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium">{isEn ? q.en : q.th}</p>
                  <RadioQ qId={q.id} options={q.options} value={state.auditAnswers[q.id]} onChange={v => setAudit(q.id, v)} />
                </div>
              ))}
              <MethodChip label={isEn ? "Based on WHO AUDIT-C" : "อ้างอิง WHO AUDIT-C"} />
            </div>
          )}

          {/* === MENTAL HEALTH (PHQ-4) === */}
          {step === "mental" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{isEn ? "Emotional Wellbeing Check" : "ตรวจสุขภาพจิตเบื้องต้น"}</h2>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Over the past 2 weeks, how often have you been bothered by the following?"
                  : "ใน 2 สัปดาห์ที่ผ่านมา คุณรู้สึกรำคาญจากสิ่งต่อไปนี้บ่อยแค่ไหน?"}
              </p>
              {PHQ4_QUESTIONS.map(q => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium">{isEn ? q.en : q.th}</p>
                  <RadioQ qId={q.id} options={PHQ4_OPTIONS} value={state.phqAnswers[q.id]} onChange={v => setPHQ(q.id, v)} />
                </div>
              ))}
              <MethodChip label={isEn ? "Based on PHQ-4 screener" : "อ้างอิงแบบคัดกรอง PHQ-4"} />
            </div>
          )}

          {/* === CRISIS (C-SSRS) === */}
          {step === "crisis" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <Heart className="h-8 w-8 text-primary mb-2" />
                <h2 className="text-lg font-bold">{isEn ? "Safety Check" : "ตรวจสอบความปลอดภัย"}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isEn
                    ? "Based on your responses, we'd like to check in on how you're feeling. Your safety matters to us."
                    : "จากคำตอบของคุณ เราอยากถามเพิ่มเติมเกี่ยวกับความรู้สึก ความปลอดภัยของคุณสำคัญสำหรับเรา"}
                </p>
              </div>
              {CSSRS_QUESTIONS.map(q => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium">{isEn ? q.en : q.th}</p>
                  <div className="flex gap-2">
                    {[
                      { val: true, en: "Yes", th: "ใช่" },
                      { val: false, en: "No", th: "ไม่" },
                    ].map(opt => (
                      <Button
                        key={String(opt.val)}
                        variant={state.cssrsAnswers[q.id] === opt.val ? "default" : "outline"}
                        className="flex-1 rounded-xl"
                        onClick={() => setCSSRS(q.id, opt.val)}
                      >
                        {isEn ? opt.en : opt.th}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {hasCrisisRisk(state.cssrsAnswers) && (
                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    {isEn ? "If you are in immediate danger, please reach out now:" : "หากคุณอยู่ในอันตรายเฉียบพลัน โปรดติดต่อทันที:"}
                  </p>
                  <a href="tel:1323" className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm">
                    <Phone className="h-4 w-4" /> {isEn ? "Mental Health Hotline: 1323" : "สายด่วนสุขภาพจิต: 1323"}
                  </a>
                  <a href="tel:1669" className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm">
                    <Phone className="h-4 w-4" /> {isEn ? "Emergency: 1669" : "ฉุกเฉิน: 1669"}
                  </a>
                </div>
              )}
              <MethodChip label={isEn ? "Based on the Columbia Protocol (C-SSRS)" : "อ้างอิง Columbia Protocol (C-SSRS)"} />
            </div>
          )}

          {/* === SERVICES === */}
          {step === "services" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{isEn ? "What support would help you most?" : "การสนับสนุนแบบไหนที่ช่วยคุณได้มากที่สุด?"}</h2>
              <p className="text-sm text-muted-foreground">
                {isEn ? "Select any that apply. This helps us recommend the right services." : "เลือกทั้งหมดที่ตรงกับคุณ เพื่อช่วยแนะนำบริการที่เหมาะสม"}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SERVICE_OPTIONS.map(svc => {
                  const Icon = svc.icon;
                  const selected = state.selectedServices.includes(svc.key);
                  return (
                    <div
                      key={svc.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected ? "border-primary bg-primary/5" : "border-border/40 hover:border-border"
                      }`}
                      onClick={() => toggleService(svc.key)}
                    >
                      <Checkbox checked={selected} />
                      <Icon className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm">{isEn ? svc.en : svc.th}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === RESULTS === */}
          {step === "results" && (
            <ResultsView
              substanceRisks={substanceRisks}
              auditScore={auditScore}
              phq={phq}
              crisis={crisis}
              selectedServices={state.selectedServices}
              injection={state.injection}
              slam={state.slam}
              isEn={isEn}
              userId={userId}
              onNavigateSupport={onNavigateSupport}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step !== "results" && !(step === "substance" && usedSubstances.length > 0 && ASSIST_SUBSTANCES.every(s => state.assistAnswers[s.key]?.q1_ever !== undefined) && currentSubIdx < usedSubstances.length) && (
        <div className="flex gap-3">
          {stepIdx > 0 && (
            <Button variant="outline" onClick={goBack} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> {isEn ? "Back" : "ย้อนกลับ"}
            </Button>
          )}
          <Button
            onClick={step === "services" ? handleFinish : goNext}
            className="flex-1"
          >
            {step === "services" ? (isEn ? "See Results" : "ดูผลลัพธ์") : (isEn ? "Next" : "ถัดไป")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   METHOD CHIP (inline source cue)
   ================================================================ */

function MethodChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 mt-3">
      <BookOpen className="h-3 w-3 text-muted-foreground/50" />
      <p className="text-[10px] text-muted-foreground/60">{label}</p>
    </div>
  );
}

/* ================================================================
   RESULTS VIEW
   ================================================================ */

function ResultsView({
  substanceRisks, auditScore, phq, crisis, selectedServices,
  injection, slam, isEn, userId, onNavigateSupport,
}: {
  substanceRisks: SubstanceRisk[];
  auditScore: number;
  phq: ReturnType<typeof computePHQ4>;
  crisis: boolean;
  selectedServices: string[];
  injection: boolean;
  slam: boolean;
  isEn: boolean;
  userId?: string;
  onNavigateSupport?: () => void;
}) {
  const navigate = useNavigate();
  const highSub = substanceRisks.some(r => r.level === "high");
  const modSub = substanceRisks.some(r => r.level === "moderate");

  // Build summary items
  const summaryItems: { icon: React.ElementType; text: string; severity: "critical" | "high" | "moderate" | "low" }[] = [];

  if (crisis) summaryItems.push({ icon: AlertTriangle, text: isEn ? "Urgent safety follow-up needed" : "ต้องการการติดตามความปลอดภัยเร่งด่วน", severity: "critical" });
  if (highSub) summaryItems.push({ icon: Pill, text: isEn ? "Substance-related risk identified" : "พบความเสี่ยงที่เกี่ยวข้องกับสาร", severity: "high" });
  if (auditScore >= 8) summaryItems.push({ icon: Pill, text: isEn ? "Alcohol-specific risk identified" : "พบความเสี่ยงเฉพาะแอลกอฮอล์", severity: "high" });
  else if (auditScore >= 4) summaryItems.push({ icon: Pill, text: isEn ? "Alcohol use may benefit from review" : "การดื่มอาจต้องการการทบทวน", severity: "moderate" });
  if (phq.level === "high") summaryItems.push({ icon: Brain, text: isEn ? "Emotional distress — support recommended" : "ความทุกข์ทางอารมณ์ — แนะนำรับการสนับสนุน", severity: "high" });
  else if (phq.level === "elevated") summaryItems.push({ icon: Brain, text: isEn ? "Elevated distress noted" : "พบความทุกข์ระดับสูงขึ้น", severity: "moderate" });
  if (injection || slam) summaryItems.push({ icon: AlertTriangle, text: isEn ? "Injection/slam-related support available" : "มีการสนับสนุนเกี่ยวกับการฉีด/slam", severity: "high" });

  if (summaryItems.length === 0) {
    summaryItems.push({ icon: ShieldCheck, text: isEn ? "No elevated concerns identified" : "ไม่พบข้อกังวลที่สูงขึ้น", severity: "low" });
  }

  const sevColors = {
    critical: "border-destructive/50 bg-destructive/5 text-destructive",
    high: "border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300",
    moderate: "border-primary/30 bg-primary/5 text-primary",
    low: "border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300",
  };

  // Referral actions
  const actions: { key: string; label: string; icon: React.ElementType; primary: boolean; onClick: () => void }[] = [];

  // Always offer SWING Clinic
  if (crisis || highSub || auditScore >= 8 || phq.level === "high" || injection || slam || selectedServices.includes("swing_clinic")) {
    actions.push({
      key: "swing",
      label: isEn ? "Book with SWING Clinic" : "จองนัด SWING Clinic",
      icon: CalendarDays,
      primary: true,
      onClick: () => navigate("/booking"),
    });
  }

  if (crisis || phq.level === "high" || phq.level === "elevated" || selectedServices.includes("counseling")) {
    actions.push({
      key: "counselor",
      label: isEn ? "Talk to a Counselor" : "พูดคุยกับผู้ให้คำปรึกษา",
      icon: MessageCircle,
      primary: crisis,
      onClick: () => { if (onNavigateSupport) onNavigateSupport(); else openSupportChat(); },
    });
  }

  if (selectedServices.includes("hiv_test") || selectedServices.includes("selftest_kit")) {
    actions.push({
      key: "hiv",
      label: isEn ? "HIV / STI Testing" : "ตรวจ HIV / STI",
      icon: TestTube,
      primary: false,
      onClick: () => navigate("/hiv-selftest"),
    });
  }

  if (selectedServices.includes("prep_pep")) {
    actions.push({
      key: "prep",
      label: isEn ? "PrEP / PEP Information" : "ข้อมูล PrEP / PEP",
      icon: Shield,
      primary: false,
      onClick: () => navigate("/setup-prep-daily"),
    });
  }

  if (selectedServices.includes("mental_health") || phq.level === "high") {
    actions.push({
      key: "mental",
      label: isEn ? "Mental Health Support" : "สนับสนุนสุขภาพจิต",
      icon: Brain,
      primary: false,
      onClick: () => window.open("tel:1323"),
    });
  }

  if (crisis) {
    actions.push({
      key: "emergency",
      label: isEn ? "Emergency: Call 1669" : "ฉุกเฉิน: โทร 1669",
      icon: Phone,
      primary: true,
      onClick: () => window.open("tel:1669"),
    });
  }

  // Default if no actions
  if (actions.length === 0) {
    actions.push({
      key: "swing_default",
      label: isEn ? "Visit SWING Clinic" : "เยี่ยม SWING Clinic",
      icon: CalendarDays,
      primary: false,
      onClick: () => navigate("/booking"),
    });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">{isEn ? "Your Care Plan" : "แผนการดูแลของคุณ"}</h2>

      {/* A. Screening Summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEn ? "Screening Summary" : "สรุปผลคัดกรอง"}
        </h3>
        {summaryItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${sevColors[item.severity]}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          );
        })}
      </div>

      {/* Substance detail */}
      {substanceRisks.filter(r => r.level !== "low").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isEn ? "Substance Risk Detail" : "รายละเอียดความเสี่ยงสาร"}
          </h3>
          {substanceRisks.filter(r => r.level !== "low").map(r => (
            <div key={r.key} className={`flex items-center justify-between p-2.5 rounded-xl border ${
              r.level === "high" ? "border-destructive/30 bg-destructive/5" : "border-amber-300/40 bg-amber-50/30 dark:bg-amber-900/10"
            }`}>
              <span className="text-sm">{r.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                r.level === "high" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}>
                {r.level === "high" ? (isEn ? "Higher risk" : "เสี่ยงสูง") : (isEn ? "Moderate" : "ปานกลาง")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Crisis distress card */}
      {(crisis || phq.level === "high") && (
        <DistressCard userId={userId} onNavigateSupport={onNavigateSupport} />
      )}

      {/* B. Recommended Actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEn ? "Recommended Next Steps" : "ขั้นตอนถัดไปที่แนะนำ"}
        </h3>
        <div className="space-y-2">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant={a.primary ? "default" : "outline"}
                className="w-full rounded-xl h-12 justify-start text-sm"
                onClick={a.onClick}
              >
                <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                {a.label}
                {a.key === "swing" && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
              </Button>
            );
          })}
        </div>
      </div>

      {/* SWING Clinic card */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            SWING Clinic
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "SWING Foundation provides free, non-judgmental HIV testing, PrEP, STI screening, and harm reduction services."
              : "มูลนิธิสวิงให้บริการตรวจ HIV, PrEP, ตรวจ STI และบริการลดอันตรายฟรี ไม่ตัดสิน"}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">HIV Testing</span>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">PrEP</span>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">Harm Reduction</span>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">Counseling</span>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {isEn
          ? "⚕️ This screening is not a diagnosis. It uses validated public health tools to help recommend services. Always consult a healthcare professional for clinical advice."
          : "⚕️ การคัดกรองนี้ไม่ใช่การวินิจฉัย ใช้เครื่องมือสาธารณสุขที่ผ่านการตรวจสอบเพื่อแนะนำบริการ ควรปรึกษาแพทย์สำหรับคำแนะนำทางคลินิก"}
      </p>

      {/* Citation chips */}
      <CitationChips
        isEn={isEn}
        chips={[
          { label: "WHO ASSIST", credibilityLevel: "global_guidance" },
          { label: "WHO AUDIT", credibilityLevel: "global_guidance" },
          { label: "PHQ-4", credibilityLevel: "peer_reviewed" },
          { label: "C-SSRS", credibilityLevel: "peer_reviewed" },
        ]}
      />

      {/* Full references */}
      <PageReferences
        pageType="harm_reduction"
        pageSlug="risk-screening"
        isEn={isEn}
        lastReviewed="March 2026"
        sourceBasis={isEn ? "Based on WHO ASSIST, AUDIT, PHQ-4, and Columbia Protocol" : "อ้างอิง WHO ASSIST, AUDIT, PHQ-4 และ Columbia Protocol"}
      />
    </div>
  );
}

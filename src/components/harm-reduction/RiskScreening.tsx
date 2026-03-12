import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  Pill, Heart, AlertTriangle, Brain, ChevronRight, ChevronLeft,
  ShieldCheck, ShieldAlert, Shield, CheckCircle2,
} from "lucide-react";

interface Props {
  userId?: string;
  onNavigateSupport?: () => void;
}

interface ScreeningData {
  substances: string[];
  frequency: string;
  mixing: boolean;
  injection: boolean;
  slam: boolean;
  condomUse: string;
  prepUse: string;
  lastHivTest: string;
  stiHistory: boolean;
  overdose: boolean;
  panic: boolean;
  blackout: boolean;
  crash: boolean;
  anxiety: number;
  depression: number;
  loneliness: number;
  sleepIssues: number;
}

const INITIAL: ScreeningData = {
  substances: [], frequency: "", mixing: false, injection: false, slam: false,
  condomUse: "", prepUse: "", lastHivTest: "", stiHistory: false,
  overdose: false, panic: false, blackout: false, crash: false,
  anxiety: 0, depression: 0, loneliness: 0, sleepIssues: 0,
};

const SUBSTANCES = [
  { value: "meth", labelTh: "ไอซ์ / เมท", labelEn: "Crystal Meth / Ice" },
  { value: "ghb", labelTh: "GHB / G", labelEn: "GHB / G" },
  { value: "mdma", labelTh: "MDMA / Ecstasy", labelEn: "MDMA / Ecstasy" },
  { value: "poppers", labelTh: "Poppers", labelEn: "Poppers" },
  { value: "ketamine", labelTh: "คีตามีน", labelEn: "Ketamine" },
  { value: "alcohol", labelTh: "แอลกอฮอล์", labelEn: "Alcohol" },
  { value: "cannabis", labelTh: "กัญชา", labelEn: "Cannabis" },
  { value: "other", labelTh: "อื่นๆ", labelEn: "Other" },
];

const STEPS = ["consent", "substance", "sexual", "harm", "mental", "results"] as const;

function computeRisk(data: ScreeningData): { level: string; score: number; recommendations: string[] } {
  let score = 0;
  const recs: string[] = [];

  // Substance scoring
  if (data.substances.length >= 3) score += 3;
  else if (data.substances.length >= 1) score += 1;
  if (data.mixing) { score += 3; recs.push("avoid_mixing"); }
  if (data.injection) { score += 4; recs.push("injection_safety"); }
  if (data.slam) { score += 4; recs.push("slam_support"); }
  if (data.frequency === "daily" || data.frequency === "weekly") score += 2;

  // Sexual health
  if (data.condomUse === "never" || data.condomUse === "rarely") { score += 3; recs.push("condom_use"); }
  if (data.prepUse === "no") { score += 2; recs.push("start_prep"); }
  if (data.lastHivTest === "never" || data.lastHivTest === "over_year") { score += 2; recs.push("hiv_testing"); }
  if (data.stiHistory) { score += 1; recs.push("sti_testing"); }

  // Harms
  if (data.overdose) { score += 4; recs.push("overdose_plan"); }
  if (data.panic) score += 2;
  if (data.blackout) { score += 3; recs.push("safer_use"); }
  if (data.crash) score += 2;

  // Mental health
  const mentalTotal = data.anxiety + data.depression + data.loneliness + data.sleepIssues;
  if (mentalTotal >= 12) { score += 3; recs.push("counseling"); }
  else if (mentalTotal >= 6) { score += 1; recs.push("self_care"); }

  let level = "low";
  if (score >= 12) level = "high";
  else if (score >= 6) level = "moderate";

  return { level, score, recommendations: [...new Set(recs)] };
}

export function RiskScreening({ userId }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ScreeningData>(INITIAL);
  const [consentGiven, setConsentGiven] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof computeRisk> | null>(null);
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleNext = async () => {
    if (step < STEPS.length - 2) {
      setStep(s => s + 1);
    } else if (step === STEPS.length - 2) {
      // Compute results
      const res = computeRisk(data);
      setResult(res);
      setStep(s => s + 1);

      // Save to DB if consented
      if (consentGiven) {
        setSaving(true);
        try {
          const anonToken = userId ? undefined : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { data: screening, error } = await supabase
            .from("hr_screenings")
            .insert({
              user_id: userId || null,
              anonymous_token: anonToken || null,
              status: "completed",
              risk_level: res.level,
              recommendations: res.recommendations,
              completed_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (error) throw error;
          if (!screening) return;

          // Save sub-tables in parallel
          await Promise.all([
            supabase.from("hr_substance_use").insert({
              screening_id: screening.id,
              substances: data.substances,
              frequency: data.frequency,
              mixing: data.mixing,
              injection_use: data.injection,
              slam_use: data.slam,
            }),
            supabase.from("hr_sexual_health").insert({
              screening_id: screening.id,
              condom_use: data.condomUse,
              prep_use: data.prepUse,
              last_hiv_test: data.lastHivTest,
              sti_history: data.stiHistory,
            }),
            supabase.from("hr_harm_history").insert({
              screening_id: screening.id,
              overdose: data.overdose,
              panic: data.panic,
              blackout: data.blackout,
              crash: data.crash,
            }),
            supabase.from("hr_mental_health").insert({
              screening_id: screening.id,
              anxiety_level: data.anxiety,
              depression_level: data.depression,
              loneliness_level: data.loneliness,
              sleep_issues_level: data.sleepIssues,
            }),
          ]);

          trackEvent("hr_screening_completed", { risk_level: res.level });
        } catch (err) {
          console.error("Failed to save screening:", err);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleBack = () => step > 0 && setStep(s => s - 1);

  const toggle = (field: keyof ScreeningData) => setData(d => ({ ...d, [field]: !d[field as keyof typeof d] }));

  const stepIcons = [Shield, Pill, Heart, AlertTriangle, Brain, CheckCircle2];
  const StepIcon = stepIcons[step];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <StepIcon className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{step + 1}/{STEPS.length}</span>
      </div>

      <Card className="border border-border/40">
        <CardContent className="p-5">
          {/* CONSENT */}
          {currentStep === "consent" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Privacy & Consent" : "ความเป็นส่วนตัวและความยินยอม"}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isEn
                  ? "This screening is anonymous and voluntary. Your answers help us provide personalized recommendations. No data is shared without your consent."
                  : "การประเมินนี้ไม่ระบุตัวตนและสมัครใจ คำตอบของคุณช่วยให้เราแนะนำได้ตรงจุด ข้อมูลจะไม่ถูกแชร์โดยไม่ได้รับอนุญาต"}
              </p>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <Checkbox checked={consentGiven} onCheckedChange={(v) => setConsentGiven(!!v)} id="consent" />
                <Label htmlFor="consent" className="text-sm cursor-pointer">
                  {isEn ? "I consent to store my screening results for personalized recommendations" : "ฉันยินยอมให้เก็บผลการประเมินเพื่อคำแนะนำส่วนบุคคล"}
                </Label>
              </div>
            </div>
          )}

          {/* SUBSTANCE USE */}
          {currentStep === "substance" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Substance Use" : "การใช้สาร"}</h2>
              <p className="text-sm text-muted-foreground">{isEn ? "Select any substances you've used recently (past 3 months)" : "เลือกสารที่คุณเคยใช้ในช่วง 3 เดือนที่ผ่านมา"}</p>
              <div className="grid grid-cols-2 gap-2">
                {SUBSTANCES.map(s => (
                  <div key={s.value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${data.substances.includes(s.value) ? "border-primary bg-primary/5" : "border-border/40"}`}
                    onClick={() => setData(d => ({
                      ...d,
                      substances: d.substances.includes(s.value) ? d.substances.filter(x => x !== s.value) : [...d.substances, s.value],
                    }))}>
                    <Checkbox checked={data.substances.includes(s.value)} />
                    <span className="text-sm">{isEn ? s.labelEn : s.labelTh}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium">{isEn ? "How often?" : "บ่อยแค่ไหน?"}</p>
                <RadioGroup value={data.frequency} onValueChange={v => setData(d => ({ ...d, frequency: v }))}>
                  {[
                    { value: "once", labelTh: "ครั้งเดียว", labelEn: "Once" },
                    { value: "monthly", labelTh: "รายเดือน", labelEn: "Monthly" },
                    { value: "weekly", labelTh: "รายสัปดาห์", labelEn: "Weekly" },
                    { value: "daily", labelTh: "ทุกวัน", labelEn: "Daily" },
                  ].map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                      <Label htmlFor={`freq-${opt.value}`} className="text-sm">{isEn ? opt.labelEn : opt.labelTh}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2 mt-2">
                {[
                  { key: "mixing" as const, labelTh: "ผสมสารหลายชนิด", labelEn: "Mix multiple substances" },
                  { key: "injection" as const, labelTh: "ใช้เข็มฉีด", labelEn: "Use injection" },
                  { key: "slam" as const, labelTh: "Slam (ฉีดสารเพื่อ chemsex)", labelEn: "Slam (inject for chemsex)" },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox checked={data[item.key]} onCheckedChange={() => toggle(item.key)} id={item.key} />
                    <Label htmlFor={item.key} className="text-sm">{isEn ? item.labelEn : item.labelTh}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEXUAL HEALTH */}
          {currentStep === "sexual" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Sexual Health" : "สุขภาพทางเพศ"}</h2>
              {[
                { field: "condomUse", label: isEn ? "Condom use" : "การใช้ถุงยาง", options: [
                  { value: "always", labelTh: "ทุกครั้ง", labelEn: "Always" },
                  { value: "mostly", labelTh: "เกือบทุกครั้ง", labelEn: "Mostly" },
                  { value: "rarely", labelTh: "บางครั้ง", labelEn: "Rarely" },
                  { value: "never", labelTh: "ไม่เคย", labelEn: "Never" },
                ]},
                { field: "prepUse", label: isEn ? "PrEP use" : "การใช้ PrEP", options: [
                  { value: "yes_daily", labelTh: "ใช่ รายวัน", labelEn: "Yes, daily" },
                  { value: "yes_ondemand", labelTh: "ใช่ ตามเหตุการณ์", labelEn: "Yes, on-demand" },
                  { value: "no", labelTh: "ไม่ได้ใช้", labelEn: "No" },
                  { value: "unsure", labelTh: "ไม่แน่ใจ", labelEn: "Not sure" },
                ]},
                { field: "lastHivTest", label: isEn ? "Last HIV test" : "ตรวจ HIV ครั้งสุดท้าย", options: [
                  { value: "within_3m", labelTh: "ภายใน 3 เดือน", labelEn: "Within 3 months" },
                  { value: "within_year", labelTh: "ภายใน 1 ปี", labelEn: "Within a year" },
                  { value: "over_year", labelTh: "มากกว่า 1 ปี", labelEn: "Over a year ago" },
                  { value: "never", labelTh: "ไม่เคย", labelEn: "Never" },
                ]},
              ].map(group => (
                <div key={group.field} className="space-y-2">
                  <p className="text-sm font-medium">{group.label}</p>
                  <RadioGroup value={(data as any)[group.field]} onValueChange={v => setData(d => ({ ...d, [group.field]: v }))}>
                    {group.options.map(opt => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`${group.field}-${opt.value}`} />
                        <Label htmlFor={`${group.field}-${opt.value}`} className="text-sm">{isEn ? opt.labelEn : opt.labelTh}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={data.stiHistory} onCheckedChange={() => toggle("stiHistory")} id="sti" />
                <Label htmlFor="sti" className="text-sm">{isEn ? "Previous STI diagnosis" : "เคยได้รับการวินิจฉัย STI"}</Label>
              </div>
            </div>
          )}

          {/* HARM HISTORY */}
          {currentStep === "harm" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Harms Experienced" : "ประสบการณ์ที่เคยเกิดขึ้น"}</h2>
              <p className="text-sm text-muted-foreground">{isEn ? "Have you experienced any of the following?" : "คุณเคยประสบสิ่งเหล่านี้ไหม?"}</p>
              {[
                { key: "overdose" as const, labelTh: "Overdose / ใช้สารมากเกินไป", labelEn: "Overdose" },
                { key: "panic" as const, labelTh: "Panic attack / ตื่นตระหนก", labelEn: "Panic attack" },
                { key: "blackout" as const, labelTh: "หมดสติ / Blackout", labelEn: "Blackout / Loss of consciousness" },
                { key: "crash" as const, labelTh: "Crash / อาการถอน", labelEn: "Crash / Comedown" },
              ].map(item => (
                <div key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${data[item.key] ? "border-destructive/50 bg-destructive/5" : "border-border/40"}`}
                  onClick={() => toggle(item.key)}>
                  <Checkbox checked={data[item.key]} />
                  <span className="text-sm">{isEn ? item.labelEn : item.labelTh}</span>
                </div>
              ))}
            </div>
          )}

          {/* MENTAL HEALTH */}
          {currentStep === "mental" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Mental Health Check" : "ประเมินสุขภาพจิต"}</h2>
              <p className="text-sm text-muted-foreground">{isEn ? "Rate how you've felt in the past 2 weeks (0 = not at all, 5 = very much)" : "ให้คะแนนความรู้สึกใน 2 สัปดาห์ที่ผ่านมา (0 = ไม่เลย, 5 = มากที่สุด)"}</p>
              {[
                { key: "anxiety" as const, labelTh: "ความวิตกกังวล", labelEn: "Anxiety" },
                { key: "depression" as const, labelTh: "อารมณ์ซึมเศร้า", labelEn: "Depressed mood" },
                { key: "loneliness" as const, labelTh: "ความเหงา", labelEn: "Loneliness" },
                { key: "sleepIssues" as const, labelTh: "ปัญหาการนอน", labelEn: "Sleep issues" },
              ].map(item => (
                <div key={item.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">{isEn ? item.labelEn : item.labelTh}</Label>
                    <Badge variant="secondary" className="text-xs">{data[item.key]}/5</Badge>
                  </div>
                  <Slider
                    value={[data[item.key]]}
                    onValueChange={([v]) => setData(d => ({ ...d, [item.key]: v }))}
                    min={0} max={5} step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}

          {/* RESULTS */}
          {currentStep === "results" && result && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{isEn ? "Your Results" : "ผลการประเมินของคุณ"}</h2>
              <div className={`p-4 rounded-2xl border-2 text-center ${
                result.level === "high" ? "border-destructive/50 bg-destructive/5" :
                result.level === "moderate" ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10" :
                "border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-900/10"
              }`}>
                {result.level === "high" && <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-2" />}
                {result.level === "moderate" && <Shield className="h-10 w-10 text-amber-500 mx-auto mb-2" />}
                {result.level === "low" && <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />}
                <h3 className="text-xl font-bold">
                  {result.level === "high" ? (isEn ? "Higher Risk" : "ความเสี่ยงสูง") :
                   result.level === "moderate" ? (isEn ? "Needs Safer Planning" : "ต้องวางแผนให้ปลอดภัยขึ้น") :
                   (isEn ? "Low Concern" : "ความเสี่ยงต่ำ")}
                </h3>
              </div>

              {result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold">{isEn ? "Recommendations" : "คำแนะนำ"}</h3>
                  {result.recommendations.map(rec => {
                    const recLabels: Record<string, { th: string; en: string }> = {
                      start_prep: { th: "พิจารณาเริ่มใช้ PrEP", en: "Consider starting PrEP" },
                      hiv_testing: { th: "ตรวจ HIV เป็นประจำ", en: "Get regular HIV testing" },
                      sti_testing: { th: "ตรวจ STI", en: "Get STI testing" },
                      counseling: { th: "พูดคุยกับผู้ให้คำปรึกษา", en: "Talk to a counselor" },
                      safer_use: { th: "วางแผนการใช้สารให้ปลอดภัยขึ้น", en: "Plan for safer substance use" },
                      condom_use: { th: "ใช้ถุงยางอนามัยอย่างสม่ำเสมอ", en: "Use condoms consistently" },
                      avoid_mixing: { th: "หลีกเลี่ยงการผสมสาร", en: "Avoid mixing substances" },
                      overdose_plan: { th: "เรียนรู้วิธีรับมือ overdose", en: "Learn overdose response" },
                      injection_safety: { th: "ใช้อุปกรณ์สะอาดเสมอ", en: "Always use clean equipment" },
                      slam_support: { th: "ขอรับการสนับสนุนเรื่อง slam", en: "Seek slam-specific support" },
                      self_care: { th: "ดูแลสุขภาพจิตของตนเอง", en: "Practice self-care for mental health" },
                    };
                    const label = recLabels[rec];
                    return (
                      <div key={rec} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{label ? (isEn ? label.en : label.th) : rec}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed mt-3">
                {isEn
                  ? "This screening is not a diagnosis. It's a tool to help you understand your situation better. Please consult a healthcare provider for professional advice."
                  : "การประเมินนี้ไม่ใช่การวินิจฉัย แต่เป็นเครื่องมือช่วยให้คุณเข้าใจสถานการณ์ได้ดีขึ้น โปรดปรึกษาผู้ให้บริการด้านสุขภาพเพื่อคำแนะนำจากผู้เชี่ยวชาญ"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep !== "results" && (
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {isEn ? "Back" : "ย้อนกลับ"}
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1" disabled={currentStep === "consent" && !consentGiven && false}>
            {step === STEPS.length - 2 ? (isEn ? "See Results" : "ดูผลลัพธ์") : (isEn ? "Next" : "ถัดไป")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

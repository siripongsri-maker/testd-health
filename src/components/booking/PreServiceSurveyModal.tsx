import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, ShieldCheck, Sparkles, Fingerprint } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateUic, isYearPlausibleForMode, maskUic, type UicNationality } from "@/lib/uic";

interface Props {
  bookingId: string;
  channel?: string;
}

type KAns = "yes" | "no" | "unsure";
const tx = (th: string, en: string, lang: string) => (lang === "th" ? th : en);

const KNOWLEDGE_KEYS = ["k_condom", "k_test", "k_clean_inject", "k_water", "k_dose"] as const;
const BEHAVIOR_KEYS = ["b_condom", "b_test", "b_clean_inject", "b_dose", "b_water", "b_help"] as const;

const KNOWLEDGE_LABELS: Record<(typeof KNOWLEDGE_KEYS)[number], [string, string]> = {
  k_condom: ["รู้วิธีใช้ถุงยางอนามัยอย่างถูกต้อง", "I know how to use condoms correctly"],
  k_test: ["รู้ว่าควรตรวจ HIV/STI บ่อยแค่ไหน", "I know how often to test for HIV/STIs"],
  k_clean_inject: ["รู้เรื่องอุปกรณ์ฉีดที่สะอาด/ลดอันตราย", "I know about clean injection / harm reduction"],
  k_water: ["รู้ว่าควรพักและดื่มน้ำระหว่างใช้สาร", "I know to take breaks and hydrate"],
  k_dose: ["รู้วิธีวางแผนปริมาณและไม่ผสมสาร", "I know how to plan dose and avoid mixing"],
};
const BEHAVIOR_LABELS: Record<(typeof BEHAVIOR_KEYS)[number], [string, string]> = {
  b_condom: ["ใช้ถุงยางอย่างสม่ำเสมอ", "Use condoms consistently"],
  b_test: ["ตรวจ HIV/STI สม่ำเสมอ", "Test for HIV/STIs regularly"],
  b_clean_inject: ["ใช้อุปกรณ์ฉีดที่สะอาด", "Use clean injection equipment"],
  b_dose: ["วางแผนใช้สารและไม่ผสม", "Plan substance use and avoid mixing"],
  b_water: ["ดื่มน้ำ/พักระหว่างกิจกรรม", "Hydrate and take breaks"],
  b_help: ["ขอความช่วยเหลือเมื่อจำเป็น", "Ask for help when needed"],
};

const storageKey = (bookingId: string) => `pre_service_survey_done:${bookingId}`;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function PreServiceSurveyModal({ bookingId, channel }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "survey" | "done">("intro");
  const [submitting, setSubmitting] = useState(false);
  const [visitNumber, setVisitNumber] = useState<number | null>(null);

  // UIC fields
  const [nationality, setNationality] = useState<UicNationality>("thai");
  const [firstInitial, setFirstInitial] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Survey fields
  const [knowledge, setKnowledge] = useState<Record<string, KAns>>({});
  const [behavior, setBehavior] = useState<Record<string, KAns>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [safety, setSafety] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<string>("");
  const [mhInterest, setMhInterest] = useState<string>("");
  const [suggestions, setSuggestions] = useState("");

  // Auto-open once per booking
  useEffect(() => {
    if (!bookingId) return;
    const done = localStorage.getItem(storageKey(bookingId));
    if (done) {
      setOpen(false);
      return;
    }
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [bookingId]);

  const THAI_CHAR = /^[\u0E00-\u0E7F]$/;
  const EN_CHAR = /^[A-Za-z]$/;
  const initialOk = (s: string) =>
    nationality === "thai" ? THAI_CHAR.test(s) : EN_CHAR.test(s);

  const uicResult = generateUic({
    firstName: firstInitial,
    lastName: lastInitial,
    day: Number(day) || null,
    month: Number(month) || null,
    year: Number(year) || null,
    nationality,
  });

  const uicValid = !!uicResult.uic;

  const surveyValid =
    KNOWLEDGE_KEYS.every((k) => knowledge[k]) &&
    BEHAVIOR_KEYS.every((k) => behavior[k]) &&
    confidence !== null &&
    safety !== null &&
    recommend &&
    mhInterest;

  const canSubmit = uicValid && surveyValid;

  const submit = async () => {
    if (!canSubmit || !uicResult.uic) return;
    setSubmitting(true);
    try {
      const uic_code = uicResult.uic;
      const uic_hash = await sha256Hex(uic_code);
      console.log("PRE_SURVEY_UIC", { uic_code: maskUic(uic_code), uic_hash });

      const { data, error } = await supabase.rpc("submit_pre_service_survey", {
        p_booking_id: bookingId,
        p_uic_code: uic_code,
        p_uic_hash: uic_hash,
        p_language: language,
        p_channel: channel || "clinic",
        p_knowledge: knowledge,
        p_behavior: behavior,
        p_confidence: confidence,
        p_safety: safety,
        p_recommend: recommend,
        p_mental_health_interest: mhInterest,
        p_suggestions: suggestions.trim() || null,
      });

      if (error) {
        // Duplicate booking_id (unique constraint) → already submitted
        if (error.code === "23505") {
          localStorage.setItem(storageKey(bookingId), "1");
          setStep("done");
          setSubmitting(false);
          return;
        }
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const seq = row?.visit_sequence ?? 1;
      setVisitNumber(seq);
      console.log("PRE_SURVEY_INSERT_RESULT", row);
      localStorage.setItem(storageKey(bookingId), "1");
      setStep("done");
      toast({ title: tx("ขอบคุณสำหรับคำตอบ 🙏", "Thanks for sharing 🙏", language) });
    } catch (err: any) {
      console.error("PRE_SURVEY_ERROR", err);
      toast({
        title: tx("บันทึกไม่สำเร็จ", "Could not save", language),
        description: tx("ลองอีกครั้ง หรือข้ามไปก่อนได้", "Try again, or skip for now", language),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    localStorage.setItem(storageKey(bookingId), "skipped");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && skip()}>
      <DialogContent
        className={cn(
          "p-0 gap-0 border-0 overflow-hidden",
          "max-w-lg w-[calc(100vw-1.5rem)] sm:w-full",
          "max-h-[92vh] flex flex-col",
          "bg-gradient-to-br from-teal-50 via-white to-sky-50",
          "dark:from-teal-950/40 dark:via-background dark:to-sky-950/40",
          "rounded-3xl shadow-2xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4",
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 text-left bg-gradient-to-br from-teal-500/10 to-sky-500/5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-bold text-teal-600">
                {tx("ก่อนเข้ารับบริการ", "Before service", language)}
              </p>
              <h2 className="text-lg font-bold text-foreground leading-snug">
                {tx("ตอบสั้น ๆ 1 นาที", "1 minute survey", language)}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-teal-600" />
                {tx(
                  "ข้อมูลนี้ช่วยให้ทีมเตรียมบริการที่เหมาะกับคุณ โดยไม่เปิดเผยตัวตน",
                  "Helps the team prepare your visit — anonymous.",
                  language,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {step === "intro" && (
            <div className="space-y-4 text-left animate-fade-in">
              <div className="rounded-2xl border border-teal-200/60 bg-white/70 dark:bg-card/60 p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {tx(
                    "เราจะถามคำถามสั้น ๆ เกี่ยวกับสุขภาพและความรู้สึกของคุณ เพื่อให้ทีมเตรียมการดูแลให้เหมาะที่สุด ไม่ต้องใช้ชื่อจริง",
                    "We'll ask a few short questions so the team can prepare the right care. No real name needed.",
                    language,
                  )}
                </p>
              </div>
              <Button
                onClick={() => setStep("survey")}
                className="w-full h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {tx("เริ่มทำแบบสำรวจ", "Start survey", language)}
              </Button>
              <button
                onClick={skip}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
              >
                {tx("ข้ามไปก่อน", "Skip for now", language)}
              </button>
            </div>
          )}

          {step === "survey" && (
            <div className="space-y-5 text-left animate-fade-in">
              {/* UIC */}
              <Section
                icon={<Fingerprint className="h-4 w-4 text-teal-600" />}
                title={tx("รหัสติดตามแบบไม่เปิดเผยตัวตน (UIC)", "Anonymous tracking code (UIC)", language)}
                hint={tx(
                  "ใช้เพื่อเชื่อมข้อมูลสุขภาพในการเข้ารับบริการครั้งถัดไป โดยไม่ต้องใช้ชื่อจริง",
                  "Used to link your health data on future visits — without using your real name.",
                  language,
                )}
              >
                <div className="flex gap-2 text-xs">
                  {(["thai", "foreign"] as UicNationality[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNationality(n)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border-2 font-medium",
                        nationality === n
                          ? "bg-teal-500 border-teal-600 text-white"
                          : "bg-card border-border text-foreground",
                      )}
                    >
                      {n === "thai"
                        ? tx("ไทย (พ.ศ.)", "Thai (BE)", language)
                        : tx("ต่างชาติ (ค.ศ.)", "Foreign (CE)", language)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput
                    label={tx("อักษรแรกชื่อ", "First-name initial", language)}
                    value={firstInitial}
                    onChange={(v) => setFirstInitial(v.trim().slice(0, 1))}
                    maxLength={1}
                    placeholder={nationality === "thai" ? "ส" : "S"}
                    ok={initialOk(firstInitial)}
                  />
                  <LabeledInput
                    label={tx("อักษรแรกนามสกุล", "Last-name initial", language)}
                    value={lastInitial}
                    onChange={(v) => setLastInitial(v.trim().slice(0, 1))}
                    maxLength={1}
                    placeholder={nationality === "thai" ? "จ" : "J"}
                    ok={initialOk(lastInitial)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <LabeledInput
                    label={tx("วัน", "Day", language)}
                    value={day}
                    onChange={(v) => setDay(v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric"
                    placeholder="12"
                    ok={Number(day) >= 1 && Number(day) <= 31}
                  />
                  <LabeledInput
                    label={tx("เดือน", "Month", language)}
                    value={month}
                    onChange={(v) => setMonth(v.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric"
                    placeholder="09"
                    ok={Number(month) >= 1 && Number(month) <= 12}
                  />
                  <LabeledInput
                    label={nationality === "thai" ? tx("ปี (พ.ศ.)", "Year (BE)", language) : tx("ปี (ค.ศ.)", "Year (CE)", language)}
                    value={year}
                    onChange={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder={nationality === "thai" ? "2540" : "1997"}
                    ok={Number(year) > 0 && isYearPlausibleForMode(Number(year), nationality)}
                  />
                </div>
                <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 px-3 py-2 text-xs text-teal-800 dark:text-teal-200">
                  {uicValid ? (
                    <>
                      <span className="font-bold">UIC:</span> {maskUic(uicResult.uic)}
                    </>
                  ) : (
                    tx("ตัวอย่าง: สมชาย ใจดี 12/09/2540 → สจ120940", "Example: John Smith 14/08/1995 → JS140895", language)
                  )}
                </div>
              </Section>

              {/* Knowledge */}
              <Section title={tx("1. ความรู้เรื่องการลดอันตราย", "1. Harm reduction knowledge", language)}>
                {KNOWLEDGE_KEYS.map((k) => (
                  <MatrixRow
                    key={k}
                    label={tx(KNOWLEDGE_LABELS[k][0], KNOWLEDGE_LABELS[k][1], language)}
                    value={knowledge[k]}
                    options={[
                      { v: "yes", l: tx("ใช่", "Yes", language) },
                      { v: "no", l: tx("ไม่ใช่", "No", language) },
                      { v: "unsure", l: tx("ไม่แน่ใจ", "Unsure", language) },
                    ]}
                    onChange={(v) => setKnowledge((p) => ({ ...p, [k]: v as KAns }))}
                  />
                ))}
              </Section>

              {/* Behavior */}
              <Section title={tx("2. พฤติกรรมดูแลตัวเองตอนนี้", "2. Current self-care behaviour", language)}>
                {BEHAVIOR_KEYS.map((k) => (
                  <MatrixRow
                    key={k}
                    label={tx(BEHAVIOR_LABELS[k][0], BEHAVIOR_LABELS[k][1], language)}
                    value={behavior[k]}
                    options={[
                      { v: "yes", l: tx("ทำอยู่แล้ว", "Already doing", language) },
                      { v: "no", l: tx("อยากลอง", "Want to try", language) },
                      { v: "unsure", l: tx("ยังไม่พร้อม", "Not yet", language) },
                    ]}
                    onChange={(v) => setBehavior((p) => ({ ...p, [k]: v as KAns }))}
                  />
                ))}
              </Section>

              {/* Confidence / Safety / Recommend */}
              <Section title={tx("3. ความมั่นใจและความคาดหวัง", "3. Confidence & expectations", language)}>
                <RatingRow
                  label={tx("ความมั่นใจในการดูแลสุขภาพตัวเอง", "Confidence in caring for your health", language)}
                  value={confidence}
                  onChange={setConfidence}
                />
                <RatingRow
                  label={tx("คาดว่าบริการนี้จะเป็นความลับและปลอดภัย", "Expected safety & confidentiality", language)}
                  value={safety}
                  onChange={setSafety}
                />
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {tx("ถ้าบริการดี คุณจะแนะนำเพื่อนไหม", "Would you recommend it to a friend?", language)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "definitely", l: tx("แน่นอน", "Definitely", language) },
                      { v: "probably", l: tx("น่าจะใช่", "Probably", language) },
                      { v: "maybe", l: tx("อาจจะ", "Maybe", language) },
                      { v: "no", l: tx("ไม่ค่อย", "Not really", language) },
                    ].map((o) => (
                      <PillButton key={o.v} active={recommend === o.v} onClick={() => setRecommend(o.v)}>
                        {o.l}
                      </PillButton>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Mental health */}
              <Section title={tx("4. สุขภาพใจ", "4. Mental health support", language)}>
                <p className="text-sm font-medium text-foreground mb-2">
                  {tx(
                    "ตอนนี้คุณอยากได้คนช่วยดูแลสุขภาพใจไหม",
                    "Would you like mental health support right now?",
                    language,
                  )}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { v: "yes", l: tx("ใช่ อยากได้", "Yes, I'd like support", language) },
                    { v: "maybe", l: tx("อาจจะ ขอลองคุยก่อน", "Maybe, let me try talking first", language) },
                    { v: "no", l: tx("ไม่ ตอนนี้โอเค", "No, I'm okay for now", language) },
                    { v: "pns", l: tx("ไม่อยากตอบ", "Prefer not to say", language) },
                  ].map((o) => (
                    <PillButton key={o.v} active={mhInterest === o.v} onClick={() => setMhInterest(o.v)}>
                      {o.l}
                    </PillButton>
                  ))}
                </div>
              </Section>

              <Section title={tx("5. มีอะไรอยากให้ทีมรู้ไหม (ไม่บังคับ)", "5. Anything to share? (optional)", language)}>
                <Textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder={tx(
                    "เช่น สิ่งที่กังวล หรืออยากให้ทีมเตรียมก่อนพบ",
                    "e.g. concerns or things the team should know before your visit",
                    language,
                  )}
                  rows={3}
                  className="rounded-2xl"
                />
              </Section>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-4 py-6 animate-fade-in">
              <div className="h-16 w-16 mx-auto rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Check className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {tx("ขอบคุณสำหรับข้อมูล", "Thank you", language)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 px-2">
                  {tx(
                    "ทีมบริการจะใช้ข้อมูลนี้เพื่อเตรียมการดูแลที่เหมาะกับคุณ",
                    "The team will use this to prepare the right care for you.",
                    language,
                  )}
                </p>
                {visitNumber !== null && (
                  <p className="text-xs text-teal-700 dark:text-teal-300 mt-3">
                    {tx(
                      `นี่คือการเข้ารับบริการครั้งที่ ${visitNumber} ของคุณ`,
                      `This is visit #${visitNumber}`,
                      language,
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === "survey" && (
          <div className="px-5 py-3 border-t border-border/50 bg-background/60 backdrop-blur flex gap-2">
            <Button
              variant="ghost"
              onClick={skip}
              disabled={submitting}
              className="rounded-full text-muted-foreground"
            >
              {tx("ข้าม", "Skip", language)}
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white h-11 font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tx("กำลังบันทึก...", "Saving...", language)}
                </>
              ) : (
                tx("ส่งคำตอบ", "Submit", language)
              )}
            </Button>
          </div>
        )}
        {step === "done" && (
          <div className="px-5 py-3 border-t border-border/50 bg-background/60 backdrop-blur grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-full"
            >
              {tx("กลับหน้าหลัก", "Back home", language)}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                navigate("/my-appointments");
              }}
              className="rounded-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {tx("ดูนัดหมายของฉัน", "My appointments", language)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  maxLength,
  inputMode,
  placeholder,
  ok,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  ok?: boolean;
}) {
  const filled = value.length > 0;
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        className={cn(
          "mt-1 h-10 rounded-xl text-center font-bold",
          filled && ok && "border-teal-500 bg-teal-50/50",
          filled && !ok && "border-rose-400",
        )}
      />
    </label>
  );
}

function MatrixRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-foreground mb-1.5">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <PillButton key={o.v} active={value === o.v} onClick={() => onChange(o.v)} compact>
            {o.l}
          </PillButton>
        ))}
      </div>
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  const emojis = ["😞", "🙁", "😐", "🙂", "😊"];
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex justify-between gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 aspect-square rounded-2xl border-2 text-xl flex items-center justify-center transition-all",
              value === n
                ? "bg-teal-500 border-teal-600 text-white scale-105 shadow-md"
                : "bg-card border-border hover:border-teal-400",
            )}
            aria-label={`${n}`}
          >
            {emojis[n - 1]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 font-medium transition-all text-center",
        compact ? "px-2 py-1.5 text-xs" : "px-3 py-2.5 text-sm",
        active
          ? "bg-teal-500 border-teal-600 text-white shadow-sm"
          : "bg-card border-border text-foreground hover:border-teal-400",
      )}
    >
      {children}
    </button>
  );
}

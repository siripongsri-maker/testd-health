import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
  channel?: string;
  uicCode?: string | null;
}

type KAns = "yes" | "no" | "unsure";
type BAns = "yes" | "no" | "unsure";

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

export function PreServiceSurveyCard({ bookingId, channel, uicCode }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [knowledge, setKnowledge] = useState<Record<string, KAns>>({});
  const [behavior, setBehavior] = useState<Record<string, BAns>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [safety, setSafety] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<string>("");
  const [mhInterest, setMhInterest] = useState<string>("");
  const [suggestions, setSuggestions] = useState("");

  const canSubmit =
    KNOWLEDGE_KEYS.every((k) => knowledge[k]) &&
    BEHAVIOR_KEYS.every((k) => behavior[k]) &&
    confidence !== null &&
    safety !== null &&
    recommend &&
    mhInterest;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("appointment_pre_service_surveys").insert({
        booking_id: bookingId,
        uic_code: uicCode || null,
        language,
        channel: channel || "clinic",
        knowledge,
        behavior,
        confidence,
        safety,
        recommend,
        mental_health_interest: mhInterest,
        suggestions: suggestions.trim() || null,
      });
      if (error) {
        // Duplicate = already submitted, treat as done
        if (error.code === "23505") {
          setDone(true);
        } else {
          throw error;
        }
      } else {
        setDone(true);
        toast({
          title: tx("ขอบคุณสำหรับคำตอบ 🙏", "Thanks for sharing 🙏", language),
        });
      }
    } catch (err) {
      console.error("pre-service survey error", err);
      toast({
        title: tx("บันทึกไม่สำเร็จ", "Could not save", language),
        description: tx("ลองอีกครั้ง หรือข้ามไปก่อนได้", "Try again, or skip for now", language),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (dismissed) return null;

  if (done) {
    return (
      <Card className="p-5 rounded-3xl border-2 border-teal-200 bg-teal-50 dark:bg-teal-900/20 text-left">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-teal-800 dark:text-teal-200">
              {tx("ได้รับคำตอบของคุณแล้ว", "We got your answers", language)}
            </p>
            <p className="text-xs text-teal-700/80 dark:text-teal-300/80 mt-0.5">
              {tx(
                "ทีมจะใช้ข้อมูลนี้เตรียมบริการให้คุณ โดยไม่ระบุตัวตน",
                "The team will use this to prepare your visit, anonymously.",
                language,
              )}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="p-5 rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-background text-left">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="font-bold text-foreground">
              {tx("ก่อนเข้ารับบริการ — ตอบสั้น ๆ 1 นาที", "Before your visit — 1 quick minute", language)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-teal-600" />
              {tx(
                "ข้อมูลนี้ช่วยให้ทีมเตรียมบริการที่เหมาะกับคุณ โดยไม่เปิดเผยตัวตน",
                "This helps the team prepare the right care — anonymous.",
                language,
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            {tx("เริ่มทำแบบสำรวจ", "Start survey", language)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="rounded-full text-muted-foreground"
          >
            {tx("ข้าม", "Skip", language)}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 rounded-3xl border-2 border-teal-200 bg-white dark:bg-card text-left space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wider font-bold text-teal-600">
          {tx("ก่อนรับบริการ · Baseline", "Before service · Baseline", language)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-teal-600" />
          {tx(
            "ข้อมูลนี้ช่วยให้ทีมเตรียมบริการที่เหมาะกับคุณ โดยไม่เปิดเผยตัวตน",
            "This helps the team prepare the right care — anonymous.",
            language,
          )}
        </p>
      </div>

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
            onChange={(v) => setBehavior((p) => ({ ...p, [k]: v as BAns }))}
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

      {/* Suggestions */}
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

      <div className="flex gap-2 pt-1">
        <Button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white h-12"
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
        <Button
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="rounded-full text-muted-foreground"
          disabled={submitting}
        >
          {tx("ข้าม", "Skip", language)}
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
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

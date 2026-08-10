import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Check, ChevronRight, HeartHandshake, ShieldCheck } from "lucide-react";

/**
 * "เรื่องที่กังวล" selector shown before the raw service list.
 *
 * Rationale (branch counselor feedback, Aug 2026): clients were picking
 * "mental health / chemsex / harm reduction" simply because the buttons
 * existed, not because they had a need. Asking about the concern in plain
 * language — plus an optional PHQ-4 self-check — screens for real need
 * without asking anyone to label themselves.
 */

export interface Concern {
  id: string;
  th: string;
  en: string;
  emoji: string;
  /** booking_services slugs auto-suggested when this concern is picked */
  services: string[];
  /** triggers the optional mental-health self-check */
  mental?: boolean;
  /** flags harm reduction / chemsex support interest */
  harmReduction?: boolean;
}

export const CONCERNS: Concern[] = [
  { id: "hiv_news_worry", th: "กังวลข่าวการระบาด HIV / กลัวว่าตัวเองเสี่ยง", en: "Worried about HIV news / my own risk", emoji: "😟", services: ["hiv-testing"] },
  { id: "recent_risk_72h", th: "เพิ่งมีความเสี่ยงภายใน 72 ชั่วโมง", en: "Had a risk within the last 72 hours", emoji: "🚨", services: ["pep"] },
  { id: "want_prevention", th: "อยากป้องกันล่วงหน้า (PrEP)", en: "Want prevention (PrEP)", emoji: "💊", services: ["prep-consultation"] },
  { id: "symptoms_sti", th: "มีอาการ / สงสัยโรคติดต่อทางเพศสัมพันธ์", en: "Symptoms or possible STI", emoji: "🧪", services: ["syphilis-testing"] },
  { id: "routine_check", th: "อยากตรวจตามปกติ / ตรวจประจำ", en: "Routine check-up", emoji: "🔬", services: ["hiv-testing"] },
  { id: "followup", th: "ติดตามผล / รับยาต่อเนื่อง", en: "Follow-up or continuing medication", emoji: "🔄", services: ["followup-consultation"] },
  { id: "stress_sleep", th: "เครียด นอนไม่หลับ ไม่สบายใจ", en: "Stressed, not sleeping, low mood", emoji: "🌧️", services: [], mental: true },
  { id: "relationship", th: "เรื่องความสัมพันธ์ / เปิดเผยผลกับคู่", en: "Relationship or disclosure to a partner", emoji: "💬", services: [], mental: true },
  { id: "substance_use", th: "ใช้สาร / chemsex อยากคุยให้ปลอดภัยขึ้น", en: "Substance use / chemsex — want to stay safer", emoji: "🧊", services: [], harmReduction: true },
  { id: "not_sure", th: "ยังไม่แน่ใจ ขอคุยกับเจ้าหน้าที่ก่อน", en: "Not sure yet — I'd like to talk first", emoji: "🤔", services: [] },
];

const PHQ4 = [
  { id: "anxious", th: "รู้สึกกังวล กระวนกระวาย หรือไม่สบายใจ", en: "Feeling nervous, anxious or on edge" },
  { id: "worry", th: "หยุดกังวลหรือควบคุมความกังวลไม่ได้", en: "Not being able to stop or control worrying" },
  { id: "interest", th: "ไม่สนใจหรือไม่มีความสุขในการทำสิ่งต่างๆ", en: "Little interest or pleasure in doing things" },
  { id: "hopeless", th: "รู้สึกหดหู่ ซึมเศร้า หรือสิ้นหวัง", en: "Feeling down, depressed or hopeless" },
];

const SCALE = [
  { v: 0, th: "ไม่เลย", en: "Not at all" },
  { v: 1, th: "หลายวัน", en: "Several days" },
  { v: 2, th: "เกินครึ่ง", en: "More than half" },
  { v: 3, th: "เกือบทุกวัน", en: "Nearly every day" },
];

export interface ConcernScreeningResult {
  concernIds: string[];
  suggestedSlugs: string[];
  phq4Score: number | null;
  mentalHealthInterest: boolean;
  harmReductionInterest: boolean;
  /** Thai summary appended to the appointment note for staff */
  summary: string;
}

interface Props {
  language: string;
  onChange: (result: ConcernScreeningResult) => void;
}

export function ConcernSelector({ language, onChange }: Props) {
  const isTh = language === "th";
  const loc = (th: string, en: string) => (isTh ? th : en);

  const [selected, setSelected] = useState<string[]>([]);
  const [showPhq, setShowPhq] = useState(false);
  const [phq, setPhq] = useState<Record<string, number>>({});
  const [wantsMh, setWantsMh] = useState<boolean | null>(null);

  const picked = useMemo(() => CONCERNS.filter((c) => selected.includes(c.id)), [selected]);
  const mentalPicked = picked.some((c) => c.mental);
  const hrPicked = picked.some((c) => c.harmReduction);

  const phqComplete = PHQ4.every((q) => phq[q.id] !== undefined);
  const phqScore = phqComplete ? PHQ4.reduce((s, q) => s + (phq[q.id] ?? 0), 0) : null;
  const phqFlagged = phqScore !== null && phqScore >= 3;

  const result = useMemo<ConcernScreeningResult>(() => {
    const slugs = Array.from(new Set(picked.flatMap((c) => c.services)));
    const lines: string[] = [];
    if (picked.length) {
      lines.push(`เรื่องที่กังวล: ${picked.map((c) => c.th).join(", ")}`);
    }
    if (phqScore !== null) {
      lines.push(`PHQ-4 (สมัครใจ): ${phqScore}/12 — ${phqScore >= 6 ? "ควรประเมินเพิ่ม" : phqScore >= 3 ? "มีสัญญาณเบื้องต้น" : "ไม่พบสัญญาณชัดเจน"}`);
    }
    const mhInterest = wantsMh === true || (wantsMh === null && mentalPicked);
    if (mhInterest) lines.push("สนใจคุยเรื่องสุขภาพจิต: ใช่");
    if (hrPicked) lines.push("สนใจคุยเรื่องลดอันตรายจากการใช้สาร/chemsex: ใช่");
    return {
      concernIds: selected,
      suggestedSlugs: slugs,
      phq4Score: phqScore,
      mentalHealthInterest: mhInterest,
      harmReductionInterest: hrPicked,
      summary: lines.join("\n"),
    };
  }, [picked, selected, phqScore, wantsMh, mentalPicked, hrPicked]);

  useEffect(() => {
    onChange(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (mentalPicked) setShowPhq(true);
  }, [mentalPicked]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-3">
      <Card className="p-4 rounded-3xl border-2 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-2 mb-3">
          <HeartHandshake className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-foreground text-sm">
              {loc("วันนี้อยากคุยเรื่องอะไร?", "What would you like to talk about today?")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loc(
                "เลือกได้มากกว่า 1 ข้อ หรือข้ามไปเลือกบริการด้านล่างได้เลย — ไม่มีคำตอบผิด",
                "Pick more than one, or skip and choose a service below — there is no wrong answer.",
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CONCERNS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`text-left text-xs rounded-2xl border-2 px-3 py-2 transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40 text-foreground"
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {loc(c.th, c.en)}
                {on && <Check className="inline h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Optional PHQ-4 self-check */}
      {!showPhq && (
        <Button variant="outline" size="sm" className="w-full gap-2 rounded-full text-muted-foreground" onClick={() => setShowPhq(true)}>
          <Brain className="h-4 w-4" />
          {loc("ลองประเมินใจตัวเอง 4 ข้อ (~30 วินาที, ข้ามได้)", "Quick 4-question mood self-check (~30s, optional)")}
        </Button>
      )}

      {showPhq && (
        <Card className="p-4 rounded-3xl space-y-3">
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-foreground">
                {loc("ประเมินใจเบื้องต้น (สมัครใจ)", "Quick mood self-check (optional)")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {loc(
                  "ใน 2 สัปดาห์ที่ผ่านมา คุณมีอาการเหล่านี้บ่อยแค่ไหน? ไม่ใช่การวินิจฉัย และไม่จำเป็นต้องตอบ",
                  "Over the past 2 weeks, how often have you felt this? Not a diagnosis, and answering is optional.",
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setShowPhq(false); setPhq({}); }}>
              {loc("ข้าม", "Skip")}
            </Button>
          </div>

          {PHQ4.map((q, i) => (
            <div key={q.id} className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">{i + 1}. {loc(q.th, q.en)}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE.map((s) => (
                  <Button
                    key={s.v}
                    variant={phq[q.id] === s.v ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-[11px] h-8 px-1"
                    onClick={() => setPhq((p) => ({ ...p, [q.id]: s.v }))}
                  >
                    {loc(s.th, s.en)}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {phqScore !== null && (
            <div className="rounded-2xl bg-muted/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{loc("คะแนน", "Score")} {phqScore}/12</Badge>
                <span className="text-xs text-muted-foreground">
                  {phqScore >= 6
                    ? loc("มีสัญญาณความเครียดค่อนข้างสูง", "Signs of higher distress")
                    : phqScore >= 3
                    ? loc("มีสัญญาณเบื้องต้น", "Some early signs")
                    : loc("ยังไม่พบสัญญาณชัดเจน", "No clear signs")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {loc(
                  "ผลนี้ไม่ใช่การวินิจฉัย เป็นเพียงข้อมูลช่วยให้เจ้าหน้าที่เตรียมการดูแลที่ตรงกับคุณ",
                  "This is not a diagnosis — it just helps the team prepare the right support.",
                )}
              </p>
              {phqFlagged && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">
                    {loc("อยากคุยกับผู้ให้คำปรึกษาด้านสุขภาพจิตในวันนัดไหม?", "Would you like to talk with a mental health counselor at your visit?")}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant={wantsMh === true ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setWantsMh(true)}>
                      {loc("อยากคุย", "Yes please")}
                    </Button>
                    <Button size="sm" variant={wantsMh === false ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setWantsMh(false)}>
                      {loc("ยังไม่ใช่ตอนนี้", "Not right now")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {(picked.length > 0 || phqScore !== null) && (
        <Card className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {loc(
                "เราจะส่งข้อมูลนี้ให้เจ้าหน้าที่สาขาเตรียมการดูแล คุณเลือกบริการด้านล่างเพิ่มหรือแก้ได้เสมอ",
                "We'll share this with the branch team so they can prepare. You can still add or change services below.",
              )}
            </p>
            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 opacity-50" />
          </div>
        </Card>
      )}
    </div>
  );
}

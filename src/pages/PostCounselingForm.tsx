import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, ShieldCheck, HeartHandshake, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Ctx {
  note_id: string;
  branch_id: string | null;
  branch_name_th: string | null;
  branch_name_en: string | null;
  counseling_completed_at: string | null;
  already_submitted: boolean;
}

const SUPPORT_OPTIONS = [
  { v: "info", th: "ข้อมูลเพิ่มเติมเรื่อง HIV / PrEP / PEP", en: "More info on HIV / PrEP / PEP" },
  { v: "mental", th: "การดูแลสุขภาพจิต", en: "Mental health support" },
  { v: "harm_reduction", th: "การลดอันตรายจากการใช้สาร", en: "Harm reduction guidance" },
  { v: "peer", th: "การพูดคุยกับเพื่อน / ชุมชน", en: "Peer / community support" },
  { v: "safe_sex", th: "อุปกรณ์ป้องกัน / ถุงยาง", en: "Safer-sex supplies" },
  { v: "none", th: "ไม่ต้องการเพิ่มเติม", en: "No additional support" },
];

const SERVICE_OPTIONS = [
  { v: "hiv_test", th: "ตรวจ HIV", en: "HIV testing" },
  { v: "sti_test", th: "ตรวจโรคติดต่อทางเพศ", en: "STI testing" },
  { v: "prep", th: "PrEP", en: "PrEP" },
  { v: "pep", th: "PEP", en: "PEP" },
  { v: "counseling_followup", th: "นัดพูดคุยครั้งถัดไป", en: "Follow-up counseling" },
  { v: "clinic_referral", th: "ส่งต่อคลินิก", en: "Clinic referral" },
  { v: "no_service", th: "ยังไม่ต้องการบริการเพิ่ม", en: "No further service now" },
];

export default function PostCounselingForm() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Scores
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<number | null>(null);
  const [safety, setSafety] = useState<number | null>(null);
  const [respect, setRespect] = useState<number | null>(null);
  const [clarity, setClarity] = useState<number | null>(null);
  const [nextStepConfidence, setNextStepConfidence] = useState<number | null>(null);
  const [stillNeed, setStillNeed] = useState<string[]>([]);
  const [requestedService, setRequestedService] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState<string>("");
  const [openFeedback, setOpenFeedback] = useState("");
  const [anonFeedback, setAnonFeedback] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) { setError("missing"); setLoading(false); return; }
      const { data, error: err } = await supabase.rpc("get_post_eval_context", { _token: token });
      if (err) { console.error(err); setError("invalid"); setLoading(false); return; }
      const row = (data as any[])?.[0];
      if (!row) { setError("invalid"); setLoading(false); return; }
      setCtx(row as Ctx);
      if (row.already_submitted) setDone(true);
      setLoading(false);
    })();
  }, [token]);

  const toggleMulti = (arr: string[], set: (v: string[]) => void, val: string) => {
    if (arr.includes(val)) set(arr.filter((x) => x !== val));
    else set([...arr, val]);
  };

  const canSubmit =
    satisfaction !== null && understanding !== null && safety !== null &&
    respect !== null && clarity !== null && nextStepConfidence !== null &&
    followUp !== "";

  const submit = async () => {
    if (!token || !canSubmit) return;
    setSubmitting(true);
    try {
      const { error: err } = await supabase.rpc("submit_post_counseling_evaluation", {
        _token: token,
        _payload: {
          satisfaction_score: satisfaction,
          understanding_score: understanding,
          safety_score: safety,
          respect_score: respect,
          clarity_score: clarity,
          next_step_confidence_score: nextStepConfidence,
          still_needs_support: stillNeed,
          requested_service_after_counseling: requestedService,
          follow_up_interest: followUp,
          open_feedback: openFeedback.trim(),
          anonymous_feedback: anonFeedback.trim(),
          language,
        },
      });
      if (err) throw err;
      setDone(true);
      toast({ title: tx("ขอบคุณสำหรับคำตอบ 🙏", "Thanks for sharing 🙏") });
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message || "");
      if (msg.includes("Already submitted")) { setDone(true); return; }
      toast({
        title: tx("บันทึกไม่สำเร็จ", "Could not save"),
        description: e?.message || "",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-3">
          <p className="text-lg font-bold">{tx("ลิงก์ไม่ถูกต้อง", "Invalid link")}</p>
          <p className="text-sm text-muted-foreground">
            {tx("QR / ลิงก์นี้อาจหมดอายุ กรุณาขอลิงก์ใหม่จากผู้ให้คำปรึกษา",
                "This QR / link is invalid or expired. Please ask your counselor for a new one.")}
          </p>
          <Button asChild variant="outline"><Link to="/">{tx("กลับหน้าหลัก", "Back to home")}</Link></Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-teal-200">
          <div className="mx-auto h-16 w-16 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{tx("ขอบคุณสำหรับคำตอบ 🙏", "Thanks for sharing 🙏")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tx("ความคิดเห็นของคุณจะช่วยพัฒนาบริการให้ดีขึ้น โดยไม่เปิดเผยตัวตน",
                  "Your feedback helps improve the service — anonymously.")}
            </p>
          </div>
          <Button asChild variant="outline"><Link to="/">{tx("กลับหน้าหลัก", "Back to home")}</Link></Button>
        </Card>
      </div>
    );
  }

  const branchName = language === "th" ? ctx.branch_name_th : ctx.branch_name_en;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <Card className="p-5 rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-background">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0">
              <HeartHandshake className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-teal-600">
                {tx("หลังรับคำปรึกษา · Post-counseling", "After counseling · Post-counseling")}
              </p>
              <h1 className="text-lg font-bold mt-0.5">
                {tx("แบบประเมินหลังรับคำปรึกษา", "Post-Counseling Evaluation")}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-teal-600" />
                {tx("ตอบสั้น ๆ 1 นาที · ไม่ระบุตัวตน",
                    "1 quick minute · anonymous")}
              </p>
              {branchName && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {tx("สาขา", "Branch")}: {branchName}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl space-y-5 border-2 border-teal-200">
          <Rating
            label={tx("หลังรับคำปรึกษา คุณพึงพอใจกับบริการนี้แค่ไหน", "How satisfied are you with this counseling session?")}
            value={satisfaction} onChange={setSatisfaction}
          />
          <Rating
            label={tx("หลังรับคำปรึกษา คุณเข้าใจทางเลือกดูแลสุขภาพของตัวเองมากขึ้นแค่ไหน", "After counseling, do you understand your health options better?")}
            value={understanding} onChange={setUnderstanding}
          />
          <Rating
            label={tx("คุณรู้สึกปลอดภัยและได้รับความเชื่อใจระหว่างการรับคำปรึกษาแค่ไหน", "Did you feel safe and trusted during the counseling?")}
            value={safety} onChange={setSafety}
          />
          <Rating
            label={tx("คุณรู้สึกได้รับความเคารพ ไม่ถูกตัดสิน แค่ไหน", "Did you feel respected and not judged?")}
            value={respect} onChange={setRespect}
          />
          <Rating
            label={tx("ผู้ให้คำปรึกษาอธิบายชัดเจนแค่ไหน", "Was the counselor's explanation clear?")}
            value={clarity} onChange={setClarity}
          />
          <Rating
            label={tx("คุณมั่นใจว่ารู้ขั้นตอนถัดไปที่ต้องทำแค่ไหน", "Do you feel confident you know what to do next?")}
            value={nextStepConfidence} onChange={setNextStepConfidence}
          />
        </Card>

        <Card className="p-5 rounded-3xl space-y-4 border">
          <div>
            <p className="text-sm font-bold mb-2">
              {tx("การสนับสนุนที่ยังต้องการ (เลือกได้หลายข้อ)", "Support you still need (choose any)")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUPPORT_OPTIONS.map((o) => (
                <PillButton key={o.v} active={stillNeed.includes(o.v)}
                  onClick={() => toggleMulti(stillNeed, setStillNeed, o.v)}>
                  {tx(o.th, o.en)}
                </PillButton>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold mb-2">
              {tx("บริการที่อยากได้ต่อจากนี้ (เลือกได้หลายข้อ)", "Services you'd like next (choose any)")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SERVICE_OPTIONS.map((o) => (
                <PillButton key={o.v} active={requestedService.includes(o.v)}
                  onClick={() => toggleMulti(requestedService, setRequestedService, o.v)}>
                  {tx(o.th, o.en)}
                </PillButton>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold mb-2">
              {tx("คุณตั้งใจจะทำตามคำแนะนำหรือไม่", "Do you intend to follow the recommendations?")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "definitely", th: "แน่นอน", en: "Definitely" },
                { v: "probably", th: "น่าจะใช่", en: "Probably" },
                { v: "unsure", th: "ไม่แน่ใจ", en: "Not sure" },
                { v: "no", th: "ไม่", en: "No" },
              ].map((o) => (
                <PillButton key={o.v} active={followUp === o.v} onClick={() => setFollowUp(o.v)}>
                  {tx(o.th, o.en)}
                </PillButton>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl space-y-4 border">
          <div>
            <p className="text-sm font-bold mb-1 flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-teal-600" />
              {tx("ข้อเสนอแนะเพื่อพัฒนาบริการ (ไม่บังคับ)", "Feedback to improve the service (optional)")}
            </p>
            <Textarea value={openFeedback} onChange={(e) => setOpenFeedback(e.target.value)}
              rows={3} className="rounded-2xl"
              placeholder={tx("สิ่งที่ประทับใจ หรืออยากให้ปรับปรุง", "What went well? What could be better?")}
            />
          </div>
          <div>
            <p className="text-sm font-bold mb-1">
              {tx("ความคิดเห็นแบบไม่ระบุตัวตน (ไม่บังคับ)", "Anonymous feedback (optional)")}
            </p>
            <Textarea value={anonFeedback} onChange={(e) => setAnonFeedback(e.target.value)}
              rows={2} className="rounded-2xl"
              placeholder={tx("บอกเราได้ตรง ๆ — จะไม่มีการเชื่อมโยงกับตัวตน",
                "Speak freely — this cannot be traced to you.")}
            />
          </div>
        </Card>

        <Button onClick={submit} disabled={!canSubmit || submitting}
          className="w-full h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white">
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("กำลังบันทึก...", "Saving...")}</>
          ) : tx("ส่งแบบประเมิน", "Submit evaluation")}
        </Button>
      </div>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  const emojis = ["😞", "🙁", "😐", "🙂", "😊"];
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex justify-between gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              "flex-1 aspect-square rounded-2xl border-2 text-xl flex items-center justify-center transition-all",
              value === n
                ? "bg-teal-500 border-teal-600 text-white scale-105 shadow-md"
                : "bg-card border-border hover:border-teal-400",
            )}>
            {emojis[n - 1]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "rounded-full border-2 font-medium transition-all text-center px-3 py-2.5 text-sm",
        active ? "bg-teal-500 border-teal-600 text-white shadow-sm"
               : "bg-card border-border text-foreground hover:border-teal-400",
      )}>
      {children}
    </button>
  );
}

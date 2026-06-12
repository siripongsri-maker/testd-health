import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { ArrowRight, Loader2, Camera } from "lucide-react";

type ResultType = "negative" | "reactive" | "invalid";

export interface LeanActiveRequest {
  id: string;
  user_id: string | null;
  delivery_mode?: string | null;
  status: string;
}

interface Props {
  request: LeanActiveRequest;
  cameFromMagicLink?: boolean;
  /** When true, the visitor is anonymous: collect name/phone and call the guest RPC instead of UPDATE. */
  guestMode?: boolean;
  onDone: () => void;
  trackEvent: (name: string, props?: Record<string, unknown>) => void;
}

const VIDEO_URL = "https://testd.website/learn/selftest-video";

const T = {
  th: {
    badge: "ส่งผลตรวจ",
    readyTitle: "พร้อมส่งผลแล้วใช่ไหม?",
    readyIntro: "ก่อนส่งผล ขอให้:",
    li1: "ทำตามคู่มือในกล่อง",
    li2: "รอ 15 นาทีก่อนอ่านผล",
    li3: "อ่านในที่แสงสว่างเพียงพอ",
    videoLabel: "ยังไม่แน่ใจวิธีใช้?",
    videoOpen: "ดูวิดีโอ 1:30 นาที",
    readyCta: "พร้อมแล้ว ส่งผลตอนนี้",
    needHelp: "ขอความช่วยเหลือ",
    step2Badge: "ขั้นตอน 2/2",
    pickTitle: "ผลขึ้นกี่ขีด?",
    pickSub: "เลือกตามที่เห็นในแถบทดสอบ",
    optNeg: { title: "1 ขีด", sub: "น่าจะปลอดเชื้อ" },
    optReact: { title: "2 ขีด", sub: "ต้องตรวจซ้ำที่คลินิก" },
    optInvalid: { title: "ไม่มีขีด หรืออ่านไม่ออก", sub: "บางครั้งเกิดขึ้นได้" },
    photoTitle: "แนบรูปประกอบ (เลือกได้)",
    photoHint: "ช่วยให้ทีมช่วยตรวจสอบได้แม่นขึ้น",
    photoAdded: "เพิ่มแล้ว:",
    photoAdd: "เพิ่ม",
    photoChange: "เปลี่ยน",
    submit: "ยืนยันส่งผล",
    submitting: "กำลังส่ง...",
    submitErr: "ส่งผลไม่สำเร็จ ลองใหม่อีกครั้ง",
    postpone: "ยังไม่ได้ตรวจ เลื่อนทีหลัง",
    postponeToast: "ไม่เป็นไรเลย เราจะแวะมาทักหลัง 2-3 วัน",
    negTitle: "ขอบคุณที่ดูแลตัวเอง",
    negBody:
      "ผล 1 ขีด หมายถึงน่าจะปลอดเชื้อ หากมีโอกาสเสี่ยงในช่วง 1–3 เดือนที่ผ่านมา แนะนำให้ตรวจซ้ำในอีก 3 เดือนข้างหน้า",
    earned: "ได้รับ",
    setReminder: "ตั้งเตือนตรวจครั้งหน้า (3 เดือน)",
    setReminderToast: "เราจะแวะมาเตือนใน 3 เดือน",
    done: "เสร็จแล้ว",
    reactTitle: "เราอยู่ตรงนี้กับคุณ",
    reactBody1: "ผล 2 ขีดจากชุดตรวจเบื้องต้น ไม่ได้แปลว่าติดเชื้อ HIV",
    reactBody2: "ต้องยืนยันด้วยการตรวจที่คลินิกอีกครั้ง ซึ่งฟรีและเป็นความลับ",
    reactPick: "เลือกวิธีที่สบายใจที่สุดเพื่อก้าวต่อไป:",
    connCallback: { title: "ขอให้ทีมโทรกลับ", sub: "ภายใน 24 ชั่วโมง" },
    connBook: { title: "จองตรวจที่คลินิก", sub: "SWING Silom / Pattaya" },
    connLine: { title: "แชทผ่าน LINE", sub: "คุยแบบเป็นความลับ" },
    reactConfirm: "ยืนยันและเชื่อมต่อทีม",
    reactConnecting: "กำลังเชื่อมต่อ...",
    reactSavedToast: "ทีมจะติดต่อกลับเร็วๆ นี้",
    reactFooter: "ทุกบริการฟรี เป็นความลับ ไม่ตัดสิน",
    invalidTitle: "ลองอีกครั้งได้",
    invalidBody: "บางครั้งชุดตรวจอ่านไม่ออก ไม่ใช่ความผิดของใคร เราขอชุดใหม่ให้ได้",
    requestNewKit: "ขอชุดตรวจใหม่ฟรี",
    talkTeam: "คุยกับทีม",
    saveLater: "เก็บไว้ทำทีหลัง",
    careSaved: "บันทึกแล้ว ทีมเราจะติดต่อกลับ",
    linkedNote: "ระบบจะเชื่อมผลตรวจนี้กับคำขอรับชุดตรวจของคุณอย่างปลอดภัย",
  },
  en: {
    badge: "Submit Result",
    readyTitle: "Ready to submit your result?",
    readyIntro: "Before submitting:",
    li1: "Follow the instructions inside the box",
    li2: "Wait 15 minutes before reading",
    li3: "Read in good lighting",
    videoLabel: "Not sure how?",
    videoOpen: "Watch the 1:30 video",
    readyCta: "I'm ready, submit now",
    needHelp: "Need help",
    step2Badge: "Step 2 of 2",
    pickTitle: "How many lines do you see?",
    pickSub: "Pick what matches the test strip",
    optNeg: { title: "1 line", sub: "Likely negative" },
    optReact: { title: "2 lines", sub: "Re-test at clinic" },
    optInvalid: { title: "No line / unclear", sub: "It happens" },
    photoTitle: "Attach a photo (optional)",
    photoHint: "Helps the team double-check",
    photoAdded: "Added:",
    photoAdd: "Add",
    photoChange: "Change",
    submit: "Submit result",
    submitting: "Submitting...",
    submitErr: "Couldn't submit, please try again",
    postpone: "Haven't tested yet — remind me later",
    postponeToast: "No worries, we'll check in again in 2-3 days",
    negTitle: "Thanks for taking care of yourself",
    negBody:
      "1 line means likely negative. If you had risk exposure in the past 1–3 months, consider re-testing in 3 months.",
    earned: "You earned",
    setReminder: "Remind me in 3 months",
    setReminderToast: "We'll remind you in 3 months",
    done: "Done",
    reactTitle: "We're here with you",
    reactBody1: "2 lines on a self-test does NOT mean you have HIV.",
    reactBody2: "It must be confirmed at a clinic — free and confidential.",
    reactPick: "Pick what feels easiest to take the next step:",
    connCallback: { title: "Ask the team to call me", sub: "Within 24 hours" },
    connBook: { title: "Book a clinic visit", sub: "SWING Silom / Pattaya" },
    connLine: { title: "Chat on LINE", sub: "Confidential" },
    reactConfirm: "Confirm and connect to the team",
    reactConnecting: "Connecting...",
    reactSavedToast: "The team will reach out soon",
    reactFooter: "All services free, confidential, non-judgmental",
    invalidTitle: "Let's try again",
    invalidBody: "Sometimes test strips don't read clearly — not your fault. We'll send a new kit.",
    requestNewKit: "Request new free kit",
    talkTeam: "Talk to the team",
    saveLater: "Save for later",
    careSaved: "Saved. Our team will reach out.",
    linkedNote: "Your result will be securely linked to your self-test kit request.",
  },
};

export function LeanResultSubmissionFlow({ request, cameFromMagicLink, guestMode, onDone, trackEvent }: Props) {
  const { language } = useLanguage();
  const t = T[language === "en" ? "en" : "th"];
  const [step, setStep] = useState<"ready" | "result" | "outcome">("ready");
  const [result, setResult] = useState<ResultType | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Guest-only contact fields (required by the submit_guest_selftest_result RPC)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestLineId, setGuestLineId] = useState("");
  const [guestRequestId, setGuestRequestId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("lean_flow_entered", {
      request_id: request.id,
      via_magic_link: !!cameFromMagicLink,
      delivery_mode: request.delivery_mode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Step A: Ready ----------
  if (step === "ready") {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
        <Badge variant="secondary" className="w-fit">{t.badge}</Badge>
        <h2 className="text-xl font-semibold">{t.readyTitle}</h2>
        {cameFromMagicLink && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
            <span aria-hidden>🔒</span>
            <span>{t.linkedNote}</span>
          </p>
        )}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t.readyIntro}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t.li1}</li>
            <li>{t.li2}</li>
            <li>{t.li3}</li>
          </ul>
          <p className="pt-2">
            {t.videoLabel}{" "}
            <a
              href={VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
              onClick={() => trackEvent("lean_video_opened", { request_id: request.id })}
            >
              {t.videoOpen}
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => {
              trackEvent("lean_step_ready_completed", { request_id: request.id });
              setStep("result");
            }}
          >
            {t.readyCta}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              trackEvent("lean_help_requested", { request_id: request.id, from_step: "ready" });
              window.location.href = "/support-chat";
            }}
          >
            {t.needHelp}
          </Button>
        </div>
      </Card>
    );
  }

  // ---------- Step B: Result + inline photo + postpone ----------
  if (step === "result") {
    const options: Array<{
      value: ResultType;
      emoji: string;
      title: string;
      sub: string;
      color: string;
    }> = [
      {
        value: "negative",
        emoji: "✅",
        title: t.optNeg.title,
        sub: t.optNeg.sub,
        color: "border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
      },
      {
        value: "reactive",
        emoji: "⚠️",
        title: t.optReact.title,
        sub: t.optReact.sub,
        color: "border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30",
      },
      {
        value: "invalid",
        emoji: "❔",
        title: t.optInvalid.title,
        sub: t.optInvalid.sub,
        color: "border-border hover:bg-muted/50",
      },
    ];

    const handlePostpone = async () => {
      trackEvent("lean_postponed", { request_id: request.id });
      try {
        const { error } = await supabase.rpc("increment_postpone", { req_id: request.id });
        if (error) throw error;
      } catch (e) {
        console.warn("[lean postpone rpc]", e);
        await supabase
          .from("hiv_selftest_requests")
          .update({ last_postponed_at: new Date().toISOString() })
          .eq("id", request.id);
      }
      toast({ title: t.postponeToast });
      onDone();
    };

    const handlePick = (r: ResultType) => {
      setResult(r);
      trackEvent("lean_result_picked", { request_id: request.id, result: r });
    };

    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
        <Badge variant="secondary" className="w-fit">{t.step2Badge}</Badge>
        <h2 className="text-xl font-semibold">{t.pickTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.pickSub}</p>

        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handlePick(o.value)}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${o.color} ${
                result === o.value ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{o.emoji}</div>
                <div>
                  <div className="font-semibold">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.sub}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Inline visible photo upload */}
        <label className="flex items-center gap-3 cursor-pointer border border-dashed rounded-lg p-3 bg-muted/40">
          <Camera className="h-6 w-6 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{t.photoTitle}</div>
            <div className="text-xs text-muted-foreground truncate">
              {photo ? `${t.photoAdded} ${photo.name}` : t.photoHint}
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPhoto(f);
                trackEvent("lean_photo_attached", { request_id: request.id, size: f.size });
              }
            }}
          />
          <span className="text-xs text-primary font-medium">
            {photo ? t.photoChange : t.photoAdd}
          </span>
        </label>

        <Button
          size="lg"
          className="w-full"
          disabled={!result || submitting}
          onClick={async () => {
            if (!result) return;
            setSubmitting(true);
            try {
              await submitResult(request, result, photo);
              trackEvent("lean_result_submitted", {
                request_id: request.id,
                result,
                has_photo: !!photo,
                via_magic_link: !!cameFromMagicLink,
              });

              // Fire-and-forget reactive notification
              if (result === "reactive") {
                supabase.functions
                  .invoke("notify-reactive-case", {
                    body: { request_id: request.id, has_photo: !!photo },
                  })
                  .catch((err) => console.warn("[notify-reactive-case]", err));
              }

              setStep("outcome");
            } catch (e) {
              console.error("[lean submit]", e);
              toast({ title: t.submitErr, variant: "destructive" });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitting ? t.submitting : t.submit}
        </Button>

        <button
          type="button"
          onClick={handlePostpone}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition"
        >
          {t.postpone}
        </button>
      </Card>
    );
  }

  // ---------- Step C: Outcome ----------
  if (step === "outcome" && result) {
    return (
      <OutcomeScreen
        result={result}
        request={request}
        t={t}
        onDone={onDone}
        onCareAction={async (action) => {
          trackEvent("lean_care_action", { request_id: request.id, action, result });
          try {
            await supabase
              .from("hiv_selftest_requests")
              .update({ care_action: action })
              .eq("id", request.id);
          } catch (e) {
            console.error("[care_action]", e);
          }
        }}
      />
    );
  }

  return null;
}

// ---------- Outcome screen ----------
function OutcomeScreen({
  result,
  request: _request,
  t,
  onDone,
  onCareAction,
}: {
  result: ResultType;
  request: LeanActiveRequest;
  t: typeof T.th;
  onDone: () => void;
  onCareAction: (action: string) => Promise<void>;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (result === "negative") {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
        <div className="text-5xl text-center">🤍</div>
        <h2 className="text-xl font-semibold text-center">{t.negTitle}</h2>
        <p className="text-sm text-center">{t.negBody}</p>
        <div className="bg-background/60 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground">{t.earned}</div>
          <div className="text-2xl font-bold text-primary">+1,000 XP</div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={async () => {
              await onCareAction("subscribe_reminder");
              toast({ title: t.setReminderToast });
              onDone();
            }}
          >
            {t.setReminder}
          </Button>
          <Button variant="ghost" onClick={onDone}>{t.done}</Button>
        </div>
      </Card>
    );
  }

  if (result === "invalid") {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
        <div className="text-5xl text-center">🌱</div>
        <h2 className="text-xl font-semibold text-center">{t.invalidTitle}</h2>
        <p className="text-sm text-center">{t.invalidBody}</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              await onCareAction("requested_new_kit");
              toast({ title: t.careSaved });
              onDone();
            }}
          >
            {t.requestNewKit}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await onCareAction("chose_line_chat");
              window.open("https://line.me/R/ti/p/@swingthailand", "_blank");
              onDone();
            }}
          >
            {t.talkTeam}
          </Button>
          <Button variant="ghost" onClick={onDone}>{t.saveLater}</Button>
        </div>
      </Card>
    );
  }

  // Reactive — forced connection (no soft exit)
  const connections = [
    { key: "requested_callback", title: t.connCallback.title, sub: t.connCallback.sub },
    { key: "booked_clinic", title: t.connBook.title, sub: t.connBook.sub },
    { key: "chose_line_chat", title: t.connLine.title, sub: t.connLine.sub },
  ];

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
      <div className="text-5xl text-center">🤝</div>
      <h2 className="text-xl font-semibold text-center">{t.reactTitle}</h2>
      <div className="bg-background/70 rounded-lg p-3 text-sm space-y-2">
        <p><strong>{t.reactBody1}</strong></p>
        <p>{t.reactBody2}</p>
      </div>
      <p className="text-sm font-medium">{t.reactPick}</p>
      <div className="space-y-2">
        {connections.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChosen(c.key)}
            className={`w-full text-left p-3 rounded-lg border-2 transition ${
              chosen === c.key
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border hover:bg-background"
            }`}
          >
            <div className="font-semibold text-sm">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.sub}</div>
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="w-full"
        disabled={!chosen || saving}
        onClick={async () => {
          if (!chosen) return;
          setSaving(true);
          await onCareAction(chosen);
          if (chosen === "chose_line_chat") {
            window.open("https://line.me/R/ti/p/@swingthailand", "_blank");
          } else if (chosen === "booked_clinic") {
            window.location.href = "/clinic/book?service=followup-consultation";
            return;
          }
          toast({ title: t.reactSavedToast });
          setTimeout(onDone, 1200);
        }}
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {saving ? t.reactConnecting : t.reactConfirm}
      </Button>
      <p className="text-xs text-muted-foreground text-center">{t.reactFooter}</p>
    </Card>
  );
}

// ---------- Submit ----------
async function submitResult(request: LeanActiveRequest, result: ResultType, photo: File | null) {
  let photoPath: string | null = null;

  if (photo) {
    const folder = request.user_id || "anon";
    const path = `${folder}/${request.id}/${Date.now()}-${photo.name}`;
    const { error: upErr } = await supabase.storage
      .from("selftest-results")
      .upload(path, photo, { upsert: false, contentType: photo.type });
    if (!upErr) photoPath = path;
    else console.warn("[lean upload]", upErr);
  }

  const update: Record<string, unknown> = {
    status: "result_submitted",
    self_reported_result: result,
    photo_provided: !!photo,
    submission_path: photo ? "lean_with_photo" : "lean_no_photo",
    result_submitted_at: new Date().toISOString(),
    test_result:
      result === "negative" ? "negative" : result === "reactive" ? "reactive" : "invalid",
  };
  if (photoPath) update.result_photo_url = photoPath;

  const { error } = await supabase
    .from("hiv_selftest_requests")
    .update(update)
    .eq("id", request.id);
  if (error) throw error;

  // Award XP for submission (best-effort)
  if (request.user_id) {
    try {
      await supabase.rpc("award_xp_to_user", {
        target_user_id: request.user_id,
        xp_amount: 1000,
      });
    } catch (e) {
      console.warn("[lean xp]", e);
    }
  }
}

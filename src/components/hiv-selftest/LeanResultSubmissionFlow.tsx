import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { ArrowRight, Loader2, Phone, MessageCircle, CalendarPlus, Bell } from "lucide-react";

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
  onDone: () => void;
  trackEvent: (name: string, props?: Record<string, unknown>) => void;
}

const T = {
  th: {
    badge: "ส่งผลตรวจ",
    readyTitle: "พร้อมส่งผลแล้วใช่ไหม?",
    readyIntro: "ก่อนส่งผล ขอให้:",
    li1: "ทำตามคู่มือในกล่อง",
    li2: "รอ 15 นาทีก่อนอ่านผล",
    li3: "อ่านในที่แสงสว่างเพียงพอ",
    videoLabel: "ดูวิดีโอวิธีใช้ (1:30 นาที):",
    videoOpen: "เปิดดู",
    readyCta: "พร้อมแล้ว ส่งผลตอนนี้",
    needHelp: "ขอความช่วยเหลือ",
    step2Badge: "ขั้นตอน 2/2",
    pickTitle: "ผลขึ้นกี่ขีด?",
    pickSub: "เลือกตามที่เห็นในแถบทดสอบ",
    optNeg: { title: "1 ขีด", sub: "น่าจะปลอดเชื้อ" },
    optReact: { title: "2 ขีด", sub: "ต้องตรวจซ้ำที่คลินิก" },
    optInvalid: { title: "ไม่มีขีด หรืออ่านไม่ออก", sub: "บางครั้งเกิดขึ้นได้" },
    photoToggle: "ส่งรูปผลตรวจด้วยก็ได้ (เลือกได้)",
    photoAdded: "เพิ่มรูปแล้ว:",
    submit: "ยืนยันส่งผล",
    submitting: "กำลังส่ง...",
    submitErr: "ส่งผลไม่สำเร็จ ลองใหม่อีกครั้ง",
    negTitle: "ขอบคุณที่ดูแลตัวเอง",
    negBody:
      "ผล 1 ขีด หมายถึงน่าจะปลอดเชื้อ หากมีโอกาสเสี่ยงในช่วง 1–3 เดือนที่ผ่านมา แนะนำให้ตรวจซ้ำในอีก 3 เดือนข้างหน้า",
    earned: "ได้รับ",
    setReminder: "ตั้งเตือนตรวจครั้งหน้า (3 เดือน)",
    done: "เสร็จแล้ว",
    reactTitle: "เราอยู่ตรงนี้กับคุณ",
    reactBody1:
      "ผล 2 ขีดจากชุดตรวจเบื้องต้น ไม่ได้แปลว่าติดเชื้อ HIV ต้องยืนยันด้วยการตรวจที่คลินิกอีกครั้ง ซึ่งฟรีและเป็นความลับ",
    reactBody2: "ที่ SWING Clinic มีทีมที่พร้อมคุยและช่วยจัดทุกอย่าง เลือกวิธีที่สบายใจที่สุด:",
    callMe: "ขอให้ทีมโทรกลับ",
    bookClinic: "จองตรวจที่คลินิก",
    lineChat: "แชทผ่าน LINE",
    reactFooter: "ทุกบริการฟรี เป็นความลับ ไม่ตัดสิน",
    invalidTitle: "ลองอีกครั้งได้",
    invalidBody: "บางครั้งชุดตรวจอ่านไม่ออก ไม่ใช่ความผิดของใคร เราขอชุดใหม่ให้ได้",
    requestNewKit: "ขอชุดตรวจใหม่ฟรี",
    talkTeam: "คุยกับทีม",
    saveLater: "เก็บไว้ทำทีหลัง",
    careSaved: "บันทึกแล้ว ทีมเราจะติดต่อกลับ",
  },
  en: {
    badge: "Submit Result",
    readyTitle: "Ready to submit your result?",
    readyIntro: "Before submitting:",
    li1: "Follow the instructions inside the box",
    li2: "Wait 15 minutes before reading",
    li3: "Read in good lighting",
    videoLabel: "How-to video (1:30):",
    videoOpen: "Open",
    readyCta: "I'm ready, submit now",
    needHelp: "Need help",
    step2Badge: "Step 2 of 2",
    pickTitle: "How many lines do you see?",
    pickSub: "Pick what matches the test strip",
    optNeg: { title: "1 line", sub: "Likely negative" },
    optReact: { title: "2 lines", sub: "Re-test at clinic" },
    optInvalid: { title: "No line / unclear", sub: "It happens" },
    photoToggle: "Add a photo too (optional)",
    photoAdded: "Photo added:",
    submit: "Submit result",
    submitting: "Submitting...",
    submitErr: "Couldn't submit, please try again",
    negTitle: "Thanks for taking care of yourself",
    negBody:
      "1 line means likely negative. If you had risk exposure in the past 1–3 months, consider re-testing in 3 months.",
    earned: "You earned",
    setReminder: "Remind me in 3 months",
    done: "Done",
    reactTitle: "We're here with you",
    reactBody1:
      "2 lines on a self-test does NOT mean you have HIV. It must be confirmed at a clinic — free and confidential.",
    reactBody2: "SWING Clinic has a team ready to support you. Pick what feels easiest:",
    callMe: "Ask the team to call me",
    bookClinic: "Book a clinic visit",
    lineChat: "Chat on LINE",
    reactFooter: "All services free, confidential, non-judgmental",
    invalidTitle: "Let's try again",
    invalidBody: "Sometimes test strips don't read clearly — not your fault. We'll send a new kit.",
    requestNewKit: "Request new free kit",
    talkTeam: "Talk to the team",
    saveLater: "Save for later",
    careSaved: "Saved. Our team will reach out.",
  },
};

export function LeanResultSubmissionFlow({ request, cameFromMagicLink, onDone, trackEvent }: Props) {
  const { language } = useLanguage();
  const t = T[language === "en" ? "en" : "th"];
  const [step, setStep] = useState<"ready" | "result" | "outcome">("ready");
  const [result, setResult] = useState<ResultType | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent("lean_flow_entered", {
      request_id: request.id,
      via_magic_link: !!cameFromMagicLink,
      delivery_mode: request.delivery_mode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Step A ----------
  if (step === "ready") {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
        <Badge variant="secondary" className="w-fit">{t.badge}</Badge>
        <h2 className="text-xl font-semibold">{t.readyTitle}</h2>
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
              href="https://www.youtube.com/results?search_query=abbott+checknow+hiv+self+test"
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

  // ---------- Step B ----------
  if (step === "result") {
    const options: Array<{ value: ResultType; emoji: string; title: string; sub: string; color: string }> = [
      { value: "negative", emoji: "✅", title: t.optNeg.title, sub: t.optNeg.sub, color: "border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
      { value: "reactive", emoji: "⚠️", title: t.optReact.title, sub: t.optReact.sub, color: "border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" },
      { value: "invalid", emoji: "❔", title: t.optInvalid.title, sub: t.optInvalid.sub, color: "border-border hover:bg-muted/50" },
    ];

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

        <details className="pt-2">
          <summary className="text-sm text-muted-foreground cursor-pointer">{t.photoToggle}</summary>
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhoto(f);
                  trackEvent("lean_photo_attached", { request_id: request.id, size: f.size });
                }
              }}
              className="text-sm"
            />
            {photo && (
              <p className="text-xs text-muted-foreground mt-1">
                {t.photoAdded} {photo.name}
              </p>
            )}
          </div>
        </details>

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
      </Card>
    );
  }

  // ---------- Step C ----------
  if (step === "outcome" && result) {
    const handleCare = async (action: string) => {
      try {
        await supabase
          .from("hiv_selftest_requests")
          .update({ care_action: action })
          .eq("id", request.id);
      } catch (e) {
        console.error("[care_action]", e);
      }
      trackEvent("lean_care_action", { request_id: request.id, action, result });
      toast({ title: t.careSaved });

      if (action === "booked_clinic") {
        window.location.href = "/clinic/book?service=followup-consultation";
        return;
      }
      if (action === "chose_line_chat") {
        window.open("https://line.me/R/ti/p/@swingthailand", "_blank");
      }
    };

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
            <Button variant="outline" className="gap-2" onClick={() => handleCare("subscribe_reminder")}>
              <Bell className="h-4 w-4" />
              {t.setReminder}
            </Button>
            <Button variant="ghost" onClick={onDone}>{t.done}</Button>
          </div>
        </Card>
      );
    }

    if (result === "reactive") {
      return (
        <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
          <div className="text-5xl text-center">🤝</div>
          <h2 className="text-xl font-semibold text-center">{t.reactTitle}</h2>
          <p className="text-sm">{t.reactBody1}</p>
          <p className="text-sm">{t.reactBody2}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button className="gap-2" onClick={() => handleCare("requested_callback")}>
              <Phone className="h-4 w-4" />
              {t.callMe}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleCare("booked_clinic")}>
              <CalendarPlus className="h-4 w-4" />
              {t.bookClinic}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleCare("chose_line_chat")}>
              <MessageCircle className="h-4 w-4" />
              {t.lineChat}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">{t.reactFooter}</p>
        </Card>
      );
    }

    // invalid
    return (
      <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in">
        <div className="text-5xl text-center">🌱</div>
        <h2 className="text-xl font-semibold text-center">{t.invalidTitle}</h2>
        <p className="text-sm text-center">{t.invalidBody}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleCare("requested_new_kit")}>{t.requestNewKit}</Button>
          <Button variant="outline" onClick={() => handleCare("chose_line_chat")}>{t.talkTeam}</Button>
          <Button variant="ghost" onClick={onDone}>{t.saveLater}</Button>
        </div>
      </Card>
    );
  }

  return null;
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

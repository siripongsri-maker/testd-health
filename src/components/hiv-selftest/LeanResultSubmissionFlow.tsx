import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProvinces } from "@/lib/thailand-address";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { openSupportChat } from "@/lib/openSupportChat";
import { isValidThaiId, normalizeThaiId } from "@/lib/thaiId";
import { ArrowRight, Loader2, Camera } from "lucide-react";
import selftestImgNegative from "@/assets/selftest-result-negative.jpg";
import selftestImgReactive from "@/assets/selftest-result-reactive.jpg";
import selftestImgInvalid from "@/assets/selftest-result-invalid.jpg";

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

const VIDEO_URL = "https://www.youtube.com/watch?v=LbvDEQu3kaE";

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
    reactPick: "กรอกเบอร์โทรเพื่อให้ทีมโทรกลับ — เราจะส่ง SMS หาคุณเพื่อนัดเวลาที่สะดวก",
    reactPhoneLabel: "เบอร์โทรสำหรับติดต่อกลับ",
    reactPhonePlaceholder: "0XX-XXX-XXXX",
    reactPhoneInvalid: "กรุณากรอกเบอร์โทรที่ติดต่อได้",
    reactPhoneSavedFor: "ทีมจะติดต่อกลับที่เบอร์",
    reactConfirm: "ยืนยันให้ทีมโทรกลับ",
    reactConnecting: "กำลังบันทึก...",
    reactSavedToast: "บันทึกแล้ว ทีมจะติดต่อกลับเร็วๆ นี้",
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
    reactPick: "Leave a phone number and our team will call you back — we'll text you to confirm a convenient time.",
    reactPhoneLabel: "Callback phone number",
    reactPhonePlaceholder: "0XX-XXX-XXXX",
    reactPhoneInvalid: "Please enter a valid phone number",
    reactPhoneSavedFor: "The team will call you back at",
    reactConfirm: "Confirm callback request",
    reactConnecting: "Saving...",
    reactSavedToast: "Saved. The team will reach out soon.",
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
  // Thai national ID — required for every submit-result flow so the record
  // can be linked back to the same person at the clinic.
  const [thaiId, setThaiId] = useState("");
  // PDPA consent — explicit acknowledgement before submitting Thai national ID.
  const [pdpaConsent, setPdpaConsent] = useState(false);
  // Guest-only contact fields (required by the submit_guest_selftest_result RPC)
  const [guestPhone, setGuestPhone] = useState("");
  const [guestLineId, setGuestLineId] = useState("");
  // Province — required so the result can be aggregated onto the geo dashboard.
  const [province, setProvince] = useState("");
  const [guestRequestId, setGuestRequestId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("lean_flow_entered", {
      request_id: request.id,
      via_magic_link: !!cameFromMagicLink,
      delivery_mode: request.delivery_mode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-prefill Thai national ID + province from the user's saved selftest_pii
  // so result-reporting links back to the same person who ordered the kit.
  useEffect(() => {
    if (guestMode || !request.user_id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("selftest_pii")
        .select("thai_id, province")
        .eq("user_id", request.user_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      if (data.thai_id) {
        setThaiId((prev) => (prev ? prev : normalizeThaiId(data.thai_id).slice(0, 13)));
      }
      if (data.province) {
        setProvince((prev) => (prev ? prev : data.province as string));
      }
    })();
    return () => { cancelled = true; };
  }, [guestMode, request.user_id]);

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
              openSupportChat();
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
      image: string;
      title: string;
      sub: string;
      color: string;
    }> = [
      {
        value: "negative",
        image: selftestImgNegative,
        title: t.optNeg.title,
        sub: t.optNeg.sub,
        color: "border-border hover:bg-muted/50",
      },
      {
        value: "reactive",
        image: selftestImgReactive,
        title: t.optReact.title,
        sub: t.optReact.sub,
        color: "border-border hover:bg-muted/50",
      },
      {
        value: "invalid",
        image: selftestImgInvalid,
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

        <div className="flex flex-col gap-3">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handlePick(o.value)}
              className={`flex items-center gap-4 text-left p-3 rounded-xl border-2 bg-card transition ${o.color} ${
                result === o.value ? "ring-2 ring-primary border-primary" : ""
              }`}
            >
              <div className="w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-white">
                <img
                  src={o.image}
                  alt={o.title}
                  loading="lazy"
                  width={256}
                  height={256}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base leading-tight">{o.title}</div>
                <div className="text-xs text-muted-foreground leading-snug mt-1">{o.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Optional photo upload — never required */}
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

        {/* Thai national ID — required for every submission (links result back to the person). */}
        <div className="space-y-1.5 rounded-lg bg-muted/40 border border-border/60 p-3">
          <Label htmlFor="lean-thai-id" className="text-xs font-medium">
            {language === "th" ? "เลขบัตรประชาชน 13 หลัก" : "Thai national ID (13 digits)"} *
          </Label>
          <Input
            id="lean-thai-id"
            inputMode="numeric"
            autoComplete="off"
            value={thaiId}
            onChange={(e) => setThaiId(normalizeThaiId(e.target.value).slice(0, 13))}
            placeholder="X-XXXX-XXXXX-XX-X"
            maxLength={13}
          />
          <p className="text-[11px] text-muted-foreground">
            🔒 {language === "th"
              ? "ใช้เชื่อมผลตรวจกับเวชระเบียนของคุณอย่างปลอดภัย เก็บเป็นความลับตาม PDPA"
              : "Used to securely link your result with your medical record. Kept confidential per PDPA."}
          </p>
        </div>

        {/* Guest-only: contact info required for the team to follow up if reactive */}
        {guestMode && (
          <div className="space-y-3 rounded-lg bg-muted/40 border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">
                {language === "th" ? "ข้อมูลติดต่อกลับ" : "Contact information"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === "th"
                  ? "ส่งผลแบบไม่ต้องสมัครสมาชิก — ทีมจะใช้ข้อมูลนี้เฉพาะเมื่อจำเป็น"
                  : "No account needed — the team only uses this if necessary."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lean-guest-phone" className="text-xs">
                {language === "th" ? "เบอร์โทรติดต่อกลับ" : "Contact phone"} *
              </Label>
              <Input
                id="lean-guest-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="0XX-XXX-XXXX"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lean-guest-line" className="text-xs">
                {language === "th" ? "LINE ID (ไม่บังคับ)" : "LINE ID (optional)"}
              </Label>
              <Input
                id="lean-guest-line"
                value={guestLineId}
                onChange={(e) => setGuestLineId(e.target.value)}
                placeholder="@yourline"
                maxLength={100}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              🔒 {language === "th"
                ? "ข้อมูลของคุณจะถูกเก็บเป็นความลับ ใช้เพื่อติดต่อกลับและส่งต่อการดูแลเท่านั้น"
                : "Your information stays confidential, used only for follow-up and care."}
            </p>
          </div>
        )}

        {/* Province — required so the result can be plotted on the geo dashboard. */}
        <div className="space-y-1.5 rounded-lg bg-muted/40 border border-border/60 p-3">
          <Label htmlFor="lean-province" className="text-xs font-medium">
            {language === "th" ? "จังหวัด" : "Province"} *
          </Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger id="lean-province">
              <SelectValue placeholder={language === "th" ? "เลือกจังหวัด" : "Select province"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {getProvinces().map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {language === "th"
              ? "ใช้เพื่อสถิติเชิงพื้นที่ ไม่เปิดเผยตัวตน"
              : "Used for area-level analytics, never personally identified."}
          </p>
        </div>

        {/* PDPA consent — required before submitting Thai national ID. */}
        <label
          htmlFor="lean-pdpa-consent"
          className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3 cursor-pointer"
        >
          <Checkbox
            id="lean-pdpa-consent"
            checked={pdpaConsent}
            onCheckedChange={(v) => setPdpaConsent(v === true)}
            className="mt-0.5"
          />
          <span className="text-[11px] leading-snug text-muted-foreground">
            {language === "th"
              ? "ฉันยินยอมให้เก็บและใช้เลขบัตรประชาชนเพื่อเชื่อมผลตรวจกับเวชระเบียนของฉันตาม PDPA และจะเก็บเป็นความลับ"
              : "I consent to storing my Thai national ID to link this result with my medical record under PDPA. It will be kept confidential."}
          </span>
        </label>

        <Button
          size="lg"
          className="w-full"
          disabled={!result || submitting || !pdpaConsent || !province}
          onClick={async () => {
            if (!result) return;
            if (!pdpaConsent) {
              toast({
                title: language === "th"
                  ? "กรุณายืนยันความยินยอม PDPA ก่อนส่ง"
                  : "Please confirm PDPA consent before submitting",
                variant: "destructive",
              });
              return;
            }
            const trimmedThaiId = normalizeThaiId(thaiId);
            if (!isValidThaiId(trimmedThaiId)) {
              toast({
                title: language === "th"
                  ? "เลขบัตรประชาชนไม่ถูกต้อง"
                  : "Invalid Thai national ID",
                variant: "destructive",
              });
              return;
            }
            const trimmedProvince = province.trim();
            if (!trimmedProvince) {
              toast({
                title: language === "th" ? "กรุณาเลือกจังหวัด" : "Please select a province",
                variant: "destructive",
              });
              return;
            }
            if (guestMode) {
              const trimmedPhone = guestPhone.replace(/\s+/g, "");
              if (trimmedPhone.length < 8) {
                toast({ title: language === "th" ? "กรุณากรอกเบอร์โทรที่ติดต่อได้" : "Please enter a valid phone", variant: "destructive" });
                return;
              }
              // Photo is optional — RPC accepts null photo_path.
            }
            setSubmitting(true);
            try {
              let submittedId = request.id;
              if (guestMode) {
                submittedId = await submitGuestResult(result, photo, {
                  thaiId: trimmedThaiId,
                  phone: guestPhone.replace(/\s+/g, ""),
                  lineId: guestLineId.trim() || null,
                  province: trimmedProvince,
                });
                setGuestRequestId(submittedId);
              } else {
                await submitResult(request, result, photo, trimmedThaiId, trimmedProvince);
              }
              trackEvent("lean_result_submitted", {
                request_id: submittedId,
                result,
                has_photo: !!photo,
                via_magic_link: !!cameFromMagicLink,
                guest: !!guestMode,
              });

              // Fire-and-forget reactive notification
              if (result === "reactive") {
                supabase.functions
                  .invoke("notify-reactive-case", {
                    body: { request_id: submittedId, has_photo: !!photo },
                  })
                  .catch((err) => console.warn("[notify-reactive-case]", err));
              }

              // Clear the on-device timer + notify pending-banner hook so the
              // "submit your result" reminder disappears immediately.
              try {
                localStorage.removeItem("hiv-selftest-timer");
                window.dispatchEvent(new CustomEvent("selftest:pending-refresh"));
              } catch {
                /* noop */
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

        {!guestMode && (
          <button
            type="button"
            onClick={handlePostpone}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition"
          >
            {t.postpone}
          </button>
        )}
      </Card>
    );
  }

  // ---------- Step C: Outcome ----------
  if (step === "outcome" && result) {
    const effectiveRequestId = guestRequestId || request.id;
    return (
      <OutcomeScreen
        result={result}
        request={{ ...request, id: effectiveRequestId }}
        defaultCallbackPhone={guestMode ? guestPhone.replace(/\s+/g, "") : ""}
        t={t}
        onDone={onDone}
        onCareAction={async (action) => {
          trackEvent("lean_care_action", { request_id: effectiveRequestId, action, result, guest: !!guestMode });
          // Guests cannot UPDATE hiv_selftest_requests directly (RLS); their care choice
          // is captured in analytics only. Authenticated submissions persist it.
          if (guestMode) return;
          try {
            await supabase
              .from("hiv_selftest_requests")
              .update({ care_action: action })
              .eq("id", effectiveRequestId);
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
  defaultCallbackPhone,
  t,
  onDone,
  onCareAction,
}: {
  result: ResultType;
  request: LeanActiveRequest;
  defaultCallbackPhone?: string;
  t: typeof T.th;
  onDone: () => void;
  onCareAction: (action: string) => Promise<void>;
}) {

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

  // Reactive — phone-only callback request
  return (
    <ReactiveCallbackScreen
      requestId={_request.id}
      defaultPhone={defaultCallbackPhone || ""}
      t={t}
      onDone={onDone}
      onCareAction={onCareAction}
    />
  );
}

function ReactiveCallbackScreen({
  requestId,
  defaultPhone,
  t,
  onDone,
  onCareAction,
}: {
  requestId: string;
  defaultPhone: string;
  t: typeof T.th;
  onDone: () => void;
  onCareAction: (action: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = phone.replace(/\s+/g, "");
    if (trimmed.length < 8) {
      toast({ title: t.reactPhoneInvalid, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("attach_selftest_callback_phone", {
        p_request_id: requestId,
        p_phone: trimmed,
      });
      if (error) throw error;
      // Best-effort: also record care_action via the existing path (no-op for guests).
      try { await onCareAction("requested_callback"); } catch { /* noop */ }
      toast({ title: t.reactSavedToast });
      setTimeout(onDone, 1200);
    } catch (e) {
      console.error("[reactive callback]", e);
      toast({ title: t.submitErr, variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4 animate-fade-in bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
      <div className="text-5xl text-center">🤝</div>
      <h2 className="text-xl font-semibold text-center">{t.reactTitle}</h2>
      <div className="bg-background/70 rounded-lg p-3 text-sm space-y-2">
        <p><strong>{t.reactBody1}</strong></p>
        <p>{t.reactBody2}</p>
      </div>
      <p className="text-sm font-medium">{t.reactPick}</p>
      <div className="space-y-1.5">
        <Label htmlFor="reactive-callback-phone" className="text-xs font-medium">
          {t.reactPhoneLabel} *
        </Label>
        <Input
          id="reactive-callback-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.reactPhonePlaceholder}
          maxLength={20}
        />
        {defaultPhone && (
          <p className="text-[11px] text-muted-foreground">
            {t.reactPhoneSavedFor} <span className="font-medium">{defaultPhone}</span>
          </p>
        )}
      </div>
      <Button
        size="lg"
        className="w-full"
        disabled={saving || phone.replace(/\s+/g, "").length < 8}
        onClick={submit}
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {saving ? t.reactConnecting : t.reactConfirm}
      </Button>
      <p className="text-xs text-muted-foreground text-center">{t.reactFooter}</p>
    </Card>
  );
}

// ---------- Submit ----------
async function submitResult(
  request: LeanActiveRequest,
  result: ResultType,
  photo: File | null,
  thaiId: string,
  province: string,
) {
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
    thai_id: thaiId,
    province,
    test_result:
      result === "negative" ? "negative" : result === "reactive" ? "reactive" : "invalid",
  };
  if (photoPath) update.result_photo_url = photoPath;

  const { error } = await supabase
    .from("hiv_selftest_requests")
    .update(update)
    .eq("id", request.id);
  if (error) throw error;

  // Best-effort: mirror province onto the linked PII row so future analyses
  // see it on the canonical record too.
  if (request.user_id && province) {
    try {
      await supabase
        .from("selftest_pii")
        .update({ province })
        .eq("user_id", request.user_id)
        .is("province", null);
    } catch (e) {
      console.warn("[lean pii province sync]", e);
    }
  }

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

// ---------- Guest submit (anonymous) ----------
async function submitGuestResult(
  result: ResultType,
  photo: File | null,
  contact: { thaiId: string; phone: string; lineId: string | null; province: string },
): Promise<string> {
  let photoPath: string | null = null;
  if (photo) {
    // Upload to the guest/ prefix — anon insert is permitted there by storage policy.
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
    photoPath = `guest/${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("selftest-results")
      .upload(photoPath, photo, { upsert: false, contentType: photo.type });
    if (upErr) throw upErr;
  }

  const { data, error } = await supabase.rpc("submit_guest_selftest_result", {
    p_thai_id: contact.thaiId,
    p_phone: contact.phone,
    p_line_id: contact.lineId,
    p_self_result: result,
    p_photo_path: photoPath,
    p_wants_callback: result === "reactive",
    p_province: contact.province,
  });
  if (error) throw error;
  return data as unknown as string;
}

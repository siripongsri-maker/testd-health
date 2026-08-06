import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BadgeCheck, Upload, ShieldCheck, Banknote } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BANKS = [
  "ธนาคารกสิกรไทย (KBank)",
  "ธนาคารไทยพาณิชย์ (SCB)",
  "ธนาคารกรุงเทพ (BBL)",
  "ธนาคารกรุงไทย (KTB)",
  "ธนาคารกรุงศรีอยุธยา (BAY)",
  "ธนาคารทหารไทยธนชาต (ttb)",
  "ธนาคารออมสิน (GSB)",
  "ธนาคารเพื่อการเกษตรฯ (BAAC)",
  "อื่น ๆ",
];

const AMOUNT = 200;
const MAX_DIM = 1400;
const JPEG_QUALITY = 0.75;

/** Client-side downscale + compress so ID photos stay small before upload. */
async function compressImage(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export default function TravelAllowanceClaim({ token }: { token: string }) {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [checking, setChecking] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState<{
    submitted_at?: string | null;
    approved_at?: string | null;
    paid_at?: string | null;
    rejection_reason?: string | null;
    bank_last4?: string | null;
  }>({});
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number }>({
    limit: 100,
    used: 0,
    remaining: 100,
  });
  const [attended, setAttended] = useState(false);
  const [hasEvaluation, setHasEvaluation] = useState(false);
  const [phoneLast4, setPhoneLast4] = useState<string | null>(null);
  const [phoneClaimed, setPhoneClaimed] = useState(false);
  const [open, setOpen] = useState(false);

  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.rpc("get_post_eval_claim_status", { _token: token } as any);
    const row = (data as any[])?.[0];
    if (!row) return;
    setQuota({
      limit: row.quota_limit ?? 100,
      used: row.quota_used ?? 0,
      remaining: row.quota_remaining ?? 0,
    });
    setAttended(!!row.attendance_verified);
    setHasEvaluation(!!row.has_evaluation);
    setPhoneLast4(row.phone_last4 || null);
    setPhoneClaimed(!!row.phone_already_claimed);
    if (row?.has_claim) {
      setClaimed(true);
      setStatus(row.claim_status);
      setClaimInfo({
        submitted_at: row.submitted_at,
        approved_at: row.approved_at,
        paid_at: row.paid_at,
        rejection_reason: row.rejection_reason,
        bank_last4: row.bank_last4,
      });
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);



  const pickFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: tx("ไฟล์ใหญ่เกินไป", "File too large"), variant: "destructive" });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      setPreview(compressed);
    } catch {
      toast({ title: tx("อ่านรูปไม่สำเร็จ", "Could not read the image"), variant: "destructive" });
    }
  };

  const canSubmit =
    holder.trim().length > 1 &&
    bank !== "" &&
    account.replace(/\D/g, "").length >= 8 &&
    !!imageData &&
    consent;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: up, error: upErr } = await supabase.functions.invoke("post-eval-upload-id", {
        body: { token, image: imageData },
      });
      if (upErr || !up?.path) throw new Error(up?.error || upErr?.message || "upload_failed");

      const { error } = await supabase.rpc("submit_counseling_payout_claim", {
        _token: token,
        _payload: {
          account_holder_name: holder.trim(),
          bank_name: bank,
          bank_account_no: account,
          id_card_path: up.path,
        },
      } as any);
      if (error) throw error;

      setClaimed(true);
      setStatus("pending");
      await refresh();

      toast({ title: tx("ส่งคำขอค่าเดินทางแล้ว 🎉", "Travel allowance request submitted 🎉") });
    } catch (e: any) {
      const raw = String(e?.message || "");
      const friendly = raw.includes("Quota exhausted")
        ? tx("สิทธิ์ค่าเดินทางเต็มแล้ว (ครบ 100 คน)", "The travel allowance quota (100 people) is full")
        : raw.includes("Phone already claimed")
        ? tx("เบอร์โทรนี้ได้รับค่าเดินทางไปแล้ว", "This phone number has already claimed the allowance")
        : raw.includes("Visit not verified") || raw.includes("Booking phone missing")
        ? tx("ยังยืนยันการเข้ารับบริการจากการจองไม่ได้ กรุณาติดต่อเจ้าหน้าที่", "We could not verify your visit from the booking. Please contact staff.")
        : raw.includes("Evaluation not submitted")
        ? tx("กรุณากรอกแบบประเมินหลังรับคำปรึกษาก่อน", "Please complete the post-counseling evaluation first")
        : raw;
      toast({
        title: tx("ส่งคำขอไม่สำเร็จ", "Could not submit request"),
        description: friendly,
        variant: "destructive",
      });
      await refresh();

    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  if (claimed) {
    const steps = [
      {
        key: "submitted",
        label: tx("ส่งคำขอแล้ว", "Request submitted"),
        at: claimInfo.submitted_at,
        done: true,
      },
      {
        key: "approved",
        label: status === "rejected" ? tx("ไม่ผ่านการตรวจสอบ", "Not approved") : tx("ตรวจสอบ/อนุมัติ", "Verified & approved"),
        at: claimInfo.approved_at,
        done: status === "approved" || status === "paid" || status === "rejected",
      },
      {
        key: "paid",
        label: tx("โอนเงิน 200 บาท", "200 THB transferred"),
        at: claimInfo.paid_at,
        done: status === "paid",
      },
    ];

    return (
      <Card className="p-5 rounded-3xl border-2 border-teal-200 space-y-3">
        <div className="text-center space-y-1">
          <BadgeCheck className="h-8 w-8 text-teal-600 mx-auto" />
          <p className="font-bold">{tx("สถานะคำขอค่าเดินทาง", "Travel allowance status")}</p>
          {claimInfo.bank_last4 && (
            <p className="text-xs text-muted-foreground">
              {tx("บัญชีลงท้าย", "Account ending")} •••{claimInfo.bank_last4}
            </p>
          )}
        </div>

        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.key} className="flex items-start gap-2 text-sm">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${s.done ? (s.key === "approved" && status === "rejected" ? "bg-rose-500" : "bg-teal-500") : "bg-muted-foreground/30"}`} />
              <div>
                <p className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</p>
                {s.at && (
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(s.at).toLocaleString(language === "th" ? "th-TH" : "en-GB")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {status === "rejected" ? (
          <p className="text-xs text-rose-600">
            {claimInfo.rejection_reason ||
              tx("กรุณาติดต่อเจ้าหน้าที่เพื่อตรวจสอบข้อมูลบัญชีอีกครั้ง", "Please contact staff to review your bank details.")}
          </p>
        ) : status === "paid" ? (
          <p className="text-xs text-teal-700 dark:text-teal-300">{tx("โอนเงินเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ", "Payment completed. Thank you!")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {tx("ทีมงานจะตรวจสอบและโอน 200 บาทภายใน 7–14 วันทำการ",
                "Our team will verify and transfer 200 THB within 7–14 business days")}
          </p>
        )}

        <Button variant="outline" className="w-full h-9 rounded-full text-xs" onClick={refresh}>
          {tx("รีเฟรชสถานะ", "Refresh status")}
        </Button>
      </Card>
    );
  }


  if (!open) {
    return (
      <Card className="p-5 rounded-3xl border-2 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 space-y-3">
        <div className="flex items-start gap-3">
          <Banknote className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">{tx("รับค่าเดินทาง 200 บาท", "Get a 200 THB travel allowance")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tx("สำหรับผู้ที่ตอบแบบประเมินครบ · โอนเข้าบัญชีธนาคารของคุณ (1 ครั้งต่อการรับบริการ)",
                  "For completing this evaluation · transferred to your bank account (once per visit)")}
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full h-11 rounded-full bg-amber-600 hover:bg-amber-700 text-white">
          {tx("ขอรับค่าเดินทาง", "Request travel allowance")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 rounded-3xl border-2 border-amber-200 space-y-4">
      <div>
        <p className="font-bold text-sm">{tx("ข้อมูลรับค่าเดินทาง", "Travel allowance details")}</p>
        <p className="text-xs text-muted-foreground">
          {tx(`จำนวน ${AMOUNT} บาท ต่อการรับบริการ 1 ครั้ง`, `${AMOUNT} THB per visit`)}
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{tx("ชื่อ–นามสกุล เจ้าของบัญชี", "Account holder name")}</Label>
        <Input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120}
          placeholder={tx("ตรงกับชื่อในบัญชีธนาคาร", "Must match your bank account")} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{tx("ธนาคาร", "Bank")}</Label>
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{tx("เลือกธนาคาร", "Select a bank")}</option>
          {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{tx("เลขที่บัญชี", "Bank account number")}</Label>
        <Input value={account} inputMode="numeric" maxLength={20}
          onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ""))}
          placeholder="xxx-x-xxxxx-x" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{tx("รูปบัตรประชาชน (เพื่อยืนยันตัวตนกับฝ่ายบัญชี)", "ID card photo (required by finance)")}</Label>
        <label className="flex items-center gap-2 rounded-xl border-2 border-dashed p-3 cursor-pointer text-sm">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {preview ? tx("เปลี่ยนรูป", "Change photo") : tx("แตะเพื่อถ่ายรูป / เลือกไฟล์", "Tap to take or choose a photo")}
          </span>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
        {preview && <img src={preview} alt={tx("ตัวอย่างรูปบัตรประชาชน", "ID card preview")} className="rounded-xl max-h-40 object-contain w-full border" />}
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          {tx("ฉันยินยอมให้ testD เก็บข้อมูลบัญชีและรูปบัตรประชาชนเพื่อจ่ายค่าเดินทางเท่านั้น รูปบัตรจะถูกลบอัตโนมัติภายใน 180 วัน",
              "I consent to testD storing my bank details and ID photo solely to pay this allowance. The ID photo is deleted automatically within 180 days.")}
        </span>
      </label>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-teal-600" />
        {tx("ข้อมูลนี้แยกจากคำตอบแบบประเมิน และเข้าถึงได้เฉพาะฝ่ายที่จ่ายเงิน",
            "Kept separate from your answers and visible only to the payout team.")}
      </p>

      <Button onClick={submit} disabled={!canSubmit || submitting}
        className="w-full h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white">
        {submitting
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("กำลังส่ง...", "Submitting...")}</>
          : tx("ส่งคำขอรับ 200 บาท", "Submit for 200 THB")}
      </Button>
    </Card>
  );
}

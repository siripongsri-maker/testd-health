import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Banknote, Check, X, Eye, RefreshCw, AlertTriangle, Layers, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PostEvalSmsQueueCard from "./PostEvalSmsQueueCard";
import ClientNotificationsCard from "./ClientNotificationsCard";
import { fetchUrgentCaseMap, type UrgentCaseRef } from "@/lib/urgentCases";
import PrintButton from "./PrintButton";



type ClaimStatus = "pending" | "approved" | "paid" | "rejected";

interface Claim {
  id: string;
  branch_id: string | null;
  amount: number;
  account_holder_name: string;
  bank_name: string;
  bank_account_no: string;
  id_card_path: string | null;
  status: ClaimStatus;
  payment_ref: string | null;
  created_at: string;
  paid_at: string | null;
  duplicate_flag: boolean | null;
  duplicate_count: number | null;
  batch_id: string | null;
  appointment_id: string | null;
  phone_last4: string | null;
  payout_method: string | null;
  promptpay_no: string | null;
  note_id: string | null;
  evaluation_id: string | null;
  claim_seq: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  id_card_delete_after: string | null;
}


interface Batch {
  id: string;
  batch_code: string;
  period_from: string;
  period_to: string;
  status: string;
  claim_count: number;
  total_amount: number;
  paid_at: string | null;
  created_at: string;
}


const STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายแล้ว",
  rejected: "ปฏิเสธ",
};

const STATUS_CLASS: Record<ClaimStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  approved: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
};

/** Mask all but the last 4 digits of a bank account number. */
function maskAccount(no: string) {
  const digits = (no || "").replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return "•".repeat(digits.length - 4) + digits.slice(-4);
}

const baht = (n: number) => `฿${Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;

export default function AdminCounselingPayoutsContent() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClaimStatus | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [attended, setAttended] = useState<Record<string, boolean>>({});
  const [urgentMap, setUrgentMap] = useState<Map<string, UrgentCaseRef>>(new Map());
  const [urgentOnly, setUrgentOnly] = useState(false);


  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: brs }, { data: bts }] = await Promise.all([
      supabase
        .from("counseling_payout_claims")
        .select("id, branch_id, amount, account_holder_name, bank_name, bank_account_no, id_card_path, status, payment_ref, created_at, paid_at, duplicate_flag, duplicate_count, batch_id, appointment_id, phone_last4, payout_method, promptpay_no, note_id, evaluation_id, claim_seq, approved_at, rejection_reason, id_card_delete_after")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("booking_branches").select("id, name_th"),
      supabase
        .from("counseling_payout_batches")
        .select("id, batch_code, period_from, period_to, status, claim_count, total_amount, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const list = (rows as Claim[]) ?? [];
    setClaims(list);
    setBatches((bts as Batch[]) ?? []);
    setBranches(Object.fromEntries(((brs as any[]) ?? []).map((b) => [b.id, b.name_th])));

    // Verify each claim against a real, attended appointment (checked in / checked out).
    const apptIds = Array.from(new Set(list.map((c) => c.appointment_id).filter(Boolean))) as string[];
    if (apptIds.length) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, status, checked_out_at, arrived_at")
        .in("id", apptIds);
      const map: Record<string, boolean> = {};
      for (const a of (appts as any[]) ?? []) {
        map[a.id] = a.status === "checked_out" || a.status === "arrived" || !!a.checked_out_at || !!a.arrived_at;
      }
      setAttended(map);
    } else {
      setAttended({});
    }

    // Match urgent cases flagged on the appointments page (shared source: hr_referrals)
    setUrgentMap(await fetchUrgentCaseMap());
    setLoading(false);
  }, []);

  const isRealClient = useCallback(
    (c: Claim) => !!c.appointment_id && attended[c.appointment_id] === true,
    [attended],
  );

  const isUrgentClaim = useCallback(
    (c: Claim) => !!c.appointment_id && urgentMap.has(c.appointment_id),
    [urgentMap],
  );

  useEffect(() => { load(); }, [load]);


  useEffect(() => {
    const ch = supabase
      .channel("payout-claims-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "counseling_payout_claims" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = useMemo(() => claims.filter((c) => {
    if (verifiedOnly && !isRealClient(c)) return false;
    if (urgentOnly && !isUrgentClaim(c)) return false;
    if (filter !== "all" && c.status !== filter) return false;
    const d = c.created_at.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }), [claims, filter, from, to, verifiedOnly, urgentOnly, isRealClient, isUrgentClaim]);


  const hiddenCount = useMemo(
    () => (verifiedOnly ? claims.filter((c) => !isRealClient(c)).length : 0),
    [claims, verifiedOnly, isRealClient],
  );

  const totals = useMemo(() => {
    const real = claims.filter(isRealClient);
    return {
      count: filtered.length,
      amount: filtered.reduce((s, c) => s + Number(c.amount), 0),
      pending: real.filter((c) => c.status === "pending").length,
      unpaid: real.filter((c) => c.status !== "paid" && c.status !== "rejected")
        .reduce((s, c) => s + Number(c.amount), 0),
    };
  }, [filtered, claims, isRealClient]);


  const setStatus = async (id: string, status: ClaimStatus) => {
    setBusy(id);
    const patch: Record<string, unknown> = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("counseling_payout_claims").update(patch).eq("id", id);
    setBusy(null);
    if (error) {
      toast({ title: "อัปเดตไม่สำเร็จ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `อัปเดตเป็น "${STATUS_LABEL[status]}" แล้ว` });
    load();
  };

  const viewIdCard = async (path: string) => {
    const { data, error } = await supabase.storage.from("identity-docs").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "เปิดไฟล์ไม่สำเร็จ", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportCsv = () => {
    const header = ["วันที่ขอ", "สาขา", "ชื่อบัญชี", "ช่องทาง", "ธนาคาร", "เลขบัญชี", "เลขพร้อมเพย์", "จำนวนเงิน", "สถานะ", "อ้างอิงการจ่าย", "เบอร์ (4 ตัวท้าย)", "ยืนยันผู้รับบริการ", "เคสเร่งด่วน"];
    const lines = filtered.map((c) => [
      new Date(c.created_at).toLocaleDateString("th-TH"),
      branches[c.branch_id ?? ""] ?? "-",
      c.account_holder_name,
      c.payout_method === "promptpay" ? "พร้อมเพย์" : "โอนบัญชีธนาคาร",
      c.bank_name,
      `="${c.bank_account_no}"`,
      c.promptpay_no ? `="${c.promptpay_no}"` : "",
      String(c.amount),
      STATUS_LABEL[c.status],
      c.payment_ref ?? "",
      c.phone_last4 ?? "",
      isRealClient(c) ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน",
      isUrgentClaim(c) ? "เร่งด่วน" : "—",
    ]);


    const csv = "\uFEFF" + [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `counseling-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Group every approved, unbatched claim into a new payout round for finance. */
  const createBatch = async () => {
    const eligible = claims.filter((c) => c.status === "approved" && !c.batch_id && isRealClient(c));
    if (eligible.length === 0) {
      toast({ title: "ไม่มีรายการที่ยืนยันผู้รับบริการจริงและอนุมัติแล้วรอจัดรอบจ่าย" });
      return;
    }

    setBusy("batch");
    const dates = eligible.map((c) => c.created_at.slice(0, 10)).sort();
    const code = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(batches.length + 1).padStart(2, "0")}`;
    const { data: batch, error } = await supabase
      .from("counseling_payout_batches")
      .insert({
        batch_code: code,
        period_from: dates[0],
        period_to: dates[dates.length - 1],
        status: "submitted",
        claim_count: eligible.length,
        total_amount: eligible.reduce((s, c) => s + Number(c.amount), 0),
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !batch) {
      setBusy(null);
      toast({ title: "สร้างรอบจ่ายไม่สำเร็จ", description: error?.message, variant: "destructive" });
      return;
    }
    await supabase.from("counseling_payout_claims")
      .update({ batch_id: batch.id })
      .in("id", eligible.map((c) => c.id));
    setBusy(null);
    toast({ title: `สร้างรอบจ่าย ${code} แล้ว`, description: `${eligible.length} รายการ` });
    load();
  };

  /** Mark an entire round as paid (claims + batch). */
  const payBatch = async (batch: Batch) => {
    setBusy(batch.id);
    const now = new Date().toISOString();
    await supabase.from("counseling_payout_claims")
      .update({ status: "paid", paid_at: now, payment_ref: batch.batch_code })
      .eq("batch_id", batch.id)
      .neq("status", "rejected");
    const { error } = await supabase.from("counseling_payout_batches")
      .update({ status: "paid", paid_at: now })
      .eq("id", batch.id);
    setBusy(null);
    if (error) {
      toast({ title: "อัปเดตรอบจ่ายไม่สำเร็จ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `รอบ ${batch.batch_code} จ่ายเรียบร้อย` });
    load();
  };



  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-600" />
            สรุปค่าเดินทางเพื่อส่งฝ่ายบัญชี
          </h2>
          <p className="text-sm text-muted-foreground">
            ค่าเดินทาง 200 บาท/ครั้ง สำหรับผู้ที่ตอบแบบประเมินหลังรับคำปรึกษา
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />รีเฟรช
          </Button>
          <PrintButton documentTitle="counseling-travel-allowance" />
          <Button size="sm" onClick={exportCsv} className="bg-amber-600 hover:bg-amber-700">
            <Download className="h-3.5 w-3.5 mr-1" />ส่งออก CSV
          </Button>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="รายการที่แสดง" value={totals.count.toLocaleString()} />
        <Stat label="ยอดรวมที่แสดง" value={baht(totals.amount)} />
        <Stat label="รออนุมัติ" value={totals.pending.toLocaleString()} />
        <Stat label="ค้างจ่ายทั้งหมด" value={baht(totals.unpaid)} />
      </div>

      <PostEvalSmsQueueCard />

      <ClientNotificationsCard />

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-sm">รอบจ่ายเงิน (ส่งฝ่ายบัญชี)</span>
          <Button size="sm" className="ml-auto h-7 text-xs bg-amber-600 hover:bg-amber-700"
            disabled={busy === "batch"} onClick={createBatch}>
            {busy === "batch" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Layers className="h-3 w-3 mr-1" />}
            สร้างรอบจ่ายจากรายการที่อนุมัติแล้ว
          </Button>
        </div>
        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีรอบจ่าย</p>
        ) : (
          <div className="space-y-1.5">
            {batches.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs rounded-md border bg-muted/30 px-2 py-1.5 flex-wrap">
                <span className="font-semibold">{b.batch_code}</span>
                <Badge className={`text-[10px] ${b.status === "paid" ? STATUS_CLASS.paid : STATUS_CLASS.approved}`}>
                  {b.status === "paid" ? "จ่ายแล้ว" : "รอจ่าย"}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(b.period_from).toLocaleDateString("th-TH")} – {new Date(b.period_to).toLocaleDateString("th-TH")}
                </span>
                <span className="text-muted-foreground">{b.claim_count} รายการ</span>
                <span className="ml-auto font-bold tabular-nums">{baht(Number(b.total_amount))}</span>
                {b.status !== "paid" && (
                  <Button size="sm" className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy === b.id} onClick={() => payBatch(b)}>
                    ทำเครื่องหมายจ่ายทั้งรอบ
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>



      <Card className="p-3 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "paid", "rejected", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
            className="h-8" onClick={() => setFilter(s)}>
            {s === "all" ? "ทั้งหมด" : STATUS_LABEL[s]}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-auto text-xs" />
          <span className="text-xs text-muted-foreground">ถึง</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-auto text-xs" />
        </div>
        <div className="w-full flex items-center gap-2 flex-wrap border-t pt-2">
          <Button size="sm" variant={verifiedOnly ? "default" : "outline"} className="h-7 text-xs"
            onClick={() => setVerifiedOnly((v) => !v)}>
            {verifiedOnly ? "แสดงเฉพาะผู้รับบริการจริง" : "แสดงทุกรายการ (รวมที่ยังไม่ยืนยัน)"}
          </Button>
          <Button size="sm" variant={urgentOnly ? "default" : "outline"}
            className={`h-7 text-xs ${urgentOnly ? "bg-rose-600 hover:bg-rose-700" : "border-rose-300 text-rose-600"}`}
            onClick={() => setUrgentOnly((v) => !v)}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            เฉพาะเคสเร่งด่วน ({claims.filter(isUrgentClaim).length})
          </Button>

          <span className="text-[11px] text-muted-foreground">
            ยืนยันจากการจองที่เช็คอิน/เช็คเอาท์จริงเท่านั้น
            {verifiedOnly && hiddenCount > 0 && ` • ซ่อนอยู่ ${hiddenCount} รายการที่ยังไม่ยืนยัน`}
          </span>
        </div>
      </Card>


      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">ไม่มีรายการในเงื่อนไขที่เลือก</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className={`p-3 space-y-2 ${isUrgentClaim(c) ? "border-rose-400 ring-1 ring-rose-300/60" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{c.account_holder_name}</span>
                <Badge className={`text-[10px] ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</Badge>
                {isUrgentClaim(c) && (
                  <Badge className="text-[10px] bg-rose-600 text-white hover:bg-rose-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />เคสเร่งด่วน
                  </Badge>
                )}

                {c.duplicate_flag && (
                  <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    บัญชีนี้เคยรับแล้ว {c.duplicate_count ?? 1} ครั้ง/90 วัน
                  </Badge>
                )}
                {isRealClient(c) ? (
                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                    ผู้รับบริการจริง{c.phone_last4 ? ` • xxx${c.phone_last4}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                    ยังไม่ยืนยันการเข้ารับบริการ
                  </Badge>
                )}
                {c.batch_id && <Badge variant="outline" className="text-[10px]">อยู่ในรอบจ่าย</Badge>}

                <span className="text-xs text-muted-foreground">{branches[c.branch_id ?? ""] ?? "ไม่ระบุสาขา"}</span>
                <span className="ml-auto font-bold tabular-nums">{baht(c.amount)}</span>

              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Field
                  label="ช่องทางรับเงิน"
                  value={c.payout_method === "promptpay" ? "พร้อมเพย์" : "โอนเข้าบัญชีธนาคาร"}
                />
                <Field label={c.payout_method === "promptpay" ? "ชื่อพร้อมเพย์" : "ธนาคาร"} value={c.bank_name} />
                <Field
                  label={c.payout_method === "promptpay" ? "เลขพร้อมเพย์" : "เลขที่บัญชี"}
                  value={
                    <span className="inline-flex items-center gap-1">
                      <span className="tabular-nums">
                        {revealed[c.id]
                          ? (c.promptpay_no || c.bank_account_no)
                          : maskAccount(c.promptpay_no || c.bank_account_no)}
                      </span>
                      <button className="text-muted-foreground hover:text-foreground"
                        onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))}
                        aria-label="แสดง/ซ่อนเลขบัญชี">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard?.writeText(c.promptpay_no || c.bank_account_no);
                          toast({ title: "คัดลอกเลขบัญชีแล้ว" });
                        }}
                        aria-label="คัดลอกเลขบัญชี">
                        <Copy className="h-3 w-3" />
                      </button>
                    </span>
                  }
                />
                <Field label="วันที่ขอ" value={new Date(c.created_at).toLocaleString("th-TH")} />
              </div>

              {expanded[c.id] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border-t pt-2">
                  <Field label="ชื่อเจ้าของบัญชี (เต็ม)" value={c.account_holder_name} />
                  <Field label="สาขา" value={branches[c.branch_id ?? ""] ?? "ไม่ระบุ"} />
                  <Field label="ลำดับสิทธิ์" value={c.claim_seq ? `#${c.claim_seq}` : "—"} />
                  <Field label="จำนวนเงิน" value={baht(c.amount)} />
                  <Field label="เบอร์จอง (4 ตัวท้าย)" value={c.phone_last4 ? `xxx-xxx-${c.phone_last4}` : "—"} />
                  <Field label="ยืนยันการเข้ารับบริการ" value={isRealClient(c) ? "ยืนยันแล้ว (เช็คอิน/เช็คเอาท์)" : "ยังไม่ยืนยัน"} />
                  <Field label="วันที่อนุมัติ" value={c.approved_at ? new Date(c.approved_at).toLocaleString("th-TH") : "—"} />
                  <Field label="วันที่จ่าย" value={c.paid_at ? new Date(c.paid_at).toLocaleString("th-TH") : "—"} />
                  <Field label="อ้างอิงการจ่าย" value={c.payment_ref || "—"} />
                  <Field label="บัญชีซ้ำใน 90 วัน" value={c.duplicate_flag ? `ซ้ำ ${c.duplicate_count ?? 1} ครั้ง` : "ไม่ซ้ำ"} />
                  <Field label="รูปบัตรประชาชน" value={c.id_card_path ? `มี · ลบอัตโนมัติ ${c.id_card_delete_after ? new Date(c.id_card_delete_after).toLocaleDateString("th-TH") : "ภายใน 180 วัน"}` : "ไม่มี"} />
                  <Field label="เหตุผลที่ปฏิเสธ" value={c.rejection_reason || "—"} />
                  <Field label="Claim ID" value={<span className="font-mono text-[10px] break-all">{c.id}</span>} />
                  <Field label="Note ID" value={<span className="font-mono text-[10px] break-all">{c.note_id || "—"}</span>} />
                  <Field label="Evaluation ID" value={<span className="font-mono text-[10px] break-all">{c.evaluation_id || "—"}</span>} />
                  <Field label="Appointment ID" value={<span className="font-mono text-[10px] break-all">{c.appointment_id || "—"}</span>} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}>
                  {expanded[c.id] ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {expanded[c.id] ? "ซ่อนรายละเอียด" : "ดูรายละเอียดทั้งหมด"}
                </Button>
                {c.id_card_path && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewIdCard(c.id_card_path!)}>
                    <Eye className="h-3 w-3 mr-1" />ดูบัตรประชาชน
                  </Button>
                )}
                {c.status === "pending" && (
                  <>
                    <Button size="sm" className="h-7 text-xs bg-sky-600 hover:bg-sky-700"
                      disabled={busy === c.id} onClick={() => setStatus(c.id, "approved")}>
                      <Check className="h-3 w-3 mr-1" />อนุมัติ
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600"
                      disabled={busy === c.id} onClick={() => setStatus(c.id, "rejected")}>
                      <X className="h-3 w-3 mr-1" />ปฏิเสธ
                    </Button>
                  </>
                )}
                {c.status === "approved" && (
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy === c.id} onClick={() => setStatus(c.id, "paid")}>
                    <Banknote className="h-3 w-3 mr-1" />ทำเครื่องหมายว่าจ่ายแล้ว
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        🔒 เลขบัญชีถูกปิดบังโดยค่าเริ่มต้น รูปบัตรประชาชนเปิดผ่านลิงก์ชั่วคราว 5 นาที และถูกลบอัตโนมัติภายใน 180 วัน
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5">{value}</div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

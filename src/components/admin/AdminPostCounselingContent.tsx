import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, RefreshCw, ClipboardCheck, QrCode, Copy, ExternalLink,
  CheckCircle2, ClipboardList, Inbox, HeartPulse, Users, TrendingUp,
  ArrowLeftRight, ShieldCheck, MessageSquare, Send, Wallet,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";
import { useStableRefresh, lockScroll } from "@/hooks/useStableRefresh";


// Statuses that mean "counseling finished" (per project-wide convention).
const COMPLETED_STATUSES = ["counseling_completed", "case_closed"] as const;

interface ApptRef {
  branch_id: string | null;
  appointment_date: string | null;
  user_id: string | null;
  service_id: string | null;
}

interface SurveyRow {
  id: string;
  uic_code: string | null;
  uic_display: string | null;
  uic_hash: string | null;
  confidence: number | null;
  safety: number | null;
  mental_health_interest: string | null;
  recommend: string | null;
  suggestions: string | null;
  appointments?: ApptRef | null;
}

interface NoteRow {
  id: string;
  survey_id: string;
  branch_id: string | null;
  status: string;
  notes: string | null;
  next_step: string | null;
  follow_up_required: boolean;
  updated_by: string | null;
  updated_at: string;
  post_eval_token: string | null;
  counseling_completed_at: string | null;
}

interface PostEval {
  id: string;
  note_id: string;
  satisfaction_score: number | null;
  understanding_score: number | null;
  safety_score: number | null;
  respect_score: number | null;
  clarity_score: number | null;
  next_step_confidence_score: number | null;
  follow_up_interest: string | null;
  still_needs_support: string[] | null;
  open_feedback: string | null;
  evaluation_submitted_at: string;
}

interface BranchInfo { id: string; name_th: string; name_en: string }
interface CounselorInfo { id: string; display_name: string | null }

interface PayoutStatusRow {
  survey_id: string | null;
  note_id: string | null;
  branch_id: string | null;
  appointment_id: string | null;
  has_phone: boolean | null;
  sms_status: string | null;
  sms_sent_at: string | null;
  sms_scheduled_for: string | null;
  has_evaluation: boolean | null;
  claim_status: string | null;
  claim_amount: number | null;
  claim_submitted_at: string | null;
  claim_paid_at: string | null;
}

interface CombinedCase {
  note: NoteRow;
  survey?: SurveyRow;
  postEval?: PostEval;
}

// Exported so the hub can render each tab body.
export function PostCounselingCasesTab({ variant }: { variant: "cases" | "compare" }) {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { isMeAnalyst } = useAdminRole();
  const readOnly = !!isMeAnalyst;

  const [loading, setLoading] = useState(true);
  const { begin: beginLoad } = useStableRefresh(setLoading);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [surveys, setSurveys] = useState<Record<string, SurveyRow>>({});
  const [evals, setEvals] = useState<Record<string, PostEval>>({});
  const [branches, setBranches] = useState<Record<string, BranchInfo>>({});
  const [counselors, setCounselors] = useState<Record<string, CounselorInfo>>({});
  const [payouts, setPayouts] = useState<Record<string, PayoutStatusRow>>({});
  const [search, setSearch] = useState("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const load = async () => {
    beginLoad();
    try {
      const { data: noteRows, error: noteErr } = await supabase
        .from("pre_service_counseling_notes")
        .select("*")
        .in("status", COMPLETED_STATUSES as unknown as string[])
        .order("counseling_completed_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });
      if (noteErr) throw noteErr;
      const ns = (noteRows ?? []) as NoteRow[];
      setNotes(ns);

      const surveyIds = Array.from(new Set(ns.map((n) => n.survey_id).filter(Boolean)));
      const noteIds = ns.map((n) => n.id);
      const counselorIds = Array.from(new Set(ns.map((n) => n.updated_by).filter(Boolean))) as string[];

      const [sRes, eRes, brRes, cRes] = await Promise.all([
        surveyIds.length
          ? supabase
              .from("appointment_pre_service_surveys")
              .select("id, uic_code, uic_display, uic_hash, confidence, safety, mental_health_interest, recommend, suggestions, appointments:booking_id(branch_id, appointment_date, user_id, service_id)")
              .in("id", surveyIds)
          : Promise.resolve({ data: [], error: null } as any),
        noteIds.length
          ? supabase.from("post_counseling_evaluations").select("*").in("note_id", noteIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from("booking_branches").select("id, name_th, name_en"),
        counselorIds.length
          ? supabase.from("profiles").select("id, display_name").in("id", counselorIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const sMap: Record<string, SurveyRow> = {};
      (sRes.data as SurveyRow[] | null)?.forEach((r) => { sMap[r.id] = r; });
      setSurveys(sMap);

      const eMap: Record<string, PostEval> = {};
      (eRes.data as PostEval[] | null)?.forEach((r) => { eMap[r.note_id] = r; });
      setEvals(eMap);

      const bMap: Record<string, BranchInfo> = {};
      (brRes.data as BranchInfo[] | null)?.forEach((b) => { bMap[b.id] = b; });
      setBranches(bMap);

      const cMap: Record<string, CounselorInfo> = {};
      (cRes.data as CounselorInfo[] | null)?.forEach((c) => { cMap[c.id] = c; });
      setCounselors(cMap);

      // Unified SMS + travel-payout status (same source as the payouts tab)
      if (surveyIds.length) {
        const { data: payRows } = await supabase.rpc("get_case_payout_status", {
          _survey_ids: surveyIds as string[],
        });
        const pMap: Record<string, PayoutStatusRow> = {};
        (payRows as PayoutStatusRow[] | null)?.forEach((r) => { if (r.note_id) pMap[r.note_id] = r; });
        setPayouts(pMap);
      } else {
        setPayouts({});
      }

    } catch (e: any) {
      console.error("POST_COUNSELING_LOAD_ERR", e);
      toast({ title: tx("โหลดข้อมูลไม่สำเร็จ", "Load failed"), description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Realtime: refetch on any change to notes or evaluations.
  useEffect(() => {
    let t: any = null;
    const bump = () => { if (t) clearTimeout(t); t = setTimeout(load, 300); };
    const ch = supabase
      .channel("admin-post-counseling-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pre_service_counseling_notes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_counseling_evaluations" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_eval_sms_dispatches" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "counseling_payout_claims" }, bump)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, []);

  const branchName = (id: string | null | undefined) =>
    id ? (language === "th" ? branches[id]?.name_th : branches[id]?.name_en) || "—" : "—";
  const counselorLabel = (id: string | null | undefined) => {
    if (!id) return tx("ไม่ระบุ", "—");
    const c = counselors[id];
    return c?.display_name || `${id.slice(0, 6)}…`;
  };
  const caseIdLabel = (n: NoteRow) => {
    const s = surveys[n.survey_id];
    return s?.uic_display || s?.uic_code || (s?.uic_hash ? `#${s.uic_hash.slice(0, 8)}` : `${n.survey_id.slice(0, 8)}…`);
  };

  const combined: CombinedCase[] = useMemo(() => notes.map((n) => ({
    note: n, survey: surveys[n.survey_id], postEval: evals[n.id],
  })), [notes, surveys, evals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter(({ note, survey }) => {
      const hay = [
        survey?.uic_display, survey?.uic_code, survey?.uic_hash,
        branchName(note.branch_id), counselorLabel(note.updated_by),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [combined, search, branches, counselors, language]);

  const stats = useMemo(() => {
    const total = notes.length;
    const withToken = notes.filter((n) => !!n.post_eval_token).length;
    const submitted = notes.filter((n) => !!evals[n.id]).length;
    const rate = total ? (submitted / total) * 100 : 0;
    const evalList = Object.values(evals);
    const avg = (k: keyof PostEval) => {
      const vals = evalList.map((e) => e[k]).filter((v) => typeof v === "number") as number[];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const followUp = evalList.filter((e) => e.follow_up_interest && e.follow_up_interest !== "no").length;
    return {
      total, withToken, submitted, rate,
      avgSat: avg("satisfaction_score"),
      avgUnderstand: avg("understanding_score"),
      avgSafety: avg("safety_score"),
      avgRespect: avg("respect_score"),
      followUp,
    };
  }, [notes, evals]);

  const generateToken = async (n: NoteRow) => {
    if (readOnly) return;
    setGeneratingFor(n.id);
    try {
      const token = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { error } = await supabase
        .from("pre_service_counseling_notes")
        .update({ post_eval_token: token })
        .eq("id", n.id);
      if (error) throw error;
      toast({ title: tx("สร้างลิงก์ QR แล้ว", "QR link generated") });
      await load();
    } catch (e: any) {
      toast({ title: tx("สร้างไม่สำเร็จ", "Could not generate"), description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingFor(null);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post-counseling/${token}`);
      toast({ title: tx("คัดลอกแล้ว", "Link copied") });
    } catch { /* noop */ }
  };

  // ── Manual follow-up SMS ─────────────────────────────────────────
  const [smsNote, setSmsNote] = useState<NoteRow | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsPhoneLoading, setSmsPhoneLoading] = useState(false);
  const [smsPhoneSource, setSmsPhoneSource] = useState<"booking" | "manual" | "none">("none");

  // Pull the phone number the client used when booking, so staff never retype it.
  const openSmsDialog = async (note: NoteRow) => {
    setSmsNote(note);
    setSmsPhone("");
    setSmsPhoneSource("none");
    setSmsPhoneLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_post_eval_booking", { _note_id: note.id });
      if (error) throw error;
      const row = (data as any[] | null)?.[0];
      const phone = (row?.contact_phone ?? "").toString().replace(/\D/g, "");
      if (phone.length >= 9) {
        setSmsPhone(phone);
        setSmsPhoneSource("booking");
      } else {
        setSmsPhoneSource("manual");
      }
    } catch {
      setSmsPhoneSource("manual");
    } finally {
      setSmsPhoneLoading(false);
    }
  };


  const sendSms = async () => {
    if (!smsNote) return;
    const digits = smsPhone.replace(/\D/g, "");
    if (digits.length < 9) {
      toast({ title: tx("เบอร์โทรไม่ถูกต้อง", "Invalid phone number"), variant: "destructive" });
      return;
    }
    setSmsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-post-eval-sms", {
        body: { note_id: smsNote.id, phone: digits },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: tx("ส่ง SMS แล้ว 📩", "SMS sent 📩") });
      setSmsNote(null);
      setSmsPhone("");
      await load();
    } catch (e: any) {
      toast({ title: tx("ส่ง SMS ไม่สำเร็จ", "Could not send SMS"), description: e?.message, variant: "destructive" });
    } finally {
      setSmsSending(false);
    }
  };


  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // ── Comparison variant ──────────────────────────────────────────
  if (variant === "compare") {
    const withEval = filtered.filter((c) => c.postEval);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-teal-600" />
              {tx("เปรียบเทียบก่อน–หลังคำปรึกษา", "Pre / Post Counseling Comparison")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {tx("แสดงเฉพาะเคสที่มีทั้งข้อมูลก่อนและหลัง · ไม่แสดงข้อมูลส่วนตัว",
                  "Only cases with both pre and post data · no personal identifiers shown")}
            </p>
          </div>
          <Input
            placeholder={tx("ค้นหา (UIC / สาขา / ผู้ให้คำปรึกษา)", "Search (UIC / branch / counselor)")}
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9"
          />
        </div>

        {withEval.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto opacity-40 mb-2" />
            <div>{tx("ยังไม่มีเคสที่ประเมินหลังคำปรึกษา", "No completed post-evaluations yet")}</div>
          </Card>
        ) : (
          <div className="space-y-3">
            {withEval.map(({ note, survey, postEval }) => (
              <ComparisonCard
                key={note.id}
                caseId={caseIdLabel(note)}
                branch={branchName(note.branch_id)}
                counselor={counselorLabel(note.updated_by)}
                survey={survey}
                note={note}
                postEval={postEval!}
                tx={tx}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Cases variant ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            {tx("แบบประเมินหลังรับคำปรึกษา", "Post-Counseling Evaluations")}
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-teal-600" />
            {tx("สร้างและแสดง QR จากที่เดียว · QR เปิดหน้าปลอดภัยแยกจากแดชบอร์ด",
                "Generate and show QR from one place · QR opens a safe standalone page")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={tx("ค้นหา", "Search")}
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9"
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {tx("รีเฟรช", "Refresh")}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<ClipboardList className="h-4 w-4" />} label={tx("ปิดเคสแล้ว", "Completed cases")} value={stats.total} />
        <Kpi icon={<QrCode className="h-4 w-4" />} label={tx("QR พร้อมใช้", "QR ready")} value={stats.withToken} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label={tx("ส่งประเมินแล้ว", "Evaluations submitted")} value={stats.submitted} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label={tx("อัตราการตอบ", "Completion rate")} value={`${stats.rate.toFixed(0)}%`} />
        <Kpi icon={<HeartPulse className="h-4 w-4" />} label={tx("พึงพอใจเฉลี่ย", "Avg satisfaction")} value={stats.avgSat?.toFixed(2) ?? "—"} />
        <Kpi icon={<HeartPulse className="h-4 w-4" />} label={tx("เข้าใจเฉลี่ย", "Avg understanding")} value={stats.avgUnderstand?.toFixed(2) ?? "—"} />
        <Kpi icon={<ShieldCheck className="h-4 w-4" />} label={tx("ปลอดภัยเฉลี่ย", "Avg safety")} value={stats.avgSafety?.toFixed(2) ?? "—"} />
        <Kpi icon={<Users className="h-4 w-4" />} label={tx("ต้องติดตาม", "Follow-up needed")} value={stats.followUp} highlight />
      </div>

      {/* Cases table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{tx("รหัสเคส", "Case ID")}</th>
                <th className="px-3 py-2 text-left">{tx("สาขา", "Branch")}</th>
                <th className="px-3 py-2 text-left">{tx("ผู้ให้คำปรึกษา", "Counselor")}</th>
                <th className="px-3 py-2 text-left">{tx("เสร็จเมื่อ", "Completed at")}</th>
                <th className="px-3 py-2 text-center">{tx("QR", "QR")}</th>
                <th className="px-3 py-2 text-center">{tx("SMS", "SMS")}</th>
                <th className="px-3 py-2 text-center">{tx("ประเมิน", "Eval")}</th>
                <th className="px-3 py-2 text-center">{tx("ค่าเดินทาง", "Travel payout")}</th>
                <th className="px-3 py-2 text-left">{tx("ส่งเมื่อ", "Submitted")}</th>
                <th className="px-3 py-2 text-right">{tx("การทำงาน", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-muted-foreground">

                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <div>{tx("ยังไม่มีเคสที่ปิดแล้ว", "No completed cases yet")}</div>
                  </td>
                </tr>
              ) : filtered.map(({ note, postEval }) => {
                const token = note.post_eval_token;
                const submitted = !!postEval;
                const pay = payouts[note.id];
                return (
                  <tr key={note.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{caseIdLabel(note)}</td>
                    <td className="px-3 py-2 text-xs">{branchName(note.branch_id)}</td>
                    <td className="px-3 py-2 text-xs">{counselorLabel(note.updated_by)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {note.counseling_completed_at
                        ? new Date(note.counseling_completed_at).toLocaleString(language === "th" ? "th-TH" : "en-GB")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {token
                        ? <Badge className="bg-teal-600 text-white text-[10px]">{tx("พร้อม", "Ready")}</Badge>
                        : <Badge variant="outline" className="text-[10px]">{tx("ยังไม่มี", "None")}</Badge>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <SmsStatusBadge status={pay?.sms_status} hasPhone={!!pay?.has_phone} sentAt={pay?.sms_sent_at} tx={tx} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {submitted
                        ? <Badge className="bg-emerald-600 text-white text-[10px]">{tx("ส่งแล้ว", "Done")}</Badge>
                        : <Badge variant="outline" className="text-[10px]">—</Badge>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ClaimStatusCell
                        status={pay?.claim_status}
                        amount={pay?.claim_amount}
                        tx={tx}
                      />
                    </td>

                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {postEval?.evaluation_submitted_at
                        ? new Date(postEval.evaluation_submitted_at).toLocaleString(language === "th" ? "th-TH" : "en-GB")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {!token ? (
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
                            disabled={readOnly || generatingFor === note.id}
                            onClick={() => generateToken(note)}
                          >
                            {generatingFor === note.id
                              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              : <QrCode className="h-3 w-3 mr-1" />}
                            {tx("สร้าง QR", "Generate QR")}
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
                              onClick={() => window.open(`/post-counseling-qr/${token}`, "_blank", "noopener,noreferrer")}
                            >
                              <QrCode className="h-3 w-3 mr-1" />{tx("แสดง QR", "Show QR")}
                            </Button>
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => window.open(`/post-counseling/${token}`, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />{tx("เปิดฟอร์ม", "Open form")}
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => copyLink(token)}
                            >
                              <Copy className="h-3 w-3 mr-1" />{tx("คัดลอก", "Copy")}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs border-sky-300 text-sky-700 hover:bg-sky-50 dark:text-sky-300"
                          disabled={readOnly || submitted}
                          onClick={() => openSmsDialog(note)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />{tx("ส่ง SMS", "Send SMS")}
                        </Button>
                        {pay?.claim_status && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-amber-700 dark:text-amber-300"
                            onClick={() => window.open("/admin?tab=counseling-payouts", "_blank", "noopener,noreferrer")}
                          >
                            <Wallet className="h-3 w-3 mr-1" />{tx("ดูการจ่ายเงิน", "View payout")}
                          </Button>
                        )}

                      </div>

                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual follow-up SMS dialog */}
      <Dialog open={!!smsNote} onOpenChange={(o) => { if (!o) setSmsNote(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-sky-600" />
              {tx("ส่ง SMS ลิงก์แบบประเมิน", "Send evaluation link by SMS")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {tx("ระบบจะส่งลิงก์ประเมิน + ค่าเดินทาง 200 บาท และเก็บเฉพาะเลขท้าย 4 ตัวเท่านั้น",
                  "Sends the evaluation link (200 THB allowance). Only the last 4 digits are stored.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{tx("เบอร์โทรผู้รับบริการ", "Client phone number")}</Label>
            <Input
              value={smsPhone}
              inputMode="numeric"
              maxLength={15}
              placeholder={smsPhoneLoading ? tx("กำลังดึงเบอร์จากการจอง...", "Loading number from booking...") : "08xxxxxxxx"}
              disabled={smsPhoneLoading}
              onChange={(e) => { setSmsPhone(e.target.value.replace(/[^0-9+\- ]/g, "")); setSmsPhoneSource("manual"); }}
            />
            <p className="text-[11px] text-muted-foreground">
              {smsPhoneLoading
                ? tx("กำลังเชื่อมกับข้อมูลการจอง...", "Linking with the booking record...")
                : smsPhoneSource === "booking"
                  ? tx("✅ ดึงเบอร์จากการจองของผู้รับบริการอัตโนมัติ (แก้ไขได้)", "✅ Auto-filled from the client's booking (editable)")
                  : tx("⚠️ ไม่พบเบอร์ในการจอง กรุณากรอกเอง", "⚠️ No phone on the booking — enter it manually")}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {tx("เมื่อผู้รับบริการทำแบบประเมินเสร็จ ระบบจะเปิดให้เบิกค่าเดินทางในแท็บ “ระบบจ่ายเงิน” โดยอัตโนมัติ",
                  "Once the evaluation is submitted, the travel claim opens automatically in the Payouts tab.")}
            </p>
          </div>

          <Button
            className="w-full bg-sky-600 hover:bg-sky-700"
            disabled={smsSending || smsPhone.replace(/\D/g, "").length < 9}
            onClick={sendSms}
          >
            {smsSending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("กำลังส่ง...", "Sending...")}</>
              : <><Send className="h-4 w-4 mr-2" />{tx("ส่ง SMS", "Send SMS")}</>}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Unified SMS / payout status cells ─────────────────────────────
function SmsStatusBadge({ status, hasPhone, sentAt, tx }: {
  status?: string | null; hasPhone: boolean; sentAt?: string | null;
  tx: (th: string, en: string) => string;
}) {
  if (status === "sent" || status === "delivered") {
    return (
      <Badge className="bg-sky-600 text-white text-[10px]" title={sentAt ? new Date(sentAt).toLocaleString("th-TH") : undefined}>
        {tx("ส่งแล้ว", "Sent")}
      </Badge>
    );
  }
  if (status === "queued" || status === "scheduled" || status === "pending") {
    return <Badge variant="outline" className="text-[10px] border-sky-300 text-sky-700">{tx("รอส่ง", "Queued")}</Badge>;
  }
  if (status === "failed") {
    return <Badge className="bg-rose-600 text-white text-[10px]">{tx("ล้มเหลว", "Failed")}</Badge>;
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {hasPhone ? tx("มีเบอร์จอง", "Phone on file") : tx("ไม่มีเบอร์", "No phone")}
    </Badge>
  );
}

function ClaimStatusCell({ status, amount, tx }: {
  status?: string | null; amount?: number | null;
  tx: (th: string, en: string) => string;
}) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-amber-500 text-white", label: tx("รออนุมัติ", "Pending") },
    approved: { cls: "bg-sky-600 text-white", label: tx("อนุมัติแล้ว", "Approved") },
    paid: { cls: "bg-emerald-600 text-white", label: tx("จ่ายแล้ว", "Paid") },
    rejected: { cls: "bg-rose-600 text-white", label: tx("ปฏิเสธ", "Rejected") },
  };
  const s = map[status] ?? { cls: "bg-muted text-foreground", label: status };
  return (
    <a
      href="/admin?tab=counseling-payouts"
      target="_blank" rel="noopener noreferrer"
      className="inline-flex flex-col items-center gap-0.5 hover:opacity-80"
    >
      <Badge className={`${s.cls} text-[10px]`}>{s.label}</Badge>
      {amount != null && <span className="text-[10px] text-muted-foreground tabular-nums">฿{Number(amount).toLocaleString()}</span>}
    </a>
  );
}


// ── Small helpers ─────────────────────────────────────────────────
function Kpi({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean;
}) {
  return (
    <Card className={`p-3 ${highlight ? "border-rose-300 bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </Card>
  );
}

function ComparisonCard({
  caseId, branch, counselor, survey, note, postEval, tx,
}: {
  caseId: string;
  branch: string;
  counselor: string;
  survey?: SurveyRow;
  note: NoteRow;
  postEval: PostEval;
  tx: (th: string, en: string) => string;
}) {
  const rows: { label: string; pre: number | null; post: number | null }[] = [
    { label: tx("ปลอดภัย", "Safety"), pre: survey?.safety ?? null, post: postEval.safety_score },
    { label: tx("มั่นใจในขั้นถัดไป", "Next-step confidence"), pre: survey?.confidence ?? null, post: postEval.next_step_confidence_score },
  ];
  const postOnly: { label: string; value: number | null }[] = [
    { label: tx("พึงพอใจ", "Satisfaction"), value: postEval.satisfaction_score },
    { label: tx("เข้าใจ", "Understanding"), value: postEval.understanding_score },
    { label: tx("เคารพ", "Respect"), value: postEval.respect_score },
    { label: tx("ชัดเจน", "Clarity"), value: postEval.clarity_score },
  ];
  const deltaColor = (d: number | null) =>
    d === null ? "text-muted-foreground"
    : d > 0 ? "text-emerald-600 dark:text-emerald-400"
    : d < 0 ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";
  const deltaLabel = (d: number | null) => d === null ? "—" : d > 0 ? `+${d}` : `${d}`;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-0.5">
          <div className="font-mono text-sm font-semibold">{caseId}</div>
          <div className="text-xs text-muted-foreground">
            {branch} · {counselor} ·{" "}
            {note.counseling_completed_at
              ? new Date(note.counseling_completed_at).toLocaleString()
              : "—"}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{note.status}</Badge>
      </div>

      {(survey?.mental_health_interest === "yes" || survey?.suggestions?.trim()) && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
          <div className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
            {tx("ข้อกังวลก่อนรับคำปรึกษา", "Pre-counseling concerns")}
          </div>
          {survey?.mental_health_interest === "yes" && (
            <div><span className="font-semibold">{tx("สุขภาพจิต", "Mental health")}:</span> {tx("สนใจ", "Interested")}</div>
          )}
          {survey?.suggestions?.trim() && (
            <div><span className="font-semibold">{tx("ข้อเสนอ", "Note")}:</span> {survey.suggestions.trim()}</div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-2 py-1">{tx("มิติ", "Dimension")}</th>
              <th className="px-2 py-1 text-center">{tx("ก่อน", "Pre")}</th>
              <th className="px-2 py-1 text-center">{tx("หลัง", "Post")}</th>
              <th className="px-2 py-1 text-center">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const delta = r.pre !== null && r.post !== null ? r.post - r.pre : null;
              return (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{r.label}</td>
                  <td className="px-2 py-1 text-center tabular-nums">{r.pre ?? "—"}</td>
                  <td className="px-2 py-1 text-center tabular-nums font-semibold">{r.post ?? "—"}</td>
                  <td className={`px-2 py-1 text-center tabular-nums font-bold ${deltaColor(delta)}`}>{deltaLabel(delta)}</td>
                </tr>
              );
            })}
            {postOnly.map((r, i) => (
              <tr key={`p-${i}`} className="border-t bg-muted/20">
                <td className="px-2 py-1 text-muted-foreground">{r.label}</td>
                <td className="px-2 py-1 text-center text-muted-foreground">—</td>
                <td className="px-2 py-1 text-center tabular-nums font-semibold">{r.value ?? "—"}</td>
                <td className="px-2 py-1 text-center text-muted-foreground">
                  <span className="text-[10px]">{tx("หลังเท่านั้น", "post only")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-2 text-xs">
        {postEval.follow_up_interest && (
          <div className="rounded-md border bg-background/60 p-2">
            <div className="uppercase tracking-wide text-[10px] text-muted-foreground">
              {tx("ตั้งใจติดตาม", "Follow-up intent")}
            </div>
            <div className="font-semibold mt-0.5">{postEval.follow_up_interest}</div>
          </div>
        )}
        {(postEval.still_needs_support?.length ?? 0) > 0 && (
          <div className="rounded-md border bg-background/60 p-2">
            <div className="uppercase tracking-wide text-[10px] text-muted-foreground">
              {tx("ยังต้องการ", "Still needs")}
            </div>
            <div className="mt-0.5">{postEval.still_needs_support!.join(", ")}</div>
          </div>
        )}
        {note.next_step && (
          <div className="rounded-md border bg-background/60 p-2 md:col-span-2">
            <div className="uppercase tracking-wide text-[10px] text-muted-foreground">
              {tx("แผนขั้นถัดไป (จากผู้ให้คำปรึกษา)", "Next-step (counselor)")}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">{note.next_step}</div>
          </div>
        )}
        {postEval.open_feedback && (
          <div className="rounded-md border bg-background/60 p-2 md:col-span-2">
            <div className="uppercase tracking-wide text-[10px] text-muted-foreground">
              {tx("ความเห็นจากผู้รับบริการ", "Client feedback")}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">{postEval.open_feedback}</div>
          </div>
        )}
      </div>
    </Card>
  );
}

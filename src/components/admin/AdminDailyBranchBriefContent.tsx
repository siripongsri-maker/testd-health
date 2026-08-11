import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, RefreshCw, Download, Printer, AlertTriangle, Building2, Clock, Radio,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, type CsvColumn } from "@/lib/adminCsvExport";
import { format } from "date-fns";
import { fetchUrgentCaseMap, fetchSurveyAppointmentMap, fetchUrgentAppointmentsForDay, type UrgentAppointmentRef } from "@/lib/urgentCases";
import PrintButton from "./PrintButton";



interface BriefCase {
  case_id: string | null;
  survey_id: string;
  branch_id: string | null;
  submitted_at: string;
  appointment_date: string | null;
  appointment_time: string | null;
  case_code: string;
  is_anonymous: boolean;
  visit_type: "first" | "repeat";
  risk_level: "critical" | "high" | "medium";
  help_topics: string[] | null;
  derived_topics: string[] | null;
  main_concern: string | null;
  prep_note: string | null;
  status: string;
  assigned_counselor_id: string | null;
  hours_open: number;
  sla_hours: number;
  sla_breached: boolean;
}

interface BranchInfo { id: string; name_th: string; name_en: string }

/** Travel-allowance (ค่าเดินทาง 200 บาท) handoff status per closed case. */
interface PayoutStatus {
  survey_id: string;
  note_id: string | null;
  appointment_id: string | null;
  has_phone: boolean;
  sms_status: string | null;
  sms_sent_at: string | null;
  sms_scheduled_for: string | null;
  has_evaluation: boolean;
  claim_status: string | null;
  claim_amount: number | null;
  claim_submitted_at: string | null;
  claim_paid_at: string | null;
}

const CLAIM_LABEL: Record<string, [string, string]> = {
  pending: ["รออนุมัติ", "Pending"],
  approved: ["อนุมัติแล้ว", "Approved"],
  paid: ["จ่ายแล้ว", "Paid"],
  rejected: ["ปฏิเสธ", "Rejected"],
};

const CLAIM_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  approved: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
};

/** Short summary of where a case sits in the travel-allowance pipeline. */
function payoutStage(p: PayoutStatus | undefined, closed: boolean) {
  if (p?.claim_status) return { key: "claim", th: `ค่าเดินทาง: ${CLAIM_LABEL[p.claim_status]?.[0] ?? p.claim_status}`, en: `Allowance: ${CLAIM_LABEL[p.claim_status]?.[1] ?? p.claim_status}`, cls: CLAIM_CLASS[p.claim_status] ?? "" };
  if (p?.has_evaluation) return { key: "eval", th: "ประเมินแล้ว · รอกรอกบัญชีรับค่าเดินทาง", en: "Evaluated · awaiting bank details", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200" };
  if (p?.sms_status === "sent") return { key: "sent", th: "ส่งลิงก์ค่าเดินทางแล้ว", en: "Allowance link sent", cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200" };
  if (p?.sms_status === "failed") return { key: "failed", th: "ส่งลิงก์ไม่สำเร็จ", en: "Link send failed", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" };
  if (p?.sms_status === "queued") return { key: "queued", th: "เข้าคิวส่งลิงก์ค่าเดินทาง", en: "Allowance link queued", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" };
  if (closed && p && !p.has_phone) return { key: "nophone", th: "ปิดเคสแล้ว · ไม่มีเบอร์ติดต่อ ส่งลิงก์ไม่ได้", en: "Closed · no phone on file", cls: "bg-muted text-muted-foreground" };
  if (closed) return { key: "none", th: "ปิดเคสแล้ว · ยังไม่ได้ส่งต่อค่าเดินทาง", en: "Closed · allowance not handed off", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" };
  return null;
}

const RISK_STYLE: Record<string, string> = {
  critical: "bg-rose-600 text-white",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const TOPIC_LABELS: Record<string, [string, string]> = {
  mental_health: ["สุขภาพจิต", "Mental health"],
  violence: ["ความรุนแรง", "Violence"],
  substance_use: ["การใช้สาร", "Substance use"],
  access_to_care: ["สิทธิการเข้ารักษา", "Access to care"],
  legal: ["กฎหมาย", "Legal"],
  financial: ["การเงิน", "Financial"],
  safety: ["ความปลอดภัย", "Safety"],
};

const STATUS_OPTIONS = [
  { value: "not_reviewed", th: "รอรับเรื่อง", en: "Waiting" },
  { value: "follow_up_needed", th: "กำลังดูแล", en: "In progress" },
  { value: "counseling_completed", th: "เสร็จสิ้น", en: "Completed" },
  { value: "case_closed", th: "ปิดเคส", en: "Closed" },
];

export default function AdminDailyBranchBriefContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { user } = useAuth();
  const { role } = useAdminRole();

  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [rows, setRows] = useState<BriefCase[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [urgentSurveyIds, setUrgentSurveyIds] = useState<Set<string>>(new Set());
  const [urgentAppointments, setUrgentAppointments] = useState<UrgentAppointmentRef[]>([]);
  const [linkedUrgentApptIds, setLinkedUrgentApptIds] = useState<Set<string>>(new Set());
  const [payouts, setPayouts] = useState<Map<string, PayoutStatus>>(new Map());
  const [queuingId, setQueuingId] = useState<string | null>(null);




  const branchName = useCallback(
    (id: string | null) => {
      if (!id) return tx("ไม่ระบุสาขา", "Unknown branch");
      const b = branches.find((x) => x.id === id);
      return b ? (language === "th" ? b.name_th : b.name_en) : tx("ไม่ระบุสาขา", "Unknown branch");
    },
    [branches, language],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_daily_branch_brief", {
        p_date: day,
        p_branch_ids: branchFilter === "all" ? null : [branchFilter],
      } as any);
      if (error) throw error;
      setRows((data || []) as unknown as BriefCase[]);
    } catch (err: any) {
      console.error("DAILY_BRIEF_ERROR", err);
      toast({
        title: tx("โหลดสรุปรายวันไม่สำเร็จ", "Failed to load daily brief"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [day, branchFilter]);

  useEffect(() => {
    supabase.from("booking_branches").select("id, name_th, name_en").then(({ data }) => {
      setBranches((data || []) as BranchInfo[]);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Match urgent cases flagged on the appointments page (shared source: hr_referrals).
  // The urgent COUNT comes from the appointments of the day so it matches the
  // appointments page and the counseling queue — not only cases that have a survey row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [urgentMap, surveyMap, apptUrgent] = await Promise.all([
        fetchUrgentCaseMap(),
        fetchSurveyAppointmentMap(rows.map((r) => r.survey_id)),
        fetchUrgentAppointmentsForDay(day, branchFilter === "all" ? null : branchFilter),
      ]);
      if (cancelled) return;
      const flagged = new Set<string>();
      const linked = new Set<string>();
      rows.forEach((r) => {
        const apptId = surveyMap.get(r.survey_id);
        if (apptId && urgentMap.has(apptId)) { flagged.add(r.survey_id); linked.add(apptId); }
      });
      setUrgentSurveyIds(flagged);
      setLinkedUrgentApptIds(linked);
      setUrgentAppointments(apptUrgent);

    })();
    return () => { cancelled = true; };
  }, [rows, day, branchFilter]);



  // Realtime: reflect status changes made in Counselor Support and vice versa
  useEffect(() => {
    const channel = supabase
      .channel("daily-branch-brief")
      .on("postgres_changes", { event: "*", schema: "public", table: "pre_service_counseling_notes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_pre_service_surveys" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_referrals" }, () => load())
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" ? "offline" : "connecting");
      });
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const updateStatus = async (row: BriefCase, status: string) => {
    setSavingId(row.survey_id);
    try {
      if (row.case_id) {
        const { error } = await supabase
          .from("pre_service_counseling_notes")
          .update({ status, updated_by: user?.id ?? null })
          .eq("id", row.case_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pre_service_counseling_notes")
          .insert({ survey_id: row.survey_id, status, updated_by: user?.id ?? null });
        if (error) throw error;
      }
      toast({ title: tx("อัปเดตสถานะแล้ว", "Status updated") });
      load();
    } catch (err: any) {
      toast({
        title: tx("อัปเดตไม่สำเร็จ", "Update failed"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  /* -------- grouped + summary -------- */
  const grouped = useMemo(() => {
    const map = new Map<string, BriefCase[]>();
    rows.forEach((r) => {
      const key = r.branch_id || "unknown";
      map.set(key, [...(map.get(key) || []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  const summary = useMemo(() => {
    const breached = rows.filter((r) => r.sla_breached).length;
    const top = grouped[0];
    const byTopic = new Map<string, number>();
    rows.forEach((r) => {
      [...(r.help_topics || []), ...(r.derived_topics || [])].forEach((t) =>
        byTopic.set(t, (byTopic.get(t) || 0) + 1),
      );
    });
    return {
      total: rows.length,
      critical: rows.filter((r) => r.risk_level === "critical").length,
      high: rows.filter((r) => r.risk_level === "high").length,
      medium: rows.filter((r) => r.risk_level === "medium").length,
      breached,
      urgent: urgentAppointments.length,
      urgentUnlinked: urgentAppointments.filter((u) => !linkedUrgentApptIds.has(u.appointment_id)),
      topBranch: top ? `${branchName(top[0] === "unknown" ? null : top[0])} (${top[1].length})` : "—",
      topics: Array.from(byTopic.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [rows, grouped, branchName, urgentSurveyIds, urgentAppointments, linkedUrgentApptIds]);




  const exportCsv = () => {
    const cols: CsvColumn<BriefCase>[] = [
      { key: "submitted_at", header: "เวลาที่ส่งเข้ามา", format: (r) => format(new Date(r.submitted_at), "yyyy-MM-dd HH:mm") },
      { key: "appointment_slot", header: "เวลาที่จองเข้ามา", format: (r) => (r.appointment_date ? `${r.appointment_date}${r.appointment_time ? " " + r.appointment_time : ""}` : "—") },
      { key: "branch", header: "สาขา", format: (r) => branchName(r.branch_id) },
      { key: "case_code", header: "รหัสเคส / UIC" },
      { key: "visit_type", header: "ครั้งแรก/เคยรับบริการ", format: (r) => (r.visit_type === "repeat" ? "เคยรับบริการ" : "ครั้งแรก") },
      { key: "risk_level", header: "ระดับความเสี่ยง" },
      {
        key: "topics", header: "ประเด็นที่ต้องช่วย",
        format: (r) => [...(r.help_topics || []), ...(r.derived_topics || [])]
          .map((t) => TOPIC_LABELS[t]?.[0] || t).join(" | "),
      },
      { key: "main_concern", header: "ประเด็นหลัก" },
      { key: "prep_note", header: "สิ่งที่ควรเตรียม" },
      { key: "status", header: "สถานะ", format: (r) => STATUS_OPTIONS.find((s) => s.value === r.status)?.th || r.status },
      { key: "sla", header: "เกิน SLA", format: (r) => (r.sla_breached ? `เกิน (${r.hours_open} ชม. / ${r.sla_hours} ชม.)` : "ปกติ") },
      { key: "urgent", header: "เคสเร่งด่วน", format: (r) => (urgentSurveyIds.has(r.survey_id) ? "เร่งด่วน" : "—") },

    ];
    exportToCsv(
      rows, cols, "daily_branch_brief", { from: day, to: day },
      user ? { userId: user.id, role: role || "staff", timestamp: Date.now(), module: "daily_brief" } : undefined,
    );
  };

  return (
    <div className="space-y-4">
      <style>{`@media print { .no-print { display: none !important; } .print-block { break-inside: avoid; } }`}</style>

      {/* Controls */}
      <Card className="p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{tx("เลือกวัน", "Date")}</Label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("สาขา", "Branch")}</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกสาขา", "All branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{language === "th" ? b.name_th : b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
          <PrintButton documentTitle={`daily-branch-brief-${day}`} />

          <Badge variant="outline" className="gap-1">
            <Radio className={`h-3 w-3 ${live === "live" ? "text-emerald-500" : "text-muted-foreground"}`} />
            {live === "live" ? tx("เรียลไทม์", "Live") : tx("กำลังเชื่อมต่อ", "Connecting")}
          </Badge>
        </div>
      </Card>

      {/* Summary header */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 print-block">
        {[
          { label: tx("เคสที่ต้องช่วยวันนี้", "Cases needing support"), value: summary.total, icon: AlertTriangle },
          { label: tx("เคสเร่งด่วน (จากนัดหมาย)", "Urgent (from appointments)"), value: summary.urgent, icon: AlertTriangle },
          { label: tx("ความเสี่ยงวิกฤต", "Critical"), value: summary.critical, icon: AlertTriangle },
          { label: tx("ความเสี่ยงสูง", "High"), value: summary.high, icon: AlertTriangle },
          { label: tx("เกิน SLA", "SLA breached"), value: summary.breached, icon: Clock },
        ].map((k) => (

          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{tx("สาขาที่มากที่สุด", "Busiest branch")}</p>
          <p className="text-sm font-semibold mt-1">{summary.topBranch}</p>
        </Card>
      </div>

      {/* Urgent cases from the appointments page that have no pre-service survey yet —
          shown so this page's urgent count reconciles with the appointments page. */}
      {summary.urgentUnlinked.length > 0 && (
        <Card className="p-4 space-y-2 border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 print-block">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-semibold">
              {tx("เคสเร่งด่วนจากหน้านัดหมาย (ยังไม่มีแบบสอบถามก่อนรับบริการ)",
                  "Urgent cases from appointments (no pre-service survey yet)")}
            </p>
            <Badge className="bg-rose-600 text-white">{summary.urgentUnlinked.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.urgentUnlinked.map((u) => (
              <div key={u.appointment_id} className="rounded-md border border-rose-300/60 bg-background p-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Clock className="h-3 w-3 text-rose-600" />
                  {String(u.start_time || "").slice(0, 5) || "—"}
                  <span className="font-normal text-muted-foreground">{branchName(u.branch_id)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{u.case?.referral_type}</Badge>
                  {u.referral_code && <span className="font-mono">{u.referral_code}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}


      {summary.topics.length > 0 && (
        <Card className="p-4 print-block">
          <p className="text-xs text-muted-foreground mb-2">{tx("ประเด็นที่ต้องช่วยเหลือ (รวมทุกสาขา)", "Support topics (all branches)")}</p>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map(([t, n]) => (
              <Badge key={t} variant="secondary">
                {TOPIC_LABELS[t]?.[language === "th" ? 0 : 1] || t} · {n}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Cases grouped by branch */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {tx("วันนี้ยังไม่มีเคสที่ต้องการความช่วยเหลือ", "No cases needing support on this date")}
        </Card>
      ) : (
        grouped.map(([bid, cases]) => (
          <Card key={bid} className="p-4 space-y-3 print-block">
            <div className="flex items-center gap-2 border-b pb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{branchName(bid === "unknown" ? null : bid)}</h3>
              <Badge variant="outline">{cases.length} {tx("เคส", "cases")}</Badge>
              {(["critical", "high", "medium"] as const).map((r) => {
                const n = cases.filter((c) => c.risk_level === r).length;
                return n ? <Badge key={r} className={RISK_STYLE[r]}>{r} {n}</Badge> : null;
              })}
              {cases.filter((c) => urgentSurveyIds.has(c.survey_id)).length > 0 && (
                <Badge className="bg-rose-600 text-white">
                  {tx("เร่งด่วน", "Urgent")} {cases.filter((c) => urgentSurveyIds.has(c.survey_id)).length}
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {[...cases]
                .sort((a, b) => Number(urgentSurveyIds.has(b.survey_id)) - Number(urgentSurveyIds.has(a.survey_id)))
                .map((c) => (

                <div
                  key={c.survey_id}
                  className={`rounded-lg border p-3 space-y-2 ${urgentSurveyIds.has(c.survey_id) ? "border-rose-400 bg-rose-50/40 dark:bg-rose-950/20" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-medium">{c.case_code}</span>
                    {urgentSurveyIds.has(c.survey_id) && (
                      <Badge className="bg-rose-600 text-white gap-1">
                        <AlertTriangle className="h-3 w-3" />{tx("เคสเร่งด่วน", "Urgent case")}
                      </Badge>
                    )}

                    <Badge className={RISK_STYLE[c.risk_level]}>{c.risk_level}</Badge>
                    <Badge variant="outline">
                      {c.visit_type === "repeat" ? tx("เคยรับบริการ", "Repeat") : tx("ครั้งแรก", "First visit")}
                    </Badge>
                    {c.is_anonymous && <Badge variant="secondary">{tx("ไม่ระบุตัวตน", "Anonymous")}</Badge>}
                    {(c.appointment_date || c.appointment_time) && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Clock className="h-3 w-3" />
                        {tx("จองเวลา", "Booked")} {c.appointment_time || "—"}
                        {c.appointment_date && c.appointment_date !== day
                          ? ` · ${format(new Date(c.appointment_date + "T00:00:00"), "dd/MM")}`
                          : ""}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {tx("ส่งแบบสอบถาม", "Submitted")} {format(new Date(c.submitted_at), "HH:mm")} · {c.hours_open} {tx("ชม.", "h")}
                    </span>
                    {c.sla_breached && (
                      <Badge variant="destructive" className="gap-1">
                        <Clock className="h-3 w-3" />{tx("เกิน SLA", "SLA breached")} ({c.sla_hours}h)
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[...(c.help_topics || []), ...(c.derived_topics || [])].map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {TOPIC_LABELS[t]?.[language === "th" ? 0 : 1] || t}
                      </Badge>
                    ))}
                  </div>

                  {c.main_concern && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">{tx("ประเด็นหลัก: ", "Main concern: ")}</span>
                      {c.main_concern}
                    </p>
                  )}
                  {c.prep_note && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">{tx("ควรเตรียม: ", "Prepare: ")}</span>
                      {c.prep_note}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <Select
                      value={c.status}
                      onValueChange={(v) => updateStatus(c, v)}
                      disabled={savingId === c.survey_id}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{language === "th" ? s.th : s.en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingId === c.survey_id && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span className="text-[11px] text-muted-foreground">
                      {c.assigned_counselor_id
                        ? tx("มีผู้รับผิดชอบแล้ว", "Assigned")
                        : tx("ยังไม่มีผู้รับผิดชอบ", "Unassigned")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, RefreshCw, HeartHandshake, AlertTriangle, ClipboardList,
  Users, Clock3, CheckCircle2, ArrowRightCircle, Building2, Filter,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface ApptRef {
  branch_id: string | null;
  appointment_date: string | null;
  user_id: string | null;
  service_id: string | null;
  source: string | null;
}

interface SurveyRow {
  id: string;
  booking_id: string;
  uic_display: string | null;
  uic_code: string | null;
  uic_hash: string | null;
  visit_sequence: number;
  channel: string | null;
  language: string | null;
  confidence: number | null;
  safety: number | null;
  recommend: string | null;
  mental_health_interest: string | null;
  suggestions: string | null;
  created_at: string;
  appointments?: ApptRef | null;
}

type CaseStatus =
  | "not_reviewed"
  | "counseling_completed"
  | "prep_pep_discussed"
  | "hiv_test_recommended"
  | "referred_to_clinic"
  | "follow_up_needed"
  | "case_closed";

interface CaseNote {
  id: string;
  survey_id: string;
  branch_id: string | null;
  status: CaseStatus;
  notes: string | null;
  next_step: string | null;
  follow_up_required: boolean;
  updated_at: string;
  updated_by: string | null;
}

interface BranchInfo { id: string; name_th: string; name_en: string }
interface ServiceInfo { id: string; name_th: string; name_en: string }

// ────────────────────────────────────────────────────────────────
// Priority & risk logic
// ────────────────────────────────────────────────────────────────
function computePriority(r: SurveyRow, note?: CaseNote): "urgent" | "follow_up" | "standard" {
  // Urgent: explicit mental health "yes", low confidence, or high-risk service (PEP)
  if (r.mental_health_interest === "yes") return "urgent";
  if (r.confidence !== null && r.confidence <= 2) return "urgent";
  if (r.safety !== null && r.safety <= 1) return "urgent";
  if (note?.follow_up_required || note?.status === "follow_up_needed") return "follow_up";
  if (r.mental_health_interest === "maybe") return "follow_up";
  if (r.confidence === 3) return "follow_up";
  return "standard";
}

function riskLabel(r: SurveyRow): "high" | "medium" | "low" {
  if (r.confidence !== null && r.confidence <= 2) return "high";
  if (r.mental_health_interest === "yes") return "high";
  if (r.safety !== null && r.safety <= 2) return "medium";
  if (r.confidence === 3) return "medium";
  return "low";
}

function suggestTopics(r: SurveyRow, tx: (th: string, en: string) => string): string[] {
  const topics: string[] = [];
  if (r.visit_sequence === 1) topics.push(tx("แนะนำบริการและการตรวจ HIV เบื้องต้น", "Introduce services and baseline HIV testing options"));
  if (r.mental_health_interest === "yes" || r.mental_health_interest === "maybe") {
    topics.push(tx("รับฟังและเสนอการสนับสนุนด้านสุขภาพจิตอย่างไม่ตัดสิน", "Offer non-judgmental mental health support and listen actively"));
  }
  if (r.confidence !== null && r.confidence <= 3) {
    topics.push(tx("ทบทวนความรู้เรื่อง HIV / PrEP / PEP อย่างเข้าใจง่าย", "Refresh HIV / PrEP / PEP knowledge in simple language"));
  }
  if (r.safety !== null && r.safety <= 3) {
    topics.push(tx("พูดคุยเรื่องความปลอดภัยและการลดความเสี่ยง", "Discuss safety and harm-reduction strategies"));
  }
  if (r.visit_sequence > 1) {
    topics.push(tx("ติดตามผลจากครั้งที่แล้วและวางแผนต่อเนื่อง", "Follow up on prior visits and continuity of care"));
  }
  if (r.suggestions && r.suggestions.trim().length > 0) {
    topics.push(tx("ตอบข้อเสนอแนะที่ผู้รับบริการเขียนไว้", "Address the client's written suggestions"));
  }
  if (topics.length === 0) topics.push(tx("รับฟังความต้องการและให้คำปรึกษาทั่วไป", "Listen to needs and provide general counseling"));
  return topics;
}

function suggestNextStep(r: SurveyRow, tx: (th: string, en: string) => string): string {
  if (r.mental_health_interest === "yes") return tx("ส่งต่อทีมสุขภาพจิต / นัดผู้เชี่ยวชาญ", "Refer to mental health team / schedule specialist");
  if (r.confidence !== null && r.confidence <= 2) return tx("แนะนำการตรวจ HIV วันนี้และวางแผน PrEP/PEP", "Recommend HIV test today and plan PrEP/PEP");
  if (r.visit_sequence > 3) return tx("ทบทวนแผนการดูแลระยะยาว", "Review long-term care plan");
  return tx("ให้ข้อมูลบริการที่เหมาะสมและเสนอทางเลือกต่อไป", "Provide relevant service info and suggest next options");
}

// ────────────────────────────────────────────────────────────────
// Labels
// ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<CaseStatus, { th: string; en: string }> = {
  not_reviewed: { th: "ยังไม่ได้ตรวจสอบ", en: "Not yet reviewed" },
  counseling_completed: { th: "ให้คำปรึกษาเสร็จแล้ว", en: "Counseling completed" },
  prep_pep_discussed: { th: "พูดคุย PrEP/PEP แล้ว", en: "PrEP/PEP discussed" },
  hiv_test_recommended: { th: "แนะนำตรวจ HIV", en: "HIV test recommended" },
  referred_to_clinic: { th: "ส่งต่อคลินิก", en: "Referred to clinic" },
  follow_up_needed: { th: "ต้องติดตาม", en: "Follow-up needed" },
  case_closed: { th: "ปิดเคส", en: "Case closed" },
};

const PRIORITY_META = {
  urgent:     { badge: "bg-rose-600 text-white",     ring: "border-rose-400", label_th: "เร่งด่วน",   label_en: "Urgent" },
  follow_up:  { badge: "bg-amber-500 text-white",    ring: "border-amber-400", label_th: "ติดตาม",     label_en: "Follow-up" },
  standard:   { badge: "bg-emerald-600 text-white",  ring: "border-emerald-400", label_th: "ปกติ",       label_en: "Standard" },
} as const;

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
export default function AdminCounselorSupportContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { user } = useAuth();
  const { isAdmin, isMeAnalyst, userBranch, loading: roleLoading } = useAdminRole();

  const [staffBranchId, setStaffBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [notes, setNotes] = useState<Record<string, CaseNote>>({});
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [branchFilter, setBranchFilter] = useState<string>("all"); // admin only
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "follow_up" | "standard">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [search, setSearch] = useState("");

  // Resolve staff branch (moderators only)
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      if (isAdmin || isMeAnalyst) { setStaffBranchId(null); return; }
      // Try staff_profiles first
      const { data } = await supabase
        .from("staff_profiles")
        .select("branch_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (data?.branch_id) { setStaffBranchId(data.branch_id); return; }
      // Fallback: staff_branch_assignments (stored as text uuid)
      if (userBranch) setStaffBranchId(userBranch);
    })();
  }, [user?.id, isAdmin, isMeAnalyst, userBranch]);

  // Load everything (surveys + notes + branches + services). RLS enforces scope.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL surveys via range pagination — RLS will scope to branch
      let all: any[] = [];
      let from = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("appointment_pre_service_surveys")
          .select("*, appointments:booking_id(branch_id, appointment_date, user_id, service_id, source)")
          .order("created_at", { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) { console.error("COUNSELOR_SURVEYS_ERR", error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < BATCH) break;
        from += BATCH;
      }

      const [notesRes, brRes, svRes] = await Promise.all([
        supabase.from("pre_service_counseling_notes").select("*"),
        supabase.from("booking_branches").select("id, name_th, name_en"),
        supabase.from("booking_services").select("id, name_th, name_en"),
      ]);
      const map: Record<string, CaseNote> = {};
      ((notesRes.data as any[]) || []).forEach((n) => { map[n.survey_id] = n as CaseNote; });

      setSurveys(all as SurveyRow[]);
      setNotes(map);
      setBranches((brRes.data as any) || []);
      setServices((svRes.data as any) || []);
    } catch (e: any) {
      console.error("COUNSELOR_LOAD_ERR", e);
      toast({ title: "Load failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!roleLoading) load(); }, [roleLoading, load]);

  // Realtime: refetch on any change to surveys or notes
  useEffect(() => {
    let t: any = null;
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(() => load(), 300); };
    const channel = supabase
      .channel("admin-counselor-support-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_pre_service_surveys" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "pre_service_counseling_notes" }, schedule)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setRealtimeStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtimeStatus("offline");
        else setRealtimeStatus("connecting");
      });
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const branchMap = useMemo(() => {
    const m = new Map<string, BranchInfo>();
    branches.forEach((b) => m.set(b.id, b));
    return m;
  }, [branches]);
  const serviceMap = useMemo(() => {
    const m = new Map<string, ServiceInfo>();
    services.forEach((s) => m.set(s.id, s));
    return m;
  }, [services]);
  const branchName = (id: string | null | undefined) =>
    id ? (language === "th" ? branchMap.get(id)?.name_th : branchMap.get(id)?.name_en) || "—" : "—";
  const serviceName = (id: string | null | undefined) =>
    id ? (language === "th" ? serviceMap.get(id)?.name_th : serviceMap.get(id)?.name_en) || "—" : "—";

  // Filter (branch filter for admin, priority, status, search)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return surveys.filter((r) => {
      if (!isAdmin && !isMeAnalyst && staffBranchId && r.appointments?.branch_id !== staffBranchId) return false;
      if ((isAdmin || isMeAnalyst) && branchFilter !== "all" && r.appointments?.branch_id !== branchFilter) return false;
      const note = notes[r.id];
      const priority = computePriority(r, note);
      if (priorityFilter !== "all" && priority !== priorityFilter) return false;
      const closed = note?.status === "case_closed";
      if (statusFilter === "open" && closed) return false;
      if (statusFilter === "closed" && !closed) return false;
      if (q) {
        const hay = `${r.uic_display || r.uic_code || ""} ${r.booking_id} ${branchName(r.appointments?.branch_id)} ${serviceName(r.appointments?.service_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [surveys, notes, isAdmin, isMeAnalyst, staffBranchId, branchFilter, priorityFilter, statusFilter, search, language]);

  // Group by priority
  const groups = useMemo(() => {
    const g = { urgent: [] as SurveyRow[], follow_up: [] as SurveyRow[], standard: [] as SurveyRow[] };
    filtered.forEach((r) => {
      const p = computePriority(r, notes[r.id]);
      g[p].push(r);
    });
    // Urgent first, sorted newest
    (["urgent", "follow_up", "standard"] as const).forEach((k) => {
      g[k].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    return g;
  }, [filtered, notes]);

  // Branch summary KPIs — scoped to whatever the counselor can see (RLS-filtered)
  const summary = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const today = surveys.filter((r) => now - new Date(r.created_at).getTime() < dayMs);
    const urgentAll = surveys.filter((r) => computePriority(r, notes[r.id]) === "urgent");
    const completed = surveys.filter((r) => notes[r.id]?.status === "counseling_completed" || notes[r.id]?.status === "case_closed");
    const pendingFollowUp = surveys.filter((r) => notes[r.id]?.follow_up_required || notes[r.id]?.status === "follow_up_needed");
    const referred = surveys.filter((r) => notes[r.id]?.status === "referred_to_clinic");

    // Avg response time: notes.updated_at - survey.created_at where reviewed
    const reviewed = surveys
      .map((r) => ({ r, n: notes[r.id] }))
      .filter((x) => x.n && x.n.status !== "not_reviewed");
    const avgMinutes = reviewed.length
      ? reviewed.reduce((s, x) => s + (new Date(x.n!.updated_at).getTime() - new Date(x.r.created_at).getTime()), 0) / reviewed.length / 60000
      : 0;

    return {
      todayCount: today.length,
      urgent: urgentAll.length,
      completed: completed.length,
      followUp: pendingFollowUp.length,
      referred: referred.length,
      avgMinutes,
    };
  }, [surveys, notes]);

  // Save note handler
  const saveNote = async (surveyId: string, patch: Partial<CaseNote>) => {
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) return;
    const branch_id = survey.appointments?.branch_id || null;
    if (!branch_id) {
      toast({ title: tx("ไม่มีสาขา", "No branch"), description: tx("บันทึกไม่ได้ เนื่องจากไม่มีข้อมูลสาขา", "Cannot save — no branch on appointment"), variant: "destructive" });
      return;
    }
    const existing = notes[surveyId];
    const payload: any = {
      survey_id: surveyId,
      branch_id,
      status: patch.status ?? existing?.status ?? "not_reviewed",
      notes: patch.notes ?? existing?.notes ?? null,
      next_step: patch.next_step ?? existing?.next_step ?? null,
      follow_up_required: patch.follow_up_required ?? existing?.follow_up_required ?? false,
      updated_by: user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("pre_service_counseling_notes")
      .upsert(payload, { onConflict: "survey_id" })
      .select()
      .single();
    if (error) {
      console.error("COUNSELOR_SAVE_ERR", error);
      toast({ title: tx("บันทึกไม่สำเร็จ", "Save failed"), description: error.message, variant: "destructive" });
      return;
    }
    setNotes((prev) => ({ ...prev, [surveyId]: data as CaseNote }));
    toast({ title: tx("บันทึกแล้ว", "Saved") });
  };

  const readOnly = isMeAnalyst;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-teal-600" />
            {tx("Counselor Support — คิวให้คำปรึกษา", "Counselor Support Queue")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tx(
              "เคสจากแบบสำรวจก่อนรับบริการ อัปเดตแบบเรียลไทม์ตามสาขาของคุณ",
              "Pre-service survey cases scoped to your branch, updated live.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
              realtimeStatus === "live"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : realtimeStatus === "offline"
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              realtimeStatus === "live" ? "bg-emerald-500 animate-pulse"
              : realtimeStatus === "offline" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
            }`} />
            {realtimeStatus === "live" ? tx("เรียลไทม์", "Live")
              : realtimeStatus === "offline" ? tx("ออฟไลน์", "Offline")
              : tx("กำลังเชื่อมต่อ", "Connecting")}
          </span>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tx("รีเฟรช", "Refresh")}
          </Button>
        </div>
      </div>

      {/* Branch summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label={tx("เคสวันนี้", "Cases today")} value={summary.todayCount} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label={tx("เร่งด่วน", "Urgent")} value={summary.urgent} tone="urgent" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label={tx("ให้คำปรึกษาแล้ว", "Completed")} value={summary.completed} tone="ok" />
        <KpiCard icon={<Clock3 className="h-4 w-4" />} label={tx("ต้องติดตาม", "Follow-up")} value={summary.followUp} tone="warn" />
        <KpiCard icon={<ArrowRightCircle className="h-4 w-4" />} label={tx("ส่งต่อคลินิก", "Referred")} value={summary.referred} />
        <KpiCard icon={<Users className="h-4 w-4" />} label={tx("เวลาตอบเฉลี่ย (นาที)", "Avg response (min)")} value={summary.avgMinutes ? summary.avgMinutes.toFixed(1) : "—"} />
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tx("ค้นหา UIC / บริการ / สาขา", "Search UIC / service / branch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="h-9 px-3 rounded-md border bg-background text-sm"
        >
          <option value="all">{tx("ระดับความสำคัญทั้งหมด", "All priorities")}</option>
          <option value="urgent">{tx("เร่งด่วน", "Urgent")}</option>
          <option value="follow_up">{tx("ติดตาม", "Follow-up")}</option>
          <option value="standard">{tx("ปกติ", "Standard")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-9 px-3 rounded-md border bg-background text-sm"
        >
          <option value="open">{tx("เคสที่เปิดอยู่", "Open cases")}</option>
          <option value="closed">{tx("ปิดแล้ว", "Closed")}</option>
          <option value="all">{tx("ทั้งหมด", "All")}</option>
        </select>
        {(isAdmin || isMeAnalyst) && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">{tx("ทุกสาขา", "All branches")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{language === "th" ? b.name_th : b.name_en}</option>
            ))}
          </select>
        )}
        {!isAdmin && !isMeAnalyst && staffBranchId && (
          <Badge variant="outline" className="ml-auto gap-1">
            <Building2 className="h-3 w-3" /> {branchName(staffBranchId)}
          </Badge>
        )}
      </Card>

      {/* Queue groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto opacity-40 mb-2" />
          <div className="font-medium">{tx("ยังไม่มีเคสในคิวของคุณ", "No cases in your queue yet")}</div>
          <div className="text-xs mt-1">{tx("รอผู้รับบริการส่งแบบสำรวจ ระบบจะอัปเดตอัตโนมัติ", "New submissions will appear here automatically")}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {(["urgent", "follow_up", "standard"] as const).map((key) => {
            if (groups[key].length === 0) return null;
            const meta = PRIORITY_META[key];
            return (
              <section key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={meta.badge}>
                    {language === "th" ? meta.label_th : meta.label_en}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{groups[key].length} {tx("เคส", "cases")}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groups[key].map((r) => (
                    <CaseCard
                      key={r.id}
                      row={r}
                      note={notes[r.id]}
                      priority={key}
                      ring={meta.ring}
                      branchName={branchName}
                      serviceName={serviceName}
                      tx={tx}
                      readOnly={readOnly}
                      onSave={(patch) => saveNote(r.id, patch)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  tone?: "urgent" | "warn" | "ok";
}) {
  const toneCls =
    tone === "urgent" ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/20"
    : tone === "warn" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
    : tone === "ok" ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
    : "";
  return (
    <Card className={`p-3 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function CaseCard({ row, note, priority, ring, branchName, serviceName, tx, readOnly, onSave }: {
  row: SurveyRow;
  note?: CaseNote;
  priority: "urgent" | "follow_up" | "standard";
  ring: string;
  branchName: (id: string | null | undefined) => string;
  serviceName: (id: string | null | undefined) => string;
  tx: (th: string, en: string) => string;
  readOnly: boolean;
  onSave: (patch: Partial<CaseNote>) => void | Promise<void>;
}) {
  const [expanded, setExpanded] = useState(priority === "urgent");
  const [notesDraft, setNotesDraft] = useState(note?.notes || "");
  const [nextStepDraft, setNextStepDraft] = useState(note?.next_step || "");
  const [followUp, setFollowUp] = useState<boolean>(!!note?.follow_up_required);
  const [status, setStatus] = useState<CaseStatus>(note?.status || "not_reviewed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotesDraft(note?.notes || "");
    setNextStepDraft(note?.next_step || "");
    setFollowUp(!!note?.follow_up_required);
    setStatus(note?.status || "not_reviewed");
  }, [note?.id, note?.updated_at]);

  const risk = riskLabel(row);
  const topics = suggestTopics(row, tx);
  const suggested = suggestNextStep(row, tx);
  const identifier = row.uic_display || row.uic_code || `#${row.id.slice(0, 8)}`;
  const isAnon = !row.appointments?.user_id;
  const submittedAgo = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        notes: notesDraft || null,
        next_step: nextStepDraft || null,
        follow_up_required: followUp,
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`p-4 border-l-4 ${ring} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-semibold">{identifier}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Building2 className="h-3 w-3" />
            <span>{branchName(row.appointments?.branch_id)}</span>
            <span>•</span>
            <span>{serviceName(row.appointments?.service_id)}</span>
            <span>•</span>
            <span>{submittedAgo}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={
            risk === "high" ? "bg-rose-500 text-white"
            : risk === "medium" ? "bg-amber-500 text-white"
            : "bg-emerald-500 text-white"
          }>
            {tx("ความเสี่ยง", "Risk")}: {risk}
          </Badge>
          <Badge variant="secondary">#{row.visit_sequence} {row.visit_sequence === 1 ? tx("ครั้งแรก", "First") : tx("กลับซ้ำ", "Repeat")}</Badge>
        </div>
      </div>

      {/* Indicators */}
      <div className="text-xs grid grid-cols-2 gap-y-1 gap-x-2 bg-muted/40 rounded-md p-2">
        <div><span className="text-muted-foreground">{tx("ความมั่นใจ", "Confidence")}:</span> {row.confidence ?? "—"}/5</div>
        <div><span className="text-muted-foreground">{tx("ความปลอดภัย", "Safety")}:</span> {row.safety ?? "—"}/5</div>
        <div><span className="text-muted-foreground">MH:</span> {row.mental_health_interest || "—"}</div>
        <div><span className="text-muted-foreground">{tx("ตัวตน", "Identity")}:</span> {isAnon ? tx("ไม่ระบุ", "Anonymous") : tx("ล็อกอิน", "User")}</div>
      </div>

      {row.suggestions && (
        <div className="text-xs bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md p-2">
          <div className="font-semibold text-teal-800 dark:text-teal-200 mb-0.5">{tx("ข้อเสนอแนะจากผู้รับบริการ", "Client suggestions")}</div>
          <div className="whitespace-pre-wrap">{row.suggestions}</div>
        </div>
      )}

      {/* Guidance */}
      <div>
        <div className="text-xs font-semibold mb-1">{tx("หัวข้อที่แนะนำให้พูดคุย", "Suggested counseling topics")}</div>
        <ul className="text-xs list-disc list-inside space-y-0.5 text-muted-foreground">
          {topics.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <div className="text-xs mt-2">
          <span className="font-semibold">{tx("ขั้นตอนถัดไปที่แนะนำ", "Recommended next step")}:</span>{" "}
          <span className="text-muted-foreground">{suggested}</span>
        </div>
      </div>

      {/* Status pill */}
      <div className="flex items-center justify-between text-xs">
        <span>
          <span className="text-muted-foreground">{tx("สถานะ", "Status")}: </span>
          <Badge variant="outline">{tx(STATUS_LABELS[status].th, STATUS_LABELS[status].en)}</Badge>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? tx("ย่อ", "Collapse") : tx("เปิดเคส", "Open case")}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t pt-3">
          <label className="text-xs font-semibold block">{tx("บันทึกของผู้ให้คำปรึกษา", "Counselor note")}</label>
          <Textarea
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder={tx("บันทึกอย่างสุภาพและไม่ตัดสิน…", "Write a supportive, non-judgmental note…")}
            disabled={readOnly}
          />
          <label className="text-xs font-semibold block">{tx("ขั้นตอนถัดไป", "Next step")}</label>
          <Input
            value={nextStepDraft}
            onChange={(e) => setNextStepDraft(e.target.value)}
            placeholder={tx("เช่น นัด PrEP counsel สัปดาห์หน้า", "e.g. Schedule PrEP counseling next week")}
            disabled={readOnly}
          />
          <label className="text-xs font-semibold block">{tx("อัปเดตสถานะ", "Update status")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CaseStatus)}
            className="h-9 px-3 rounded-md border bg-background text-sm w-full"
            disabled={readOnly}
          >
            {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
              <option key={s} value={s}>{tx(STATUS_LABELS[s].th, STATUS_LABELS[s].en)}</option>
            ))}
          </select>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={followUp} onCheckedChange={setFollowUp} disabled={readOnly} />
              {tx("ต้องติดตามภายหลัง", "Requires follow-up")}
            </label>
            <Button size="sm" onClick={handleSave} disabled={readOnly || saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {tx("บันทึก", "Save")}
            </Button>
          </div>
          {note?.updated_at && (
            <div className="text-[11px] text-muted-foreground pt-1">
              {tx("อัปเดตล่าสุด", "Last updated")}: {new Date(note.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

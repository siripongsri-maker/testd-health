import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, RefreshCw, HeartHandshake, AlertTriangle, ClipboardList,
  Users, Clock3, CheckCircle2, ArrowRightCircle, Building2, Filter,
  ChevronDown, Sunrise, Sun, Sunset, Calendar, CalendarDays, Footprints,
  QrCode, Copy, Star,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface ApptRef {
  branch_id: string | null;
  appointment_date: string | null;
  start_time: string | null; // "HH:MM:SS"
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
  post_eval_token: string | null;
  counseling_completed_at: string | null;
}

interface PostEval {
  id: string;
  note_id: string;
  branch_id: string | null;
  satisfaction_score: number | null;
  understanding_score: number | null;
  safety_score: number | null;
  respect_score: number | null;
  clarity_score: number | null;
  next_step_confidence_score: number | null;
  still_needs_support: string[] | null;
  requested_service_after_counseling: string[] | null;
  follow_up_interest: string | null;
  open_feedback: string | null;
  anonymous_feedback: string | null;
  evaluation_submitted_at: string;
}

interface BranchInfo { id: string; name_th: string; name_en: string }
interface ServiceInfo { id: string; name_th: string; name_en: string }

type Priority = "urgent" | "follow_up" | "standard";
type DayBucket = "today" | "today_past" | "tomorrow" | "upcoming" | "walkin";
type TimeBucket = "morning" | "afternoon" | "evening" | "unspecified";
type QuickFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "this_week"
  | "urgent"
  | "not_reviewed"
  | "follow_up"
  | "completed";

// ────────────────────────────────────────────────────────────────
// Completed-like statuses (any of these should surface the post-eval QR).
// ────────────────────────────────────────────────────────────────
const COMPLETED_STATUSES: CaseStatus[] = ["counseling_completed", "case_closed"];
function isCompletedLike(status?: CaseStatus | string | null): boolean {
  if (!status) return false;
  return COMPLETED_STATUSES.includes(status as CaseStatus);
}

// ────────────────────────────────────────────────────────────────
// Priority & risk logic
// ────────────────────────────────────────────────────────────────
function computePriority(r: SurveyRow, note?: CaseNote): Priority {
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
// Date / time bucketing (Asia/Bangkok as source of truth)
// ────────────────────────────────────────────────────────────────
function bangkokTodayISO(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const d = parts.find(p => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function isWithinNextNDaysISO(iso: string, todayISO: string, n: number): boolean {
  const diff = (Date.parse(iso + "T00:00:00Z") - Date.parse(todayISO + "T00:00:00Z")) / 86400000;
  return diff >= 0 && diff <= n;
}
function dayBucket(dateISO: string | null, todayISO: string, source: string | null): DayBucket {
  const isWalkinSource = (source || "").toLowerCase().includes("walk");
  if (!dateISO || isWalkinSource) return "walkin";
  if (dateISO === todayISO) return "today";
  if (dateISO === addDaysISO(todayISO, 1)) return "tomorrow";
  if (dateISO > todayISO) return "upcoming";
  // past date: fold into upcoming so it's still visible
  return "upcoming";
}
function timeBucket(timeStr: string | null): TimeBucket {
  if (!timeStr) return "unspecified";
  const h = parseInt(timeStr.slice(0, 2), 10);
  if (isNaN(h)) return "unspecified";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
function formatShortTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5); // "HH:MM"
}
function formatDayLabel(iso: string | null, lang: string): string {
  if (!iso) return lang === "th" ? "ไม่ระบุวัน" : "No date";
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
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

const PRIORITY_META: Record<Priority, { pill: string; dot: string; label_th: string; label_en: string }> = {
  urgent:    { pill: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",     dot: "bg-rose-500",    label_th: "เร่งด่วน", label_en: "Urgent" },
  follow_up: { pill: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800", dot: "bg-amber-500",  label_th: "ติดตาม",   label_en: "Follow-up" },
  standard:  { pill: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", label_th: "ปกติ",     label_en: "Standard" },
};

const DAY_META: Record<DayBucket, { icon: React.ComponentType<{ className?: string }>; label_th: string; label_en: string; accent: string }> = {
  today:      { icon: CalendarDays,  label_th: "วันนี้ (ถัดไป)",  label_en: "Today (upcoming)", accent: "text-primary" },
  tomorrow:   { icon: Calendar,      label_th: "พรุ่งนี้", label_en: "Tomorrow", accent: "text-sky-600 dark:text-sky-400" },
  upcoming:   { icon: Calendar,      label_th: "เร็ว ๆ นี้", label_en: "Upcoming", accent: "text-violet-600 dark:text-violet-400" },
  today_past: { icon: Clock3,        label_th: "เมื่อสักครู่ (วันนี้)", label_en: "Earlier today", accent: "text-muted-foreground" },
  walkin:     { icon: Footprints,    label_th: "Walk-in / ไม่ระบุเวลา", label_en: "Walk-in / no time", accent: "text-muted-foreground" },
};

const TIME_META: Record<TimeBucket, { icon: React.ComponentType<{ className?: string }>; label_th: string; label_en: string; range: string }> = {
  morning:     { icon: Sunrise, label_th: "ช่วงเช้า",  label_en: "Morning",   range: "09:00–12:00" },
  afternoon:   { icon: Sun,     label_th: "ช่วงบ่าย",  label_en: "Afternoon", range: "12:00–17:00" },
  evening:     { icon: Sunset,  label_th: "ช่วงเย็น",  label_en: "Evening",   range: "17:00+" },
  unspecified: { icon: Clock3,  label_th: "ไม่ระบุเวลา", label_en: "No time", range: "—" },
};

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
  const [postEvals, setPostEvals] = useState<Record<string, PostEval>>({}); // keyed by note_id
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [branchFilter, setBranchFilter] = useState<string>("all"); // admin only
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");

  const todayISO = useMemo(() => bangkokTodayISO(), []);

  // Bangkok wall-clock time, ticked every minute so the queue rolls forward without refresh.
  const bangkokNow = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const h = parts.find(p => p.type === "hour")?.value ?? "00";
    const m = parts.find(p => p.type === "minute")?.value ?? "00";
    const s = parts.find(p => p.type === "second")?.value ?? "00";
    return `${h}:${m}:${s}`;
  };
  const [nowHHMMSS, setNowHHMMSS] = useState<string>(() => bangkokNow());
  useEffect(() => {
    const tick = () => setNowHHMMSS(bangkokNow());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Resolve staff branch (moderators/counselors only)
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      if (isAdmin || isMeAnalyst) { setStaffBranchId(null); return; }
      const { data } = await supabase
        .from("staff_profiles")
        .select("branch_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (data?.branch_id) { setStaffBranchId(data.branch_id); return; }
      if (userBranch) setStaffBranchId(userBranch);
    })();
  }, [user?.id, isAdmin, isMeAnalyst, userBranch]);

  // Load everything (surveys + notes + branches + services). RLS enforces scope.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let all: any[] = [];
      let from = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("appointment_pre_service_surveys")
          .select("*, appointments:booking_id(branch_id, appointment_date, start_time, user_id, service_id, source)")
          .order("created_at", { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) { console.error("COUNSELOR_SURVEYS_ERR", error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < BATCH) break;
        from += BATCH;
      }

      const [notesRes, brRes, svRes, peRes] = await Promise.all([
        supabase.from("pre_service_counseling_notes").select("*"),
        supabase.from("booking_branches").select("id, name_th, name_en"),
        supabase.from("booking_services").select("id, name_th, name_en"),
        supabase.from("post_counseling_evaluations").select("*"),
      ]);
      const map: Record<string, CaseNote> = {};
      ((notesRes.data as any[]) || []).forEach((n) => { map[n.survey_id] = n as CaseNote; });
      const peMap: Record<string, PostEval> = {};
      ((peRes.data as any[]) || []).forEach((e) => { peMap[e.note_id] = e as PostEval; });

      setSurveys(all as SurveyRow[]);
      setNotes(map);
      setPostEvals(peMap);
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

  useEffect(() => {
    let t: any = null;
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(() => load(), 300); };
    const channel = supabase
      .channel("admin-counselor-support-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_pre_service_surveys" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "pre_service_counseling_notes" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_counseling_evaluations" }, schedule)
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

  // Filter cases
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return surveys.filter((r) => {
      if (!isAdmin && !isMeAnalyst && staffBranchId && r.appointments?.branch_id !== staffBranchId) return false;
      if ((isAdmin || isMeAnalyst) && branchFilter !== "all" && r.appointments?.branch_id !== branchFilter) return false;

      const note = notes[r.id];
      const priority = computePriority(r, note);
      const status = note?.status || "not_reviewed";
      const dateISO = r.appointments?.appointment_date || null;
      const source = r.appointments?.source || null;
      const bucket = dayBucket(dateISO, todayISO, source);

      switch (quickFilter) {
        case "today":     if (bucket !== "today") return false; break;
        case "tomorrow":  if (bucket !== "tomorrow") return false; break;
        case "this_week": if (!dateISO || !isWithinNextNDaysISO(dateISO, todayISO, 6)) return false; break;
        case "urgent":    if (priority !== "urgent") return false; break;
        case "not_reviewed": if (status !== "not_reviewed") return false; break;
        case "follow_up": if (!(note?.follow_up_required || status === "follow_up_needed")) return false; break;
        case "completed": if (!(status === "counseling_completed" || status === "case_closed")) return false; break;
        case "all": default: break;
      }

      if (q) {
        const hay = `${r.uic_display || r.uic_code || ""} ${r.booking_id} ${branchName(r.appointments?.branch_id)} ${serviceName(r.appointments?.service_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [surveys, notes, isAdmin, isMeAnalyst, staffBranchId, branchFilter, quickFilter, search, language, todayISO]);

  // Group: DayBucket → TimeBucket → sorted list
  type GroupedTime = { key: TimeBucket; rows: SurveyRow[] };
  type GroupedDay = { key: DayBucket; date: string | null; times: GroupedTime[]; totalRows: number };

  const grouped = useMemo<GroupedDay[]>(() => {
    // Bucket rows by day + collect distinct dates within "upcoming"
    const byDay: Record<DayBucket, SurveyRow[]> = { today: [], today_past: [], tomorrow: [], upcoming: [], walkin: [] };
    filtered.forEach((r) => {
      const b = dayBucket(r.appointments?.appointment_date || null, todayISO, r.appointments?.source || null);
      if (b === "today") {
        // Split today into upcoming (>= now) vs earlier today (< now).
        // Rows without a start_time on today's date stay in "today" (unspecified bucket).
        const t = r.appointments?.start_time || null;
        if (t && t < nowHHMMSS) byDay.today_past.push(r);
        else byDay.today.push(r);
      } else {
        byDay[b].push(r);
      }
    });

    const buildTimes = (rows: SurveyRow[]): GroupedTime[] => {
      const byTime: Record<TimeBucket, SurveyRow[]> = { morning: [], afternoon: [], evening: [], unspecified: [] };
      rows.forEach((r) => byTime[timeBucket(r.appointments?.start_time || null)].push(r));
      (Object.keys(byTime) as TimeBucket[]).forEach((k) => {
        byTime[k].sort((a, b) => {
          const at = a.appointments?.start_time || "99:99:99";
          const bt = b.appointments?.start_time || "99:99:99";
          if (at !== bt) return at.localeCompare(bt);
          // tie-break: urgent first
          const pa = computePriority(a, notes[a.id]);
          const pb = computePriority(b, notes[b.id]);
          const order = { urgent: 0, follow_up: 1, standard: 2 } as const;
          return order[pa] - order[pb];
        });
      });
      return (["morning", "afternoon", "evening", "unspecified"] as const)
        .map((k) => ({ key: k, rows: byTime[k] }))
        .filter((g) => g.rows.length > 0);
    };

    // Descending time-order for "earlier today" so the most recently passed slot is on top.
    const buildTimesDesc = (rows: SurveyRow[]): GroupedTime[] => {
      const groups = buildTimes(rows);
      groups.forEach((g) => g.rows.reverse());
      // Reverse group order: evening → afternoon → morning → unspecified
      const orderKey: Record<TimeBucket, number> = { evening: 0, afternoon: 1, morning: 2, unspecified: 3 };
      groups.sort((a, b) => orderKey[a.key] - orderKey[b.key]);
      return groups;
    };

    const days: GroupedDay[] = [];

    // 1) Today's upcoming (from now forward)
    if (byDay.today.length) {
      days.push({ key: "today", date: todayISO, times: buildTimes(byDay.today), totalRows: byDay.today.length });
    }
    // 2) Tomorrow
    if (byDay.tomorrow.length) {
      days.push({ key: "tomorrow", date: addDaysISO(todayISO, 1), times: buildTimes(byDay.tomorrow), totalRows: byDay.tomorrow.length });
    }
    // 3) Upcoming days (and any past-dated rows folded here)
    if (byDay.upcoming.length) {
      const byDate = new Map<string, SurveyRow[]>();
      byDay.upcoming.forEach((r) => {
        const d = r.appointments?.appointment_date || "9999-12-31";
        const arr = byDate.get(d) || [];
        arr.push(r);
        byDate.set(d, arr);
      });
      Array.from(byDate.keys())
        .sort()
        .forEach((d) => {
          const rows = byDate.get(d)!;
          days.push({ key: "upcoming", date: d, times: buildTimes(rows), totalRows: rows.length });
        });
    }
    // 4) Earlier today (below active queue) — completed cases won't dominate the top.
    if (byDay.today_past.length) {
      days.push({ key: "today_past", date: todayISO, times: buildTimesDesc(byDay.today_past), totalRows: byDay.today_past.length });
    }
    // 5) Walk-ins / no time
    if (byDay.walkin.length) {
      days.push({ key: "walkin", date: null, times: buildTimes(byDay.walkin), totalRows: byDay.walkin.length });
    }

    return days;
  }, [filtered, todayISO, notes, nowHHMMSS]);


  // Branch summary KPIs (all visible surveys, RLS-scoped)
  const summary = useMemo(() => {
    const todayRows = surveys.filter((r) => (r.appointments?.appointment_date || null) === todayISO);
    const urgentAll = surveys.filter((r) => computePriority(r, notes[r.id]) === "urgent");
    const completed = surveys.filter((r) => notes[r.id]?.status === "counseling_completed" || notes[r.id]?.status === "case_closed");
    const pendingFollowUp = surveys.filter((r) => notes[r.id]?.follow_up_required || notes[r.id]?.status === "follow_up_needed");
    const referred = surveys.filter((r) => notes[r.id]?.status === "referred_to_clinic");
    const reviewed = surveys.map((r) => ({ r, n: notes[r.id] })).filter((x) => x.n && x.n.status !== "not_reviewed");
    const avgMinutes = reviewed.length
      ? reviewed.reduce((s, x) => s + (new Date(x.n!.updated_at).getTime() - new Date(x.r.created_at).getTime()), 0) / reviewed.length / 60000
      : 0;
    // Post-counseling analytics
    const evalRows = Object.values(postEvals);
    const evalCount = evalRows.length;
    const completedCount = completed.length;
    const evalRate = completedCount > 0 ? (evalCount / completedCount) * 100 : 0;
    const avg = (key: keyof PostEval) => {
      const vals = evalRows.map((e) => e[key] as number | null).filter((v): v is number => typeof v === "number");
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const followUpInterest = evalRows.filter((e) => e.follow_up_interest && e.follow_up_interest !== "no").length;

    return {
      todayCount: todayRows.length,
      urgent: urgentAll.length,
      completed: completed.length,
      followUp: pendingFollowUp.length,
      referred: referred.length,
      avgMinutes,
      evalCount,
      evalRate,
      avgSatisfaction: avg("satisfaction_score"),
      avgUnderstanding: avg("understanding_score"),
      avgSafety: avg("safety_score"),
      avgRespect: avg("respect_score"),
      avgClarity: avg("clarity_score"),
      avgNextStep: avg("next_step_confidence_score"),
      postFollowUpInterest: followUpInterest,
    };
  }, [surveys, notes, todayISO, postEvals]);

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
    if (patch.post_eval_token !== undefined) payload.post_eval_token = patch.post_eval_token;
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

  // Quick filter definitions (chips)
  const QUICK_FILTERS: { key: QuickFilter; th: string; en: string }[] = [
    { key: "all",          th: "ทั้งหมด",        en: "All" },
    { key: "today",        th: "วันนี้",         en: "Today" },
    { key: "tomorrow",     th: "พรุ่งนี้",       en: "Tomorrow" },
    { key: "this_week",    th: "สัปดาห์นี้",     en: "This week" },
    { key: "urgent",       th: "เร่งด่วน",       en: "Urgent" },
    { key: "not_reviewed", th: "ยังไม่ตรวจสอบ",  en: "Not yet reviewed" },
    { key: "follow_up",    th: "ต้องติดตาม",     en: "Follow-up" },
    { key: "completed",    th: "ให้คำปรึกษาแล้ว", en: "Completed" },
  ];

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
            {tx("ตารางเคสตามเวลานัดหมาย จัดกลุ่มตามวันและช่วงเวลา อัปเดตเรียลไทม์",
                "Cases ordered by appointment time, grouped by day and period, live updates")}
          </p>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-1 flex items-center gap-1">
            <QrCode className="h-3 w-3" />
            {tx("หลังปิดเคสด้วยสถานะ ‘Counseling completed’ กดปุ่ม ‘แสดง QR ประเมิน’ เพื่อเปิดหน้า QR ที่ปลอดภัยให้ผู้รับบริการสแกน",
                "After marking counseling as completed, click ‘Show evaluation QR’ to open a safe QR screen for the service user.")}
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
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label={tx("นัดวันนี้", "Booked today")} value={summary.todayCount} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label={tx("เร่งด่วน", "Urgent")} value={summary.urgent} tone="urgent" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label={tx("ให้คำปรึกษาแล้ว", "Completed")} value={summary.completed} tone="ok" />
        <KpiCard icon={<Clock3 className="h-4 w-4" />} label={tx("ต้องติดตาม", "Follow-up")} value={summary.followUp} tone="warn" />
        <KpiCard icon={<ArrowRightCircle className="h-4 w-4" />} label={tx("ส่งต่อคลินิก", "Referred")} value={summary.referred} />
        <KpiCard icon={<Users className="h-4 w-4" />} label={tx("เวลาตอบเฉลี่ย (นาที)", "Avg response (min)")} value={summary.avgMinutes ? summary.avgMinutes.toFixed(1) : "—"} />
      </div>

      {/* Post-counseling analytics */}
      <Card className="p-4 border-teal-200 bg-teal-50/30 dark:bg-teal-950/10">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-bold">{tx("ผลประเมินหลังรับคำปรึกษา", "Post-counseling evaluations")}</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {summary.evalCount} / {summary.completed} · {summary.evalRate.toFixed(0)}%
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          <MiniStat label={tx("ประเมินแล้ว", "Evaluated")} value={summary.evalCount} />
          <MiniStat label={tx("อัตราตอบ", "Response rate")} value={`${summary.evalRate.toFixed(0)}%`} />
          <MiniStat label={tx("พึงพอใจเฉลี่ย", "Avg satisfaction")} value={summary.avgSatisfaction?.toFixed(1) ?? "—"} />
          <MiniStat label={tx("เข้าใจเฉลี่ย", "Avg understanding")} value={summary.avgUnderstanding?.toFixed(1) ?? "—"} />
          <MiniStat label={tx("ปลอดภัย/เชื่อใจ", "Avg safety")} value={summary.avgSafety?.toFixed(1) ?? "—"} />
          <MiniStat label={tx("เคารพ", "Avg respect")} value={summary.avgRespect?.toFixed(1) ?? "—"} />
          <MiniStat label={tx("อยากติดตามต่อ", "Wants follow-up")} value={summary.postFollowUpInterest} />
        </div>
      </Card>


      {/* Filters bar */}
      <Card className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tx("ค้นหา UIC / บริการ / สาขา", "Search UIC / service / branch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9"
          />
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
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={quickFilter === f.key ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setQuickFilter(f.key)}
            >
              {tx(f.th, f.en)}
            </Button>
          ))}
        </div>
      </Card>

      {/* Queue by day + time */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto opacity-40 mb-2" />
          <div className="font-medium">{tx("ไม่พบเคสตามเงื่อนไข", "No cases match the current filters")}</div>
          <div className="text-xs mt-1">{tx("ลองเปลี่ยนตัวกรอง หรือรอเคสใหม่", "Try changing filters or wait for new cases")}</div>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((day, idx) => (
            <DaySection
              key={`${day.key}-${day.date ?? "walkin"}-${idx}`}
              day={day}
              notes={notes}
              postEvals={postEvals}
              language={language}
              tx={tx}
              branchName={branchName}
              serviceName={serviceName}
              readOnly={readOnly}
              onSave={saveNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// DaySection
// ────────────────────────────────────────────────────────────────
function DaySection({
  day, notes, postEvals, language, tx, branchName, serviceName, readOnly, onSave,
}: {
  day: { key: DayBucket; date: string | null; times: { key: TimeBucket; rows: SurveyRow[] }[]; totalRows: number };
  notes: Record<string, CaseNote>;
  postEvals: Record<string, PostEval>;
  language: string;
  tx: (th: string, en: string) => string;
  branchName: (id: string | null | undefined) => string;
  serviceName: (id: string | null | undefined) => string;
  readOnly: boolean;
  onSave: (surveyId: string, patch: Partial<CaseNote>) => void | Promise<void>;
}) {
  const meta = DAY_META[day.key];
  const Icon = meta.icon;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b pb-2">
        <Icon className={`h-5 w-5 ${meta.accent}`} />
        <div className="flex-1">
          <div className={`text-lg font-bold ${meta.accent}`}>
            {language === "th" ? meta.label_th : meta.label_en}
            {day.date && day.key !== "today" && day.key !== "tomorrow" && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {formatDayLabel(day.date, language)}
              </span>
            )}
            {day.date && (day.key === "today" || day.key === "tomorrow") && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                · {formatDayLabel(day.date, language)}
              </span>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {day.totalRows} {tx("เคส", "cases")}
        </Badge>
      </div>

      <div className="space-y-5">
        {day.times.map((slot) => (
          <TimeSlot
            key={`${day.key}-${slot.key}`}
            dayKey={day.key}
            slot={slot}
            notes={notes}
            postEvals={postEvals}
            language={language}
            tx={tx}
            branchName={branchName}
            serviceName={serviceName}
            readOnly={readOnly}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}

function TimeSlot({
  dayKey, slot, notes, postEvals, language, tx, branchName, serviceName, readOnly, onSave,
}: {
  dayKey: DayBucket;
  slot: { key: TimeBucket; rows: SurveyRow[] };
  notes: Record<string, CaseNote>;
  postEvals: Record<string, PostEval>;
  language: string;
  tx: (th: string, en: string) => string;
  branchName: (id: string | null | undefined) => string;
  serviceName: (id: string | null | undefined) => string;
  readOnly: boolean;
  onSave: (surveyId: string, patch: Partial<CaseNote>) => void | Promise<void>;
}) {
  const meta = TIME_META[slot.key];
  const Icon = meta.icon;

  const urgent = slot.rows.filter((r) => computePriority(r, notes[r.id]) === "urgent").length;
  const completed = slot.rows.filter((r) => {
    const s = notes[r.id]?.status;
    return s === "counseling_completed" || s === "case_closed";
  }).length;
  const followUp = slot.rows.filter((r) => {
    const n = notes[r.id];
    return n?.follow_up_required || n?.status === "follow_up_needed";
  }).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap px-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">
          {language === "th" ? meta.label_th : meta.label_en}
        </span>
        <span className="text-xs text-muted-foreground">{meta.range}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <StatChip label={tx("ทั้งหมด", "Total")} value={slot.rows.length} />
          {urgent > 0 && <StatChip label={tx("เร่งด่วน", "Urgent")} value={urgent} tone="urgent" />}
          {completed > 0 && <StatChip label={tx("เสร็จ", "Done")} value={completed} tone="ok" />}
          {followUp > 0 && <StatChip label={tx("ติดตาม", "Follow")} value={followUp} tone="warn" />}
        </div>
      </div>
      <div className="space-y-2">
        {slot.rows.map((r) => {
          const n = notes[r.id];
          const pe = n ? postEvals[n.id] : undefined;
          return (
            <CasePanel
              key={r.id}
              row={r}
              note={n}
              postEval={pe}
              dayKey={dayKey}
              branchName={branchName}
              serviceName={serviceName}
              tx={tx}
              readOnly={readOnly}
              onSave={(patch) => onSave(r.id, patch)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Small components
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

function StatChip({ label, value, tone }: {
  label: string; value: number; tone?: "urgent" | "warn" | "ok";
}) {
  const cls =
    tone === "urgent" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
    : tone === "warn" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    : tone === "ok"   ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// CasePanel — collapsible row
// ────────────────────────────────────────────────────────────────
function CasePanel({
  row, note, postEval, dayKey, branchName, serviceName, tx, readOnly, onSave,
}: {
  row: SurveyRow;
  note?: CaseNote;
  postEval?: PostEval;
  dayKey: DayBucket;
  branchName: (id: string | null | undefined) => string;
  serviceName: (id: string | null | undefined) => string;
  tx: (th: string, en: string) => string;
  readOnly: boolean;
  onSave: (patch: Partial<CaseNote>) => void | Promise<void>;
}) {
  const priority = computePriority(row, note);
  const meta = PRIORITY_META[priority];
  const status: CaseStatus = note?.status || "not_reviewed";
  const isFirst = row.visit_sequence === 1;
  const isAnon = !row.appointments?.user_id;
  const identifier = row.uic_display || row.uic_code || `#${row.id.slice(0, 8)}`;
  const timeLabel = formatShortTime(row.appointments?.start_time || null);
  const concern = row.suggestions?.trim() || (
    row.mental_health_interest === "yes" ? tx("สนใจสุขภาพจิต", "Mental-health interest") :
    row.confidence !== null && row.confidence <= 2 ? tx("ความมั่นใจต่ำ", "Low confidence") :
    row.safety !== null && row.safety <= 2 ? tx("ความปลอดภัยต่ำ", "Safety concern") :
    tx("ยังไม่มีข้อกังวลระบุ", "No specific concern")
  );

  const [open, setOpen] = useState(priority === "urgent" && dayKey === "today");
  const [notesDraft, setNotesDraft] = useState(note?.notes || "");
  const [nextStepDraft, setNextStepDraft] = useState(note?.next_step || "");
  const [followUp, setFollowUp] = useState<boolean>(!!note?.follow_up_required);
  const [statusDraft, setStatusDraft] = useState<CaseStatus>(status);
  const [saving, setSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const latestRef = useRef({ notesDraft, nextStepDraft, followUp, statusDraft });
  latestRef.current = { notesDraft, nextStepDraft, followUp, statusDraft };

  useEffect(() => {
    // Hydrate from server only when not dirty locally, to avoid clobbering unsaved edits.
    if (dirtyRef.current || savingRef.current) return;
    setNotesDraft(note?.notes || "");
    setNextStepDraft(note?.next_step || "");
    setFollowUp(!!note?.follow_up_required);
    setStatusDraft(note?.status || "not_reviewed");
  }, [note?.id, note?.updated_at]);

  const doSave = async () => {
    if (readOnly) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const { notesDraft: n, nextStepDraft: ns, followUp: fu, statusDraft: st } = latestRef.current;
      await onSave({
        notes: n || null,
        next_step: ns || null,
        follow_up_required: fu,
        status: st,
      });
      dirtyRef.current = false;
      setDirty(false);
      setAutoSavedAt(Date.now());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const markDirtyAndSchedule = () => {
    dirtyRef.current = true;
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void doSave(); }, 1200);
  };

  // Flush pending save on unmount / collapse
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (dirtyRef.current) void doSave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    await doSave();
  };

  const topics = suggestTopics(row, tx);
  const suggested = suggestNextStep(row, tx);
  const risk = riskLabel(row);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left hover:bg-muted/40 transition-colors"
          >
            <div className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
              {/* Priority stripe + time */}
              <div className="flex flex-col items-center min-w-[64px] md:min-w-[80px]">
                <div className={`w-2 h-2 rounded-full ${meta.dot} mb-1`} />
                <div className="text-lg md:text-xl font-bold tabular-nums leading-tight">
                  {timeLabel}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {row.appointments?.appointment_date
                    ? tx("นัด", "Booked")
                    : tx("ไม่ระบุ", "Walk-in")}
                </div>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-sm">{identifier}</span>
                  <Badge variant="outline" className={`text-[10px] ${meta.pill}`}>
                    {tx(meta.label_th, meta.label_en)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {isFirst ? tx("ครั้งแรก", "First visit") : `#${row.visit_sequence} ${tx("กลับซ้ำ", "Repeat")}`}
                  </Badge>
                  {isAnon && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {tx("ไม่ระบุตัวตน", "Anonymous")}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <Building2 className="h-3 w-3" />
                  <span>{branchName(row.appointments?.branch_id)}</span>
                  <span>•</span>
                  <span>{serviceName(row.appointments?.service_id)}</span>
                </div>
                <div className="text-xs text-foreground/80 line-clamp-1">
                  <span className="text-muted-foreground">{tx("ประเด็นสำคัญ", "Key concern")}: </span>
                  {concern}
                </div>
              </div>

              {/* Status + expand */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {tx(STATUS_LABELS[status].th, STATUS_LABELS[status].en)}
                </Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 md:px-4 pb-4 pt-1 border-t space-y-4">
            {/* Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Indicator label={tx("ความเสี่ยง", "Risk")} value={risk} tone={risk === "high" ? "urgent" : risk === "medium" ? "warn" : "ok"} />
              <Indicator label={tx("ความมั่นใจ", "Confidence")} value={row.confidence !== null ? `${row.confidence}/5` : "—"} />
              <Indicator label={tx("ความปลอดภัย", "Safety")} value={row.safety !== null ? `${row.safety}/5` : "—"} />
              <Indicator label={tx("สุขภาพจิต", "Mental health")} value={row.mental_health_interest || "—"} tone={row.mental_health_interest === "yes" ? "urgent" : row.mental_health_interest === "maybe" ? "warn" : undefined} />
            </div>

            {row.suggestions && (
              <div className="text-xs bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md p-3">
                <div className="font-semibold text-teal-800 dark:text-teal-200 mb-1">
                  {tx("ข้อเสนอแนะจากผู้รับบริการ", "Client suggestions")}
                </div>
                <div className="whitespace-pre-wrap">{row.suggestions}</div>
              </div>
            )}

            {/* Guidance */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs font-semibold mb-1">
                  {tx("หัวข้อที่แนะนำให้พูดคุย", "Suggested counseling topics")}
                </div>
                <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                  {topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs font-semibold mb-1">
                  {tx("ขั้นตอนถัดไปที่แนะนำ", "Recommended next step")}
                </div>
                <div className="text-xs text-muted-foreground">{suggested}</div>
              </div>
            </div>

            {/* Counselor input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold block">
                {tx("บันทึกของผู้ให้คำปรึกษา", "Counselor note")}
              </label>
              <Textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => { setNotesDraft(e.target.value); markDirtyAndSchedule(); }}
                placeholder={tx("บันทึกอย่างสุภาพและไม่ตัดสิน…", "Write a supportive, non-judgmental note…")}
                disabled={readOnly}
              />
              <label className="text-xs font-semibold block">{tx("ขั้นตอนถัดไป", "Next step")}</label>
              <Input
                value={nextStepDraft}
                onChange={(e) => { setNextStepDraft(e.target.value); markDirtyAndSchedule(); }}
                placeholder={tx("เช่น นัด PrEP counsel สัปดาห์หน้า", "e.g. Schedule PrEP counseling next week")}
                disabled={readOnly}
              />
              <div className="grid md:grid-cols-2 gap-2 items-start">
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">{tx("อัปเดตสถานะ", "Update status")}</label>
                  <select
                    value={statusDraft}
                    onChange={(e) => { setStatusDraft(e.target.value as CaseStatus); markDirtyAndSchedule(); }}
                    className="h-9 px-3 rounded-md border bg-background text-sm w-full"
                    disabled={readOnly}
                  >
                    {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
                      <option key={s} value={s}>{tx(STATUS_LABELS[s].th, STATUS_LABELS[s].en)}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs mt-6">
                  <Switch
                    checked={followUp}
                    onCheckedChange={(v) => { setFollowUp(v); markDirtyAndSchedule(); }}
                    disabled={readOnly}
                  />
                  {tx("ต้องติดตามภายหลัง", "Requires follow-up")}
                </label>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {saving ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />{tx("กำลังบันทึกอัตโนมัติ…", "Autosaving…")}</>
                  ) : dirty ? (
                    tx("มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก…", "Unsaved changes…")
                  ) : autoSavedAt ? (
                    `${tx("บันทึกอัตโนมัติแล้ว", "Autosaved")} • ${new Date(autoSavedAt).toLocaleTimeString()}`
                  ) : note?.updated_at ? (
                    `${tx("อัปเดตล่าสุด", "Last updated")}: ${new Date(note.updated_at).toLocaleString()}`
                  ) : (
                    tx("ยังไม่มีบันทึก", "No notes yet")
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleSave} disabled={readOnly || saving || !dirty}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  {tx("บันทึกทันที", "Save now")}
                </Button>
              </div>
            </div>

            {/* Post-counseling QR + evaluation.
                Visible when case is completed-like OR a token already exists (defensive),
                and also offers a manual "Generate QR" fallback for other statuses. */}
            <PostCounselingSection
              note={note}
              postEval={postEval}
              survey={row}
              surveyId={row.id}
              statusDraft={statusDraft}
              readOnly={readOnly}
              onSave={onSave}
              tx={tx}
            />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Indicator({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: "urgent" | "warn" | "ok";
}) {
  const cls =
    tone === "urgent" ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-200"
    : tone === "warn" ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200"
    : tone === "ok"   ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200"
    : "border-border bg-muted/30";
  return (
    <div className={`rounded-md border px-2 py-1.5 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-semibold text-xs mt-0.5">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-teal-200/60 bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function PrePostCompare({
  survey, postEval, tx,
}: {
  survey?: SurveyRow;
  postEval: PostEval;
  tx: (th: string, en: string) => string;
}) {
  const preConcerns: { label: string; value: string }[] = [];
  if (survey) {
    if (survey.mental_health_interest === "yes")
      preConcerns.push({ label: tx("สุขภาพจิต", "Mental health"), value: tx("สนใจ", "Interested") });
    if (survey.recommend)
      preConcerns.push({ label: tx("แนะนำ", "Recommend"), value: survey.recommend });
    if (survey.suggestions?.trim())
      preConcerns.push({ label: tx("ข้อกังวล", "Concern"), value: survey.suggestions.trim() });
  }

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
    <div className="rounded-md border bg-background/70 p-3 space-y-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {tx("เปรียบเทียบก่อน–หลังคำปรึกษา", "Pre vs. post-counseling comparison")}
      </div>

      {preConcerns.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tx("ข้อกังวลก่อนรับคำปรึกษา", "Pre-counseling concerns")}
          </div>
          <ul className="text-xs space-y-0.5">
            {preConcerns.map((c, i) => (
              <li key={i}><span className="font-semibold">{c.label}:</span> {c.value}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-2 py-1 font-semibold">{tx("มิติ", "Dimension")}</th>
              <th className="px-2 py-1 font-semibold text-center">{tx("ก่อน", "Pre")}</th>
              <th className="px-2 py-1 font-semibold text-center">{tx("หลัง", "Post")}</th>
              <th className="px-2 py-1 font-semibold text-center">Δ</th>
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
                  <td className={`px-2 py-1 text-center tabular-nums font-bold ${deltaColor(delta)}`}>
                    {deltaLabel(delta)}
                  </td>
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
    </div>
  );
}

function PostCounselingSection({
  note, postEval, survey, surveyId, statusDraft, readOnly, onSave, tx,
}: {
  note?: CaseNote;
  postEval?: PostEval;
  survey?: SurveyRow;
  surveyId: string;
  statusDraft: CaseStatus;
  readOnly: boolean;
  onSave: (patch: Partial<CaseNote>) => void | Promise<void>;
  tx: (th: string, en: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const completedLike = isCompletedLike(statusDraft) || isCompletedLike(note?.status);
  const hasToken = !!note?.post_eval_token;

  // Hide entirely only when the section provides no value: not completed AND no token
  // AND we can't offer a generate action (read-only).
  if (!completedLike && !hasToken && readOnly) return null;

  const generate = async () => {
    if (readOnly || generating) return;
    setGenerating(true);
    try {
      const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await onSave({ post_eval_token: token });
      toast({ title: tx("สร้าง QR แล้ว", "QR link generated") });
    } catch (e: any) {
      toast({ title: tx("สร้างไม่สำเร็จ", "Could not generate"), description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // No token yet — show a call-to-action panel so the counselor can mint one.
  if (!hasToken) {
    return (
      <div className="rounded-lg border-2 border-dashed border-teal-300/70 bg-teal-50/30 dark:bg-teal-950/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-teal-600" />
          <div className="text-sm font-bold text-teal-800 dark:text-teal-200">
            {tx("แบบประเมินหลังรับคำปรึกษา", "Post-counseling evaluation")}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {completedLike
            ? tx("ยังไม่มีลิงก์ QR สำหรับเคสนี้ กด ‘สร้าง QR ประเมิน’ เพื่อสร้างทันที",
                 "No QR link for this case yet. Click ‘Generate evaluation QR’ to create one now.")
            : tx("เคสนี้ยังไม่ได้ปิด — สามารถสร้าง QR ล่วงหน้าให้ผู้รับบริการประเมินได้",
                 "This case isn’t marked completed yet — you can still generate a QR for the client to evaluate.")}
        </p>
        <Button
          size="sm"
          variant={completedLike ? "default" : "outline"}
          className={completedLike ? "h-8 bg-teal-600 hover:bg-teal-700" : "h-8"}
          onClick={generate}
          disabled={readOnly || generating}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <QrCode className="h-3.5 w-3.5 mr-1" />}
          {tx("สร้าง QR ประเมิน", "Generate evaluation QR")}
        </Button>
      </div>
    );
  }


  const formUrl = `${window.location.origin}/post-counseling/${note.post_eval_token}`;
  const qrPageUrl = `${window.location.origin}/post-counseling-qr/${note.post_eval_token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  const submitted = !!postEval;

  return (
    <div className="rounded-lg border-2 border-teal-200 bg-teal-50/40 dark:bg-teal-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <QrCode className="h-4 w-4 text-teal-600" />
        <div className="text-sm font-bold text-teal-800 dark:text-teal-200">
          {tx("แบบประเมินหลังรับคำปรึกษา", "Post-counseling evaluation")}
        </div>
        <Badge variant={submitted ? "default" : "outline"} className={`ml-auto text-[10px] ${submitted ? "bg-teal-600" : ""}`}>
          {submitted
            ? tx("ส่งแล้ว", "Submitted")
            : tx("QR พร้อมใช้ · ยังไม่ได้ส่ง", "QR ready · not submitted")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border bg-background/60 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {tx("สถานะ QR", "QR status")}
          </div>
          <div className="font-semibold mt-0.5">
            {submitted
              ? tx("ประเมินเสร็จสิ้น", "Evaluation completed")
              : tx("พร้อมแสดงให้ผู้รับบริการสแกน", "Ready to show to client")}
          </div>
        </div>
        <div className="rounded-md border bg-background/60 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {tx("เวลาที่ส่ง", "Submitted at")}
          </div>
          <div className="font-semibold mt-0.5">
            {submitted && postEval?.evaluation_submitted_at
              ? new Date(postEval.evaluation_submitted_at).toLocaleString()
              : "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="h-8 bg-teal-600 hover:bg-teal-700"
          onClick={() => window.open(qrPageUrl, "_blank", "noopener,noreferrer")}
        >
          <QrCode className="h-3.5 w-3.5 mr-1" />
          {tx("แสดง QR ประเมิน", "Show evaluation QR")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => window.open(formUrl, "_blank", "noopener,noreferrer")}
        >
          {tx("เปิดแบบประเมิน", "Open evaluation form")}
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={copy}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          {copied ? tx("คัดลอกแล้ว", "Copied") : tx("คัดลอกลิงก์", "Copy link")}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {tx("🔒 QR จะเปิดในหน้าใหม่ที่ไม่มีข้อมูลผู้รับบริการหรือแดชบอร์ด สามารถหันจอให้ผู้รับบริการสแกนได้อย่างปลอดภัย",
            "🔒 The QR opens in a clean page with no client info or dashboard — safe to show the client for scanning.")}
      </p>

      {submitted && postEval && (
        <div className="pt-3 border-t space-y-3">
          <div className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tx("ผลประเมินที่ได้รับ", "Received evaluation")}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            <MiniStat label={tx("พึงพอใจ", "Satisfaction")} value={postEval.satisfaction_score ?? "—"} />
            <MiniStat label={tx("เข้าใจ", "Understand")} value={postEval.understanding_score ?? "—"} />
            <MiniStat label={tx("ปลอดภัย", "Safety")} value={postEval.safety_score ?? "—"} />
            <MiniStat label={tx("เคารพ", "Respect")} value={postEval.respect_score ?? "—"} />
            <MiniStat label={tx("ชัดเจน", "Clarity")} value={postEval.clarity_score ?? "—"} />
            <MiniStat label={tx("รู้ขั้นถัดไป", "Next-step")} value={postEval.next_step_confidence_score ?? "—"} />
          </div>
          <PrePostCompare survey={survey} postEval={postEval} tx={tx} />
          {(postEval.still_needs_support?.length ?? 0) > 0 && (
            <div className="text-xs">
              <span className="font-semibold">{tx("ยังต้องการ", "Still needs")}: </span>
              {postEval.still_needs_support!.join(", ")}
            </div>
          )}
          {(postEval.requested_service_after_counseling?.length ?? 0) > 0 && (
            <div className="text-xs">
              <span className="font-semibold">{tx("บริการที่อยากได้ต่อ", "Requested next service")}: </span>
              {postEval.requested_service_after_counseling!.join(", ")}
            </div>
          )}
          {postEval.follow_up_interest && (
            <div className="text-xs">
              <span className="font-semibold">{tx("ความตั้งใจติดตามคำแนะนำ", "Intent to follow")}: </span>
              {postEval.follow_up_interest}
            </div>
          )}
          {postEval.open_feedback && (
            <div className="text-xs bg-background/60 rounded-md p-2 border">
              <div className="font-semibold mb-0.5">{tx("ข้อเสนอแนะ", "Feedback")}</div>
              <div className="whitespace-pre-wrap">{postEval.open_feedback}</div>
            </div>
          )}
          {postEval.anonymous_feedback && (
            <div className="text-xs bg-background/60 rounded-md p-2 border">
              <div className="font-semibold mb-0.5">{tx("ความคิดเห็นแบบไม่ระบุตัวตน", "Anonymous feedback")}</div>
              <div className="whitespace-pre-wrap">{postEval.anonymous_feedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



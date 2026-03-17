import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Download, MapPin, AlertTriangle, TrendingUp, BarChart3, Shield, Lightbulb, Eye, Filter, RotateCcw, List, LayoutGrid, Table2, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import OutreachPopulationMap from "./OutreachPopulationMap";

// ── Types ───────────────────────────────────────────────────────────
interface UnifiedRecord {
  id: string;
  source: "field_note" | "rapid_msw" | "unified_form";
  date: string;
  city: string;
  area: string;
  venue: string;
  observer: string;
  msw_count: string;
  nationality_groups: string[];
  nationality_other: string;
  communication_barrier: string;
  urgency_level: string;
  service_interests: string[];
  service_barriers: string[];
  project_implications: string[];
  chemsex_signal: string;
  mental_health_signal: string;
  violence_signal: string;
  is_hotspot: boolean;
  confidence: string;
  informant_type: string[];
  thai_proficiency: string;
  primary_languages: string[];
  comm_channels: string[];
  health_languages: string[];
  offsite_proportion: string;
  offsite_nationalities: string[];
  map_lat: number | null;
  map_lng: number | null;
  raw: any;
}

const SOURCE_TABLE_MAP: Record<string, string> = {
  field_note: "field_notes",
  rapid_msw: "msw_rapid_assessments",
  unified_form: "outreach_situational_forms",
};

const normalizeCity = (c: string) => {
  if (!c) return "ไม่ระบุ";
  if (c.includes("กรุงเทพ") || c === "bangkok") return "กรุงเทพฯ";
  if (c.includes("พัทยา") || c.includes("ชลบุรี") || c === "pattaya_chonburi") return "พัทยา";
  return c;
};

// Color palette for charts
const CHART_COLORS = [
  "bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500", "bg-teal-500"
];

export default function MelCombinedDashboard() {
  const { user } = useAuth();
  const { isAdmin, isModerator, readOnly } = useAdminRole();
  const qc = useQueryClient();
  const canDelete = (isAdmin || isModerator) && !readOnly;

  const [filterCity, setFilterCity] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [viewItem, setViewItem] = useState<UnifiedRecord | null>(null);
  const [viewMode, setViewMode] = useState<"charts" | "cards" | "table">("charts");

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<UnifiedRecord | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");

  const { data: fieldNotes, isLoading: l1 } = useQuery({
    queryKey: ["mel-combined-field-notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("field_notes" as any).select("*").eq("is_draft", false).order("visit_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: rapidMsw, isLoading: l2 } = useQuery({
    queryKey: ["mel-combined-rapid-msw"],
    queryFn: async () => {
      const { data, error } = await supabase.from("msw_rapid_assessments" as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: unifiedForms, isLoading: l3 } = useQuery({
    queryKey: ["mel-combined-unified"],
    queryFn: async () => {
      const { data, error } = await supabase.from("outreach_situational_forms" as any).select("*").eq("is_draft", false).order("survey_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = l1 || l2 || l3;

  // ── Delete single record ──
  const deleteSingleMutation = useMutation({
    mutationFn: async (record: UnifiedRecord) => {
      const table = SOURCE_TABLE_MAP[record.source];
      const { error } = await supabase.from(table as any).delete().eq("id", record.id);
      if (error) throw error;
      // Audit log
      await supabase.from("mel_deletion_audit" as any).insert({
        deleted_by: user?.id || null,
        action_type: "single_delete",
        source_table: table,
        record_id: record.id,
        record_count: 1,
        metadata: { city: record.city, area: record.area, date: record.date },
      } as any);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("ลบข้อมูลสำเร็จ");
      setDeleteTarget(null);
      setViewItem(null);
    },
    onError: () => toast.error("ลบไม่สำเร็จ กรุณาลองใหม่"),
  });

  // ── Clear all records ──
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const tables = ["field_notes", "msw_rapid_assessments", "outreach_situational_forms"] as const;
      let totalDeleted = 0;
      for (const table of tables) {
        const { data: existing } = await supabase.from(table as any).select("id").limit(1000);
        const count = existing?.length || 0;
        if (count > 0) {
          const { error } = await supabase.from(table as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) throw error;
          totalDeleted += count;
        }
      }
      // Audit log
      await supabase.from("mel_deletion_audit" as any).insert({
        deleted_by: user?.id || null,
        action_type: "clear_all",
        source_table: "all_outreach",
        record_id: null,
        record_count: totalDeleted,
        metadata: { tables: tables },
      } as any);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("ล้างข้อมูลทั้งหมดสำเร็จ");
      setClearAllOpen(false);
      setClearAllConfirmText("");
      // Clear drafts too
      localStorage.removeItem("unified-outreach-draft");
    },
    onError: () => toast.error("ล้างข้อมูลไม่สำเร็จ กรุณาลองใหม่"),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["mel-combined-field-notes"] });
    qc.invalidateQueries({ queryKey: ["mel-combined-rapid-msw"] });
    qc.invalidateQueries({ queryKey: ["mel-combined-unified"] });
    qc.invalidateQueries({ queryKey: ["outreach-situational"] });
    qc.invalidateQueries({ queryKey: ["mel-combined-dashboard"] });
  };

  // Normalize all records
  const allRecords = useMemo<UnifiedRecord[]>(() => {
    const records: UnifiedRecord[] = [];
    (fieldNotes || []).forEach((fn: any) => {
      records.push({
        id: fn.id, source: "field_note", date: fn.visit_date,
        city: normalizeCity(fn.city), area: fn.area_name || "", venue: fn.venue_alias || "",
        observer: fn.observer_name || "", msw_count: String(fn.estimated_msw_seen || ""),
        nationality_groups: fn.main_nationality_groups ? fn.main_nationality_groups.split(/[,\s]+/).filter(Boolean) : [],
        nationality_other: "", communication_barrier: fn.communication_barrier_level || "ไม่มี",
        urgency_level: "normal", service_interests: [], service_barriers: [],
        project_implications: fn.project_implications || [],
        chemsex_signal: "ไม่พบ", mental_health_signal: "ไม่พบ", violence_signal: "ไม่พบ",
        is_hotspot: false, confidence: "medium",
        informant_type: fn.info_sources ? (Array.isArray(fn.info_sources) ? fn.info_sources : [fn.info_sources]) : [],
        thai_proficiency: "", primary_languages: [], comm_channels: [],
        health_languages: [],
        offsite_proportion: "", offsite_nationalities: [],
        map_lat: null, map_lng: null, raw: fn,
      });
    });
    (rapidMsw || []).forEach((r: any) => {
      records.push({
        id: r.id, source: "rapid_msw", date: r.survey_date,
        city: normalizeCity(r.venue_code), area: r.bangkok_area || r.pattaya_area || "",
        venue: r.venue_type || "", observer: r.email || "",
        msw_count: r.msw_count_estimate || "",
        nationality_groups: Array.isArray(r.foreign_groups) ? r.foreign_groups : [],
        nationality_other: "", communication_barrier: r.language_skill === "other_language_primary" ? "มีมาก" : "ไม่มี",
        urgency_level: "normal", service_interests: [], service_barriers: [],
        project_implications: [], chemsex_signal: "ไม่พบ", mental_health_signal: "ไม่พบ",
        violence_signal: "ไม่พบ", is_hotspot: false, confidence: "medium",
        informant_type: r.respondent_type ? [r.respondent_type] : [],
        thai_proficiency: r.language_skill || "", primary_languages: r.other_primary_language ? [r.other_primary_language] : [],
        comm_channels: r.health_info_channel ? (Array.isArray(r.health_info_channel) ? r.health_info_channel : [r.health_info_channel]) : [],
        health_languages: [],
        offsite_proportion: "", offsite_nationalities: [],
        map_lat: null, map_lng: null, raw: r,
      });
    });
    (unifiedForms || []).forEach((u: any) => {
      records.push({
        id: u.id, source: "unified_form", date: u.survey_date,
        city: normalizeCity(u.city), area: u.area_name || "",
        venue: u.venue_alias || u.venue_type || "", observer: u.observer_name || "",
        msw_count: u.msw_estimated_range || u.estimated_msw_count || "",
        nationality_groups: u.nationality_groups || [], nationality_other: u.nationality_other || "",
        communication_barrier: u.communication_barrier_level || "ไม่มี",
        urgency_level: u.urgency_level || "normal",
        service_interests: u.service_interests || [], service_barriers: u.service_barriers || [],
        project_implications: u.project_implications || [],
        chemsex_signal: u.chemsex_signal || "ไม่พบ",
        mental_health_signal: u.mental_health_signal || "ไม่พบ",
        violence_signal: u.violence_safety_signal || "ไม่พบ",
        is_hotspot: u.is_known_hotspot || u.is_emerging_hotspot || false,
        confidence: u.confidence_level || "medium",
        informant_type: u.informant_type || [],
        thai_proficiency: u.thai_proficiency || "",
        primary_languages: u.primary_languages || [],
        comm_channels: u.comm_channels || [],
        health_languages: u.health_languages || [],
        offsite_proportion: u.offsite_proportion || "",
        offsite_nationalities: u.offsite_nationalities || [],
        map_lat: u.map_lat || null, map_lng: u.map_lng || null,
        raw: u,
      });
    });
    return records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [fieldNotes, rapidMsw, unifiedForms]);

  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      if (filterCity !== "all" && r.city !== filterCity) return false;
      if (filterSource !== "all" && r.source !== filterSource) return false;
      return true;
    });
  }, [allRecords, filterCity, filterSource]);

  // ── Stats ──
  const total = allRecords.length;
  const bkkCount = allRecords.filter((r) => r.city === "กรุงเทพฯ").length;
  const ptyCount = allRecords.filter((r) => r.city === "พัทยา").length;
  const hotspotCount = allRecords.filter((r) => r.is_hotspot).length;
  const highBarrierCount = allRecords.filter((r) => r.communication_barrier === "มีมาก").length;
  const pinnedCount = filtered.filter((r) => r.map_lat && r.map_lng).length;

  const areaRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { if (r.area) map[r.area] = (map[r.area] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const nationalityDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.nationality_groups.forEach((g) => { if (g) map[g] = (map[g] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const informantDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.informant_type.forEach((t) => { if (t) map[t] = (map[t] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const proficiencyDist = useMemo(() => {
    const map: Record<string, number> = { "fluent": 0, "basic": 0, "other_primary": 0 };
    const labels: Record<string, string> = { "fluent": "สื่อสารได้ดี", "basic": "พื้นฐาน", "other_primary": "ใช้ภาษาอื่น" };
    filtered.forEach((r) => { if (r.thai_proficiency && map[r.thai_proficiency] !== undefined) map[r.thai_proficiency]++; });
    return Object.entries(map).filter(([, v]) => v > 0).map(([k, v]) => [labels[k] || k, v] as [string, number]);
  }, [filtered]);

  const channelDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.comm_channels.forEach((c) => { if (c) map[c] = (map[c] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const healthLangDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.health_languages.forEach((l) => { if (l) map[l] = (map[l] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const offsiteDist = useMemo(() => {
    const labels: Record<string, string> = {
      unknown: "ไม่รู้", none: "ไม่มี", low: "ต่ำ (<25%)",
      medium: "ปานกลาง (25-50%)", medium_high: "ค่อนข้างสูง (50-75%)", high: "สูง (>75%)"
    };
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.offsite_proportion) {
        const label = labels[r.offsite_proportion] || r.offsite_proportion;
        map[label] = (map[label] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const signalCounts = useMemo(() => {
    let chemsex = 0, mh = 0, violence = 0;
    filtered.forEach((r) => {
      if (r.chemsex_signal !== "ไม่พบ") chemsex++;
      if (r.mental_health_signal !== "ไม่พบ") mh++;
      if (r.violence_signal !== "ไม่พบ") violence++;
    });
    return { chemsex, mh, violence };
  }, [filtered]);

  const implicationsDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.project_implications.forEach((i) => { map[i] = (map[i] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const barrierLevelDist = useMemo(() => {
    const map: Record<string, number> = { "ไม่มี": 0, "มีบ้าง": 0, "มีมาก": 0 };
    filtered.forEach((r) => { if (map[r.communication_barrier] !== undefined) map[r.communication_barrier]++; });
    return map;
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { fn: number; rm: number; uf: number }> = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      const month = r.date.slice(0, 7);
      if (!map[month]) map[month] = { fn: 0, rm: 0, uf: 0 };
      if (r.source === "field_note") map[month].fn++;
      else if (r.source === "rapid_msw") map[month].rm++;
      else map[month].uf++;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [filtered]);

  const sourceDist = useMemo(() => {
    const fn = filtered.filter(r => r.source === "field_note").length;
    const rm = filtered.filter(r => r.source === "rapid_msw").length;
    const uf = filtered.filter(r => r.source === "unified_form").length;
    return [
      { label: "บันทึกภาคสนาม", value: fn, color: "bg-blue-500" },
      { label: "Rapid MSW", value: rm, color: "bg-emerald-500" },
      { label: "แบบฟอร์มรวม", value: uf, color: "bg-primary" },
    ].filter(s => s.value > 0);
  }, [filtered]);

  const insights = useMemo(() => {
    const ins: { icon: string; text: string; severity: "info" | "warning" | "success" }[] = [];
    if (highBarrierCount > 0) ins.push({ icon: "💬", text: `พบอุปสรรคด้านภาษาระดับ "มีมาก" จำนวน ${highBarrierCount} ครั้ง — ควรพิจารณาสื่อหลายภาษาและ Peer ต่างชาติ`, severity: "warning" });
    if (signalCounts.chemsex > 0) ins.push({ icon: "⚡", text: `พบสัญญาณ Chemsex จำนวน ${signalCounts.chemsex} ครั้ง — ควรพัฒนาชุดความรู้ Safer Chemsex`, severity: "warning" });
    if (signalCounts.violence > 0) ins.push({ icon: "🛡️", text: `พบสัญญาณความรุนแรง/ความปลอดภัย ${signalCounts.violence} ครั้ง`, severity: "warning" });
    if (areaRanking.length > 0) ins.push({ icon: "📍", text: `พื้นที่ที่ลงบ่อยที่สุด: ${areaRanking[0][0]} (${areaRanking[0][1]} ครั้ง)`, severity: "info" });
    if (nationalityDist.length > 0) ins.push({ icon: "🌍", text: `กลุ่มสัญชาติที่พบบ่อย: ${nationalityDist.slice(0, 3).map(([g]) => g).join(", ")}`, severity: "info" });
    if (channelDist.length > 0) ins.push({ icon: "📱", text: `ช่องทางที่ MSW ใช้มากที่สุด: ${channelDist.slice(0, 3).map(([c]) => c).join(", ")}`, severity: "info" });
    if (healthLangDist.length > 0) ins.push({ icon: "📖", text: `ภาษาที่ต้องการสำหรับสื่อสุขภาพ: ${healthLangDist.slice(0, 3).map(([l]) => l).join(", ")}`, severity: "info" });
    if (proficiencyDist.length > 0) {
      const otherLang = proficiencyDist.find(([k]) => k === "ใช้ภาษาอื่น");
      if (otherLang && otherLang[1] > 0) ins.push({ icon: "🗣️", text: `พบ MSW ที่ใช้ภาษาอื่นเป็นหลัก ${otherLang[1]} ครั้ง`, severity: "warning" });
    }
    if (total === 0) ins.push({ icon: "📋", text: "ยังไม่มีข้อมูล — เริ่มบันทึกจากแท็บ 'แบบฟอร์ม'", severity: "info" });
    return ins;
  }, [highBarrierCount, signalCounts, areaRanking, nationalityDist, channelDist, healthLangDist, proficiencyDist, total]);

  // CSV Export
  const exportCsv = () => {
    if (!filtered.length) return;
    const FULL_HEADERS = [
      "record_source", "date", "city", "area", "area_notes", "venue_alias", "venue_type", "venue_name",
      "map_lat", "map_lng", "observer", "observer_role", "peer_code",
      "outreach_type", "record_type", "start_time", "end_time",
      "activity_intensity", "is_known_hotspot", "is_emerging_hotspot",
      "msw_estimated_range", "estimated_msw_count", "estimated_msm_count",
      "population_pattern", "nationality_groups", "nationality_pattern", "nationality_other",
      "age_pattern", "offsite_proportion", "offsite_nationalities", "offsite_nationalities_other",
      "offsite_ratio", "mobility_pattern", "online_offline_linkage",
      "informant_type", "informant_type_other",
      "thai_proficiency", "primary_languages", "primary_languages_other",
      "health_languages", "health_languages_other",
      "communication_barrier_level", "barrier_observation_note", "interpreter_needed",
      "comm_channels", "comm_channels_other",
      "chemsex_signal", "common_substances", "injection_signal",
      "mental_health_signal", "violence_safety_signal", "police_pressure_signal",
      "housing_vulnerability_signal", "access_barrier_signal",
      "digital_platform_pattern", "urgency_level",
      "service_interests", "service_barriers",
      "preferred_contact_channel", "preferred_service_model",
      "project_implications",
      "environment_notes", "visible_changes",
      "estimated_msw_seen", "estimated_offsite_clients", "visible_nationality_ratio",
      "info_sources", "estimated_msw_per_night_range", "foreign_msw_ratio",
      "main_nationality_groups", "common_languages",
      "email", "venue_code", "bangkok_area", "pattaya_area",
      "bangkok_peer_code", "pattaya_peer_code",
      "respondent_type", "msw_count_estimate",
      "offsite_work_ratio", "nationality_mix", "foreign_groups",
      "language_skill", "other_primary_language",
      "health_info_language_priority", "health_info_channel",
      "id", "created_at",
    ];

    const escapeCell = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      if (Array.isArray(val)) return `"${val.join("; ").replace(/"/g, '""')}"`;
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const csvRows = [FULL_HEADERS.join(",")];
    for (const r of filtered) {
      const raw = r.raw || {};
      const row = FULL_HEADERS.map((h) => {
        if (h === "record_source") return escapeCell(r.source);
        if (h === "date") return escapeCell(r.date);
        if (h === "city") return escapeCell(r.city);
        if (h === "area") return escapeCell(r.area);
        if (h === "observer") return escapeCell(r.observer);
        if (h === "map_lat") return escapeCell(r.map_lat);
        if (h === "map_lng") return escapeCell(r.map_lng);
        return escapeCell(raw[h]);
      });
      csvRows.push(row.join(","));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mel-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => { setFilterCity("all"); setFilterSource("all"); };

  // ── Chart Components ──
  const HorizontalBar = ({ data: barData, colorIdx = 0 }: { data: [string, number][]; colorIdx?: number }) => {
    const max = Math.max(...barData.map(([, v]) => v), 1);
    return (
      <div className="space-y-2.5">
        {barData.map(([label, count], i) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground/80 truncate max-w-[65%]">{label}</span>
              <span className="font-semibold text-foreground tabular-nums">{count}</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", CHART_COLORS[(i + colorIdx) % CHART_COLORS.length])} style={{ width: `${Math.max((count / max) * 100, 3)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const DonutChart = ({ data: segments }: { data: { label: string; value: number; color: string }[] }) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return null;
    let cumPct = 0;
    const arcs = segments.map(seg => {
      const pct = (seg.value / total) * 100;
      const start = cumPct;
      cumPct += pct;
      return { ...seg, pct, start };
    });
    return (
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {arcs.map((arc, i) => (
              <circle key={i} r="15.9" cx="18" cy="18" fill="none" strokeWidth="3.5"
                className={arc.color.replace("bg-", "stroke-")}
                strokeDasharray={`${arc.pct} ${100 - arc.pct}`}
                strokeDashoffset={`-${arc.start}`}
                strokeLinecap="round" />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{total}</span>
          </div>
        </div>
        <div className="space-y-1.5 flex-1">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-center gap-2 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", seg.color)} />
              <span className="text-foreground/80 truncate">{seg.label}</span>
              <span className="ml-auto font-semibold text-foreground tabular-nums">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SegmentedBar = ({ data: segments }: { data: [string, number, string][] }) => {
    const total = segments.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return null;
    return (
      <div className="space-y-3">
        <div className="h-4 w-full rounded-full overflow-hidden flex">
          {segments.map(([label, value, color], i) => (
            <div key={i} className={cn("h-full transition-all", color)} style={{ width: `${(value / total) * 100}%` }} title={`${label}: ${value}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {segments.map(([label, value, color], i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
              <span className="text-foreground/80">{label}</span>
              <span className="font-semibold text-foreground">{value} ({Math.round((value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SourceBadge = ({ source }: { source: string }) => {
    const labels: Record<string, { label: string; className: string }> = {
      field_note: { label: "ภาคสนาม", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
      rapid_msw: { label: "Rapid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
      unified_form: { label: "ฟอร์ม", className: "bg-primary/10 text-primary" },
    };
    const s = labels[source] || { label: source, className: "" };
    return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", s.className)}>{s.label}</span>;
  };

  // ── Delete button helper ──
  const DeleteButton = ({ record, size = "icon" }: { record: UnifiedRecord; size?: "icon" | "default" }) => {
    if (!canDelete) return null;
    if (size === "default") {
      return (
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteTarget(record)}>
          <Trash2 className="h-3.5 w-3.5" />ลบข้อมูล
        </Button>
      );
    }
    return (
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeleteTarget(record); }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    );
  };

  // ── Empty state ──
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">ยังไม่มีข้อมูล</h3>
      <p className="text-sm text-muted-foreground max-w-md">ยังไม่มีบันทึกในหน้านี้ หรือข้อมูลถูกลบออกแล้ว</p>
    </div>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (total === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard วิเคราะห์สถานการณ์</h2>
          <p className="text-muted-foreground text-sm">รวมข้อมูลจากทุกแหล่ง — ภาคสนาม, Rapid MSW, และแบบฟอร์มรวม</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="hidden sm:block">
            <TabsList className="h-8">
              <TabsTrigger value="charts" className="h-6 px-2 text-xs gap-1"><BarChart3 className="h-3 w-3" />กราฟ</TabsTrigger>
              <TabsTrigger value="cards" className="h-6 px-2 text-xs gap-1"><LayoutGrid className="h-3 w-3" />การ์ด</TabsTrigger>
              <TabsTrigger value="table" className="h-6 px-2 text-xs gap-1"><Table2 className="h-3 w-3" />ตาราง</TabsTrigger>
            </TabsList>
          </Tabs>
          {filtered.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 text-xs gap-1">
              <Download className="h-3.5 w-3.5" />CSV
            </Button>
          )}
          {canDelete && isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setClearAllOpen(true)} className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />ล้างทั้งหมด
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">ตัวกรอง</span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />รีเซ็ต
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกเมือง</SelectItem>
                <SelectItem value="กรุงเทพฯ">กรุงเทพฯ</SelectItem>
                <SelectItem value="พัทยา">พัทยา</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแหล่ง</SelectItem>
                <SelectItem value="field_note">บันทึกภาคสนาม</SelectItem>
                <SelectItem value="rapid_msw">Rapid MSW</SelectItem>
                <SelectItem value="unified_form">แบบฟอร์มรวม</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="h-9 px-3 flex items-center text-xs">
              {filtered.length} / {total} รายการ
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "ทั้งหมด", value: total, icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
          { label: "กรุงเทพฯ", value: bkkCount, icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "พัทยา", value: ptyCount, icon: MapPin, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
          { label: "Hotspot", value: hotspotCount, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "ปักหมุด GPS", value: pinnedCount, icon: MapPin, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Signals */}
      {(signalCounts.chemsex > 0 || signalCounts.mh > 0 || signalCounts.violence > 0) && (
        <Card className="border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">สัญญาณความเสี่ยง</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Chemsex", count: signalCounts.chemsex, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" },
                { label: "สุขภาพจิต", count: signalCounts.mh, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
                { label: "ความรุนแรง", count: signalCounts.violence, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={cn("rounded-xl p-3 text-center", bg)}>
                  <p className={cn("text-xl font-bold", color)}>{count}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts View */}
      {viewMode === "charts" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sourceDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">แหล่งข้อมูล</CardTitle>
                  <CardDescription className="text-xs">สัดส่วนข้อมูลจากแต่ละแหล่ง</CardDescription>
                </CardHeader>
                <CardContent><DonutChart data={sourceDist} /></CardContent>
              </Card>
            )}
            {monthlyTrend.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />แนวโน้มรายเดือน
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-36">
                    {monthlyTrend.map(([month, counts]) => {
                      const t = counts.fn + counts.rm + counts.uf;
                      const maxT = Math.max(...monthlyTrend.map(([, c]) => c.fn + c.rm + c.uf), 1);
                      const height = Math.max((t / maxT) * 100, 6);
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-semibold text-foreground">{t}</span>
                          <div className="w-full flex flex-col gap-px rounded-t-sm overflow-hidden" style={{ height: `${height}%` }}>
                            {counts.uf > 0 && <div className="bg-primary flex-grow" style={{ flex: counts.uf }} />}
                            {counts.fn > 0 && <div className="bg-blue-500 flex-grow" style={{ flex: counts.fn }} />}
                            {counts.rm > 0 && <div className="bg-emerald-500 flex-grow" style={{ flex: counts.rm }} />}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{month.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />ฟอร์ม</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />ภาคสนาม</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Rapid</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">อุปสรรคด้านการสื่อสาร</CardTitle>
              <CardDescription className="text-xs">สัดส่วนระดับอุปสรรคทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedBar data={[
                ["ไม่มี", barrierLevelDist["ไม่มี"], "bg-emerald-500"],
                ["มีบ้าง", barrierLevelDist["มีบ้าง"], "bg-amber-500"],
                ["มีมาก", barrierLevelDist["มีมาก"], "bg-red-500"],
              ]} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">พื้นที่ที่ลงเยี่ยมบ่อย</CardTitle>
                <CardDescription className="text-xs">อันดับตามจำนวนครั้ง</CardDescription>
              </CardHeader>
              <CardContent>
                {areaRanking.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p> : <HorizontalBar data={areaRanking} colorIdx={0} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">กลุ่มสัญชาติที่พบ</CardTitle>
                <CardDescription className="text-xs">สัญชาติที่สังเกตเห็นในพื้นที่</CardDescription>
              </CardHeader>
              <CardContent>
                {nationalityDist.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p> : <HorizontalBar data={nationalityDist} colorIdx={2} />}
              </CardContent>
            </Card>

            {healthLangDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ภาษาสำหรับสื่อสุขภาพ</CardTitle>
                  <CardDescription className="text-xs">ภาษาที่ต้องการเพื่อสื่อสารข้อมูลสุขภาพ</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={healthLangDist} colorIdx={4} /></CardContent>
              </Card>
            )}

            {channelDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ช่องทางรับข้อมูล MSW</CardTitle>
                  <CardDescription className="text-xs">ช่องทางที่ MSW ได้รับข้อมูลบ่อยที่สุด</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={channelDist} colorIdx={1} /></CardContent>
              </Card>
            )}

            {informantDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ประเภทผู้ให้ข้อมูล</CardTitle>
                  <CardDescription className="text-xs">ผู้ที่ให้ข้อมูลหลักในการลงพื้นที่</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={informantDist} colorIdx={3} /></CardContent>
              </Card>
            )}

            {proficiencyDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ระดับภาษาไทยของ MSW</CardTitle>
                  <CardDescription className="text-xs">ความสามารถด้านภาษาไทยของ MSW ในพื้นที่</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={proficiencyDist} colorIdx={5} /></CardContent>
              </Card>
            )}

            {offsiteDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">สัดส่วนงานนอกสถานที่</CardTitle>
                  <CardDescription className="text-xs">ระดับการรับงานนอกสถานบริการ</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={offsiteDist} colorIdx={6} /></CardContent>
              </Card>
            )}

            {implicationsDist.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ผลกระทบต่อโครงการ</CardTitle>
                  <CardDescription className="text-xs">ข้อเสนอแนะที่ถูกเลือกบ่อย</CardDescription>
                </CardHeader>
                <CardContent><HorizontalBar data={implicationsDist} colorIdx={7} /></CardContent>
              </Card>
            )}
          </div>

          {/* Population & Map Addon */}
          <OutreachPopulationMap records={filtered} />
        </>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.slice(0, 30).map((r) => (
            <Card key={`${r.source}-${r.id}`} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setViewItem(r)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={r.source} />
                    <span className="text-xs text-muted-foreground">{r.date ? format(new Date(r.date), "d MMM yy") : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.is_hotspot && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Hotspot</Badge>}
                    <DeleteButton record={r} />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">{r.city} — {r.area || "ไม่ระบุ"}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.venue || "ไม่ระบุสถานที่"} • MSW: {r.msw_count || "—"}</p>
                {r.nationality_groups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.nationality_groups.slice(0, 4).map(g => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">ยังไม่มีข้อมูล</p>}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">บันทึกล่าสุด ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">แหล่ง</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">วันที่</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">เมือง</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">พื้นที่</th>
                    <th className="text-center p-3 font-medium text-muted-foreground text-xs">MSW</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">ผู้ให้ข้อมูล</th>
                    <th className="p-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((r) => (
                    <tr key={`${r.source}-${r.id}`} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3"><SourceBadge source={r.source} /></td>
                      <td className="p-3 whitespace-nowrap text-xs">{r.date ? format(new Date(r.date), "dd MMM yy") : "—"}</td>
                      <td className="p-3 text-xs">{r.city}</td>
                      <td className="p-3 text-xs">{r.area || "—"}</td>
                      <td className="p-3 text-center font-medium text-xs">{r.msw_count || "—"}</td>
                      <td className="p-3 text-xs truncate max-w-[120px]">{r.informant_type.join(", ") || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewItem(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteButton record={r} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEL Insights */}
      {insights.length > 0 && (
        <Card className="border-amber-200/30 dark:border-amber-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              ข้อค้นพบเชิง MEL
            </CardTitle>
            <CardDescription className="text-xs">สร้างอัตโนมัติจากข้อมูลรวม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={cn(
                "rounded-xl p-3 text-sm flex items-start gap-2.5",
                ins.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30" :
                ins.severity === "success" ? "bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30" :
                "bg-muted/50 border border-border/50"
              )}>
                <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
                <span className="text-foreground/80 text-xs leading-relaxed">{ins.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {viewItem && <SourceBadge source={viewItem.source} />}
              รายละเอียด
            </SheetTitle>
          </SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-3">
              {[
                ["วันที่", viewItem.date],
                ["เมือง", viewItem.city],
                ["พื้นที่", viewItem.area],
                ["สถานที่", viewItem.venue],
                ["ผู้สังเกต", viewItem.observer],
                ["จำนวน MSW", viewItem.msw_count],
                ["ประเภทผู้ให้ข้อมูล", viewItem.informant_type.join(", ") || "—"],
                ["สัญชาติ", [...viewItem.nationality_groups, viewItem.nationality_other ? `(${viewItem.nationality_other})` : ""].filter(Boolean).join(", ") || "—"],
                ["ระดับภาษาไทย", viewItem.thai_proficiency || "—"],
                ["ภาษาหลัก", viewItem.primary_languages.join(", ") || "—"],
                ["ภาษาสื่อสุขภาพ", viewItem.health_languages.join(", ") || "—"],
                ["ช่องทางรับข้อมูล", viewItem.comm_channels.join(", ") || "—"],
                ["อุปสรรคภาษา", viewItem.communication_barrier],
                ["สัดส่วนนอกสถานที่", viewItem.offsite_proportion || "—"],
                ["📍 พิกัด", viewItem.map_lat && viewItem.map_lng ? `${viewItem.map_lat.toFixed(4)}, ${viewItem.map_lng.toFixed(4)}` : "—"],
                ["ข้อเสนอ MEL", viewItem.project_implications.join(", ") || "—"],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || "—"}</span>
                </div>
              ))}
              {canDelete && (
                <div className="pt-4">
                  <DeleteButton record={viewItem} size="default" />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ยืนยันการลบข้อมูล
            </DialogTitle>
            <DialogDescription>
              คุณต้องการลบข้อมูลรายการนี้ใช่หรือไม่? ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">แหล่ง:</span> <SourceBadge source={deleteTarget.source} /></p>
              <p><span className="text-muted-foreground">วันที่:</span> {deleteTarget.date || "—"}</p>
              <p><span className="text-muted-foreground">พื้นที่:</span> {deleteTarget.city} — {deleteTarget.area || "ไม่ระบุ"}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteSingleMutation.mutate(deleteTarget)} disabled={deleteSingleMutation.isPending} className="gap-1.5">
              {deleteSingleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              ลบข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog — two-step */}
      <Dialog open={clearAllOpen} onOpenChange={(open) => { if (!open) { setClearAllOpen(false); setClearAllConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ล้างข้อมูลทั้งหมด
            </DialogTitle>
            <DialogDescription>
              การดำเนินการนี้จะลบข้อมูลทั้งหมดของหน้านี้ออกอย่างถาวร และไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
              <p className="font-medium text-destructive">⚠️ จะลบข้อมูลจำนวน {total} รายการ จากทุกแหล่งข้อมูล</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-0.5 list-disc list-inside">
                <li>บันทึกภาคสนาม ({(fieldNotes || []).length})</li>
                <li>Rapid MSW ({(rapidMsw || []).length})</li>
                <li>แบบฟอร์มรวม ({(unifiedForms || []).length})</li>
              </ul>
            </div>
            <div>
              <p className="text-sm text-foreground mb-2">พิมพ์ <span className="font-bold text-destructive">"ล้างข้อมูลทั้งหมด"</span> เพื่อยืนยัน</p>
              <Input
                value={clearAllConfirmText}
                onChange={(e) => setClearAllConfirmText(e.target.value)}
                placeholder="ล้างข้อมูลทั้งหมด"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setClearAllOpen(false); setClearAllConfirmText(""); }}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllConfirmText !== "ล้างข้อมูลทั้งหมด" || clearAllMutation.isPending}
              className="gap-1.5"
            >
              {clearAllMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              ล้างข้อมูลทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

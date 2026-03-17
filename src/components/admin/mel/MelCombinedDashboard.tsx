import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Download, MapPin, Users, AlertTriangle, TrendingUp, BarChart3, Globe, Shield, Lightbulb, Eye, Filter, RotateCcw } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

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
  raw: any;
}

const normalizeCity = (c: string) => {
  if (!c) return "unknown";
  if (c.includes("กรุงเทพ") || c === "bangkok") return "กรุงเทพฯ";
  if (c.includes("พัทยา") || c.includes("ชลบุรี") || c === "pattaya_chonburi") return "พัทยา";
  return c;
};

export default function MelCombinedDashboard() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [filterCity, setFilterCity] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [viewItem, setViewItem] = useState<UnifiedRecord | null>(null);

  // Fetch all three data sources
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

  // Normalize all records into unified format
  const allRecords = useMemo<UnifiedRecord[]>(() => {
    const records: UnifiedRecord[] = [];
    // Field notes
    (fieldNotes || []).forEach((fn: any) => {
      records.push({
        id: fn.id,
        source: "field_note",
        date: fn.visit_date,
        city: normalizeCity(fn.city),
        area: fn.area_name || "",
        venue: fn.venue_alias || "",
        observer: fn.observer_name || "",
        msw_count: String(fn.estimated_msw_seen || ""),
        nationality_groups: fn.main_nationality_groups ? fn.main_nationality_groups.split(/[,\s]+/).filter(Boolean) : [],
        communication_barrier: fn.communication_barrier_level || "ไม่มี",
        urgency_level: "normal",
        service_interests: [],
        service_barriers: [],
        project_implications: fn.project_implications || [],
        chemsex_signal: "ไม่พบ",
        mental_health_signal: "ไม่พบ",
        violence_signal: "ไม่พบ",
        is_hotspot: false,
        confidence: "medium",
        raw: fn,
      });
    });
    // Rapid MSW
    (rapidMsw || []).forEach((r: any) => {
      records.push({
        id: r.id,
        source: "rapid_msw",
        date: r.survey_date,
        city: normalizeCity(r.venue_code),
        area: r.bangkok_area || r.pattaya_area || "",
        venue: r.venue_type || "",
        observer: r.email || "",
        msw_count: r.msw_count_estimate || "",
        nationality_groups: Array.isArray(r.foreign_groups) ? r.foreign_groups : [],
        communication_barrier: r.language_skill === "other_language_primary" ? "มีมาก" : "ไม่มี",
        urgency_level: "normal",
        service_interests: [],
        service_barriers: [],
        project_implications: [],
        chemsex_signal: "ไม่พบ",
        mental_health_signal: "ไม่พบ",
        violence_signal: "ไม่พบ",
        is_hotspot: false,
        confidence: "medium",
        raw: r,
      });
    });
    // Unified forms
    (unifiedForms || []).forEach((u: any) => {
      records.push({
        id: u.id,
        source: "unified_form",
        date: u.survey_date,
        city: normalizeCity(u.city),
        area: u.area_name || "",
        venue: u.venue_alias || u.venue_type || "",
        observer: u.observer_name || "",
        msw_count: u.estimated_msw_count || "",
        nationality_groups: u.nationality_groups || [],
        communication_barrier: u.communication_barrier_level || "ไม่มี",
        urgency_level: u.urgency_level || "normal",
        service_interests: u.service_interests || [],
        service_barriers: u.service_barriers || [],
        project_implications: u.project_implications || [],
        chemsex_signal: u.chemsex_signal || "ไม่พบ",
        mental_health_signal: u.mental_health_signal || "ไม่พบ",
        violence_signal: u.violence_safety_signal || "ไม่พบ",
        is_hotspot: u.is_known_hotspot || u.is_emerging_hotspot || false,
        confidence: u.confidence_level || "medium",
        raw: u,
      });
    });
    return records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [fieldNotes, rapidMsw, unifiedForms]);

  // Filtered records
  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      if (filterCity !== "all" && r.city !== filterCity) return false;
      if (filterUrgency !== "all" && r.urgency_level !== filterUrgency) return false;
      if (filterSource !== "all" && r.source !== filterSource) return false;
      return true;
    });
  }, [allRecords, filterCity, filterUrgency, filterSource]);

  // ── Stats ──
  const total = allRecords.length;
  const bkkCount = allRecords.filter((r) => r.city === "กรุงเทพฯ").length;
  const ptyCount = allRecords.filter((r) => r.city === "พัทยา").length;
  const highConcernCount = allRecords.filter((r) => r.urgency_level === "high_concern").length;
  const hotspotCount = allRecords.filter((r) => r.is_hotspot).length;
  const highBarrierCount = allRecords.filter((r) => r.communication_barrier === "มีมาก").length;

  // Area ranking
  const areaRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { if (r.area) map[r.area] = (map[r.area] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  // Nationality distribution
  const nationalityDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.nationality_groups.forEach((g) => { if (g) map[g] = (map[g] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  // Service needs
  const serviceNeedsDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.service_interests.forEach((s) => { map[s] = (map[s] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  // Barriers
  const barriersDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.service_barriers.forEach((b) => { map[b] = (map[b] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  // Signal counts
  const signalCounts = useMemo(() => {
    let chemsex = 0, mh = 0, violence = 0;
    filtered.forEach((r) => {
      if (r.chemsex_signal !== "ไม่พบ") chemsex++;
      if (r.mental_health_signal !== "ไม่พบ") mh++;
      if (r.violence_signal !== "ไม่พบ") violence++;
    });
    return { chemsex, mh, violence };
  }, [filtered]);

  // Implications
  const implicationsDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => r.project_implications.forEach((i) => { map[i] = (map[i] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  // Barrier distribution chart data
  const barrierLevelDist = useMemo(() => {
    const map: Record<string, number> = { "ไม่มี": 0, "มีบ้าง": 0, "มีมาก": 0 };
    filtered.forEach((r) => { if (map[r.communication_barrier] !== undefined) map[r.communication_barrier]++; });
    return map;
  }, [filtered]);

  // Monthly trend
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

  // Auto-generate insights
  const insights = useMemo(() => {
    const ins: { icon: string; text: string; severity: "info" | "warning" | "success" }[] = [];
    if (highBarrierCount > 0) {
      ins.push({ icon: "💬", text: `พบอุปสรรคด้านภาษาระดับ "มีมาก" จำนวน ${highBarrierCount} ครั้ง — ควรพิจารณาสื่อหลายภาษาและ Peer ต่างชาติ`, severity: "warning" });
    }
    if (signalCounts.chemsex > 0) {
      ins.push({ icon: "⚡", text: `พบสัญญาณ Chemsex จำนวน ${signalCounts.chemsex} ครั้ง — ควรพัฒนาชุดความรู้ Safer Chemsex`, severity: "warning" });
    }
    if (signalCounts.violence > 0) {
      ins.push({ icon: "🛡️", text: `พบสัญญาณความรุนแรง/ความปลอดภัย ${signalCounts.violence} ครั้ง — ต้องเฝ้าระวังและเพิ่มช่องทางรายงาน`, severity: "warning" });
    }
    if (highConcernCount > 0) {
      ins.push({ icon: "🔴", text: `มี ${highConcernCount} บันทึกที่มีระดับความเร่งด่วนสูง — ควรติดตามเร่งด่วน`, severity: "warning" });
    }
    if (areaRanking.length > 0) {
      ins.push({ icon: "📍", text: `พื้นที่ที่มีการลงพื้นที่บ่อยที่สุด: ${areaRanking[0][0]} (${areaRanking[0][1]} ครั้ง)`, severity: "info" });
    }
    if (nationalityDist.length > 0) {
      ins.push({ icon: "🌍", text: `กลุ่มสัญชาติที่พบบ่อยที่สุด: ${nationalityDist.slice(0, 3).map(([g]) => g).join(", ")}`, severity: "info" });
    }
    if (serviceNeedsDist.length > 0) {
      ins.push({ icon: "🏥", text: `บริการที่ต้องการมากที่สุด: ${serviceNeedsDist[0][0]} (${serviceNeedsDist[0][1]} ครั้ง)`, severity: "info" });
    }
    if (total === 0) {
      ins.push({ icon: "📋", text: "ยังไม่มีข้อมูล — เริ่มบันทึกจากแท็บ 'แบบฟอร์ม'", severity: "info" });
    }
    return ins;
  }, [highBarrierCount, signalCounts, highConcernCount, areaRanking, nationalityDist, serviceNeedsDist, total]);

  // CSV Export
  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ["source", "date", "city", "area", "venue", "observer", "msw_count", "nationality_groups", "communication_barrier", "urgency_level", "chemsex_signal", "mental_health_signal", "violence_signal"];
    const csvRows = [headers.join(",")];
    for (const r of filtered) {
      const row = headers.map((h) => {
        const val = (r as any)[h];
        if (Array.isArray(val)) return `"${val.join("; ")}"`;
        if (val === null || val === undefined) return "";
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mel-situational-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilterCity("all");
    setFilterUrgency("all");
    setFilterSource("all");
  };

  const BarChart = ({ data, maxVal }: { data: [string, number][]; maxVal?: number }) => {
    const max = maxVal || Math.max(...data.map(([, v]) => v), 1);
    return (
      <div className="space-y-2">
        {data.map(([label, count]) => (
          <div key={label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[70%]">{label}</span>
              <span className="font-medium text-foreground">{count}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SourceBadge = ({ source }: { source: string }) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      field_note: { label: "FN", variant: "secondary" },
      rapid_msw: { label: "RM", variant: "outline" },
      unified_form: { label: "UF", variant: "default" },
    };
    const s = labels[source] || { label: source, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px] px-1.5">{s.label}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{isTh ? "Dashboard วิเคราะห์สถานการณ์" : "Situational Analysis Dashboard"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "รวมข้อมูลจากทุกแหล่ง — บันทึกภาคสนาม, Rapid MSW, และแบบฟอร์มรวม" : "Combined data from all outreach sources"}</p>
        </div>
        {filtered.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{isTh ? "ตัวกรอง" : "Filters"}</span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />{isTh ? "รีเซ็ต" : "Reset"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isTh ? "ทุกเมือง" : "All Cities"}</SelectItem>
                <SelectItem value="กรุงเทพฯ">กรุงเทพฯ</SelectItem>
                <SelectItem value="พัทยา">พัทยา</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUrgency} onValueChange={setFilterUrgency}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isTh ? "ทุกระดับ" : "All Urgency"}</SelectItem>
                <SelectItem value="normal">ปกติ</SelectItem>
                <SelectItem value="watch">เฝ้าระวัง</SelectItem>
                <SelectItem value="high_concern">น่ากังวลสูง</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isTh ? "ทุกแหล่ง" : "All Sources"}</SelectItem>
                <SelectItem value="field_note">{isTh ? "บันทึกภาคสนาม" : "Field Notes"}</SelectItem>
                <SelectItem value="rapid_msw">Rapid MSW</SelectItem>
                <SelectItem value="unified_form">{isTh ? "แบบฟอร์มรวม" : "Unified Form"}</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="h-9 px-3 flex items-center">
              {filtered.length} / {total} {isTh ? "รายการ" : "records"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: isTh ? "ทั้งหมด" : "Total", value: total, icon: BarChart3, color: "text-primary" },
          { label: "กรุงเทพฯ", value: bkkCount, icon: MapPin, color: "text-blue-500" },
          { label: "พัทยา", value: ptyCount, icon: MapPin, color: "text-emerald-500" },
          { label: isTh ? "น่ากังวลสูง" : "High Concern", value: highConcernCount, icon: AlertTriangle, color: "text-destructive" },
          { label: "Hotspot", value: hotspotCount, icon: TrendingUp, color: "text-amber-500" },
          { label: isTh ? "อุปสรรคภาษา" : "Lang Barrier", value: highBarrierCount, icon: Globe, color: "text-purple-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Signals */}
      {(signalCounts.chemsex > 0 || signalCounts.mh > 0 || signalCounts.violence > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              {isTh ? "สัญญาณความเสี่ยง / ข้อสังเกตเชิงพื้นที่" : "Risk Signals"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Chemsex", count: signalCounts.chemsex, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/20" },
                { label: isTh ? "สุขภาพจิต" : "Mental Health", count: signalCounts.mh, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/20" },
                { label: isTh ? "ความรุนแรง" : "Violence", count: signalCounts.violence, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/20" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={cn("rounded-lg p-4", bg)}>
                  <p className={cn("text-2xl font-bold", color)}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Area Ranking */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "พื้นที่ที่ลงเยี่ยมบ่อย" : "Top Areas"}</CardTitle></CardHeader>
          <CardContent>
            {areaRanking.length === 0 ? <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p> : <BarChart data={areaRanking} />}
          </CardContent>
        </Card>

        {/* Nationality */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "กลุ่มสัญชาติที่พบ" : "Nationality Groups"}</CardTitle></CardHeader>
          <CardContent>
            {nationalityDist.length === 0 ? <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p> : (
              <div className="flex flex-wrap gap-2">
                {nationalityDist.map(([g, c]) => (
                  <Badge key={g} variant="outline" className="text-xs">
                    {g} <span className="ml-1 font-bold text-primary">({c})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Communication Barriers */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "อุปสรรคด้านการสื่อสาร" : "Communication Barriers"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(barrierLevelDist).map(([level, count]) => {
              const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{level}</span>
                    <span className="font-medium text-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", level === "ไม่มี" ? "bg-green-500" : level === "มีบ้าง" ? "bg-amber-500" : "bg-destructive")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Service Needs */}
        {serviceNeedsDist.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "ความต้องการบริการ" : "Service Needs"}</CardTitle></CardHeader>
            <CardContent><BarChart data={serviceNeedsDist} /></CardContent>
          </Card>
        )}

        {/* Service Barriers */}
        {barriersDist.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "อุปสรรคการเข้าถึงบริการ" : "Access Barriers"}</CardTitle></CardHeader>
            <CardContent><BarChart data={barriersDist} /></CardContent>
          </Card>
        )}

        {/* Project Implications */}
        {implicationsDist.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "ผลกระทบต่อโครงการ" : "Programme Implications"}</CardTitle></CardHeader>
            <CardContent><BarChart data={implicationsDist} /></CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isTh ? "แนวโน้มรายเดือน" : "Monthly Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {monthlyTrend.map(([month, counts]) => {
                const total = counts.fn + counts.rm + counts.uf;
                const maxTotal = Math.max(...monthlyTrend.map(([, c]) => c.fn + c.rm + c.uf), 1);
                const height = Math.max((total / maxTotal) * 100, 4);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-foreground">{total}</span>
                    <div className="w-full flex flex-col gap-px" style={{ height: `${height}%` }}>
                      {counts.uf > 0 && <div className="bg-primary rounded-t flex-grow" style={{ flex: counts.uf }} />}
                      {counts.fn > 0 && <div className="bg-primary/60 flex-grow" style={{ flex: counts.fn }} />}
                      {counts.rm > 0 && <div className="bg-primary/30 rounded-b flex-grow" style={{ flex: counts.rm }} />}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />UF</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/60" />FN</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/30" />RM</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEL Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {isTh ? "ข้อค้นพบเชิง MEL" : "MEL Learning Insights"}
            </CardTitle>
            <CardDescription className="text-xs">{isTh ? "สร้างอัตโนมัติจากข้อมูลรวม" : "Auto-generated from combined data"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={cn(
                "rounded-lg p-3 text-sm flex items-start gap-2",
                ins.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" :
                ins.severity === "success" ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" :
                "bg-muted border border-border"
              )}>
                <span className="text-base shrink-0">{ins.icon}</span>
                <span className="text-muted-foreground">{ins.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{isTh ? "บันทึกล่าสุด" : "Recent Records"} ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "แหล่ง" : "Src"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "เมือง" : "City"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "พื้นที่" : "Area"}</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">MSW</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">{isTh ? "ระดับ" : "Urgency"}</th>
                  <th className="p-3 w-10" />
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
                    <td className="p-3 text-center">
                      {r.urgency_level === "high_concern" ? (
                        <Badge variant="destructive" className="text-[10px]">🔴</Badge>
                      ) : r.urgency_level === "watch" ? (
                        <Badge variant="secondary" className="text-[10px]">🟡</Badge>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewItem(r)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {viewItem && <SourceBadge source={viewItem.source} />}
              {isTh ? "รายละเอียด" : "Details"}
            </SheetTitle>
          </SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-3">
              {[
                [isTh ? "วันที่" : "Date", viewItem.date],
                [isTh ? "เมือง" : "City", viewItem.city],
                [isTh ? "พื้นที่" : "Area", viewItem.area],
                [isTh ? "สถานที่" : "Venue", viewItem.venue],
                [isTh ? "ผู้สังเกต" : "Observer", viewItem.observer],
                ["MSW #", viewItem.msw_count],
                [isTh ? "สัญชาติ" : "Nationality", viewItem.nationality_groups.join(", ") || "—"],
                [isTh ? "อุปสรรคภาษา" : "Barrier", viewItem.communication_barrier],
                [isTh ? "ระดับเร่งด่วน" : "Urgency", viewItem.urgency_level],
                ["Chemsex", viewItem.chemsex_signal],
                [isTh ? "สุขภาพจิต" : "Mental Health", viewItem.mental_health_signal],
                [isTh ? "ความรุนแรง" : "Violence", viewItem.violence_signal],
                [isTh ? "บริการที่สนใจ" : "Service Interests", viewItem.service_interests.join(", ") || "—"],
                [isTh ? "อุปสรรค" : "Barriers", viewItem.service_barriers.join(", ") || "—"],
                [isTh ? "ข้อเสนอ" : "Implications", viewItem.project_implications.join(", ") || "—"],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

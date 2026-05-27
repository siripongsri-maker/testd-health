import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2, RefreshCw, ClipboardList, Users, Repeat, TrendingUp, AlertTriangle,
  Download, HeartPulse, UserCheck, UserX, Inbox,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface ApptRef {
  branch_id: string | null;
  appointment_date: string | null;
  user_id: string | null;
  service_id: string | null;
  source: string | null;
}

interface Row {
  id: string;
  booking_id: string;
  uic_code: string | null;
  uic_hash: string | null;
  visit_sequence: number;
  linked_previous_count: number;
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

interface BranchInfo { id: string; name_th: string; name_en: string }
interface ServiceInfo { id: string; name_th: string; name_en: string }

const PAGE_SIZE = 25;

function riskOf(row: Row): "high" | "medium" | "low" {
  if (row.confidence !== null && row.confidence <= 2) return "high";
  if (row.mental_health_interest === "yes") return "high";
  if (row.safety !== null && row.safety <= 2) return "medium";
  if (row.confidence === 3) return "medium";
  return "low";
}

const RISK_COLORS = { high: "#f43f5e", medium: "#f59e0b", low: "#10b981" } as const;
const VISIT_COLORS = ["#0d9488", "#f59e0b"];

export default function AdminPreServiceSurveysContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { user } = useAuth();
  const { role } = useAdminRole();

  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterVisit, setFilterVisit] = useState<"all" | "first" | "repeat">("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterMH, setFilterMH] = useState<"all" | "yes" | "maybe" | "no">("all");
  const [filterAnon, setFilterAnon] = useState<"all" | "anon" | "user">("all");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterClinics, setFilterClinics] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [trendRange, setTrendRange] = useState<7 | 30 | 90>(30);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    const [{ data: surveys, error }, { data: br }, { data: sv }] = await Promise.all([
      supabase
        .from("appointment_pre_service_surveys")
        .select("*, appointments(branch_id, appointment_date, user_id, service_id, source)")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase.from("booking_branches").select("id, name_th, name_en"),
      supabase.from("booking_services").select("id, name_th, name_en"),
    ]);
    if (error) console.error("PRE_SURVEY_LOAD", error);
    setRows((surveys as any) || []);
    setBranches((br as any) || []);
    setServices((sv as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  // Filtered rows
  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : Infinity;
    return rows.filter((r) => {
      const ts = new Date(r.created_at).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (filterVisit === "first" && r.visit_sequence !== 1) return false;
      if (filterVisit === "repeat" && r.visit_sequence < 2) return false;
      if (filterRisk !== "all" && riskOf(r) !== filterRisk) return false;
      if (filterMH !== "all" && (r.mental_health_interest || "no") !== filterMH) return false;
      const isAnon = !r.appointments?.user_id;
      if (filterAnon === "anon" && !isAnon) return false;
      if (filterAnon === "user" && isAnon) return false;
      if (filterService !== "all" && r.appointments?.service_id !== filterService) return false;
      if (filterClinics.length && (!r.appointments?.branch_id || !filterClinics.includes(r.appointments.branch_id))) return false;
      if (searchDebounced) {
        const masked = maskUic(r.uic_code).toLowerCase();
        const hit =
          r.booking_id.toLowerCase().includes(searchDebounced) ||
          masked.includes(searchDebounced) ||
          (r.channel || "").toLowerCase().includes(searchDebounced) ||
          branchName(r.appointments?.branch_id).toLowerCase().includes(searchDebounced) ||
          serviceName(r.appointments?.service_id).toLowerCase().includes(searchDebounced);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, dateFrom, dateTo, filterVisit, filterRisk, filterMH, filterAnon, filterService, filterClinics, searchDebounced, language]);

  // Analytics on filtered set
  const insights = useMemo(() => {
    const total = filtered.length;
    const first = filtered.filter((r) => r.visit_sequence === 1).length;
    const repeat = total - first;
    const avgVisits = total > 0 ? filtered.reduce((s, r) => s + r.visit_sequence, 0) / total : 0;
    const highRisk = filtered.filter((r) => riskOf(r) === "high").length;
    const mhConcern = filtered.filter((r) => r.mental_health_interest === "yes" || r.mental_health_interest === "maybe").length;
    const anon = filtered.filter((r) => !r.appointments?.user_id).length;
    const loggedIn = total - anon;

    const riskDist = [
      { name: tx("ต่ำ", "Low"), key: "low", value: filtered.filter((r) => riskOf(r) === "low").length, fill: RISK_COLORS.low },
      { name: tx("กลาง", "Medium"), key: "medium", value: filtered.filter((r) => riskOf(r) === "medium").length, fill: RISK_COLORS.medium },
      { name: tx("สูง", "High"), key: "high", value: highRisk, fill: RISK_COLORS.high },
    ];

    const mhDist = [
      { name: tx("ใช่", "Yes"), value: filtered.filter((r) => r.mental_health_interest === "yes").length, fill: "#f43f5e" },
      { name: tx("อาจจะ", "Maybe"), value: filtered.filter((r) => r.mental_health_interest === "maybe").length, fill: "#f59e0b" },
      { name: tx("ไม่", "No"), value: filtered.filter((r) => !r.mental_health_interest || r.mental_health_interest === "no").length, fill: "#10b981" },
    ];

    const visitDist = [
      { name: tx("ครั้งแรก", "First-time"), value: first },
      { name: tx("กลับมาซ้ำ", "Repeat"), value: repeat },
    ];

    // Risk trend (use trendRange)
    const days = trendRange;
    const today = startOfDay(new Date());
    const trendBuckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(today, i), "yyyy-MM-dd");
      trendBuckets[d] = 0;
    }
    filtered.forEach((r) => {
      if (riskOf(r) !== "high") return;
      const d = format(startOfDay(new Date(r.created_at)), "yyyy-MM-dd");
      if (d in trendBuckets) trendBuckets[d]++;
    });
    const trend = Object.entries(trendBuckets).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));

    // Clinic comparison
    const byBranch = new Map<string, Row[]>();
    filtered.forEach((r) => {
      const id = r.appointments?.branch_id || "unknown";
      if (!byBranch.has(id)) byBranch.set(id, []);
      byBranch.get(id)!.push(r);
    });
    const clinicCompare = Array.from(byBranch.entries()).map(([id, list]) => {
      const t = list.length;
      const r1 = list.filter((x) => x.visit_sequence > 1).length;
      const hr = list.filter((x) => riskOf(x) === "high").length;
      const avg = t > 0 ? list.reduce((s, x) => s + x.visit_sequence, 0) / t : 0;
      return {
        id,
        name: id === "unknown" ? tx("ไม่ระบุ", "Unknown") : branchName(id),
        total: t,
        repeatRate: t > 0 ? (r1 / t) * 100 : 0,
        highRiskPct: t > 0 ? (hr / t) * 100 : 0,
        avgVisits: avg,
      };
    }).sort((a, b) => b.total - a.total);

    // Longitudinal cohort by uic_hash
    const cohortByHash = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.uic_hash) return;
      cohortByHash.set(r.uic_hash, Math.max(cohortByHash.get(r.uic_hash) || 0, r.visit_sequence));
    });
    const cohortRanges = { "1x": 0, "2-3x": 0, "4-6x": 0, "7x+": 0 };
    cohortByHash.forEach((maxV) => {
      if (maxV >= 7) cohortRanges["7x+"]++;
      else if (maxV >= 4) cohortRanges["4-6x"]++;
      else if (maxV >= 2) cohortRanges["2-3x"]++;
      else cohortRanges["1x"]++;
    });
    const cohortArr = Object.entries(cohortRanges).map(([range, count]) => ({ range, count }));
    const returningPct = cohortByHash.size > 0
      ? (Array.from(cohortByHash.values()).filter((v) => v >= 2).length / cohortByHash.size) * 100
      : 0;
    const avgRepeat = cohortByHash.size > 0
      ? Array.from(cohortByHash.values()).reduce((a, b) => a + b, 0) / cohortByHash.size
      : 0;

    return {
      total, first, repeat, avgVisits, highRisk, mhConcern, anon, loggedIn,
      riskDist, mhDist, visitDist, trend, clinicCompare,
      cohortArr, returningPct, avgRepeat, uniqueHashes: cohortByHash.size,
    };
  }, [filtered, trendRange, language]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [searchDebounced, filterVisit, filterRisk, filterMH, filterAnon, filterService, filterClinics, dateFrom, dateTo]);

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast({ title: tx("ไม่มีข้อมูล", "No data"), description: tx("ไม่มีแถวให้ส่งออก", "No rows to export") });
      return;
    }
    setExporting(true);
    try {
      const columns: CsvColumn<Row>[] = [
        { key: "booking_id", header: tx("Booking ID", "Booking ID") },
        { key: "appt_date", header: tx("วันที่นัด", "Appointment Date"), format: (r) => r.appointments?.appointment_date || "" },
        { key: "clinic", header: tx("สาขา", "Clinic"), format: (r) => branchName(r.appointments?.branch_id) },
        { key: "visit_sequence", header: tx("ครั้งที่", "Visit Sequence"), format: (r) => String(r.visit_sequence) },
        { key: "repeat", header: tx("กลับมาซ้ำ", "Repeat Visit"), format: (r) => r.visit_sequence > 1 ? "yes" : "no" },
        { key: "risk", header: tx("ความเสี่ยง", "Risk Level"), format: (r) => riskOf(r) },
        { key: "mh", header: tx("ความสนใจสุขภาพจิต", "MH Response"), format: (r) => r.mental_health_interest || "" },
        { key: "service", header: tx("บริการ", "Service Type"), format: (r) => serviceName(r.appointments?.service_id) },
        { key: "uic_masked", header: tx("UIC (masked)", "UIC (masked)"), format: (r) => maskUic(r.uic_code) },
        { key: "submitted_at", header: tx("ส่งเมื่อ", "Submitted At"), format: (r) => formatCsvDate(r.created_at) },
        { key: "identity", header: tx("ประเภทผู้ใช้", "Anonymous/User"), format: (r) => r.appointments?.user_id ? "user" : "anonymous" },
        { key: "channel", header: tx("ช่องทาง", "Channel"), format: (r) => r.channel || "" },
        { key: "language", header: tx("ภาษา", "Language"), format: (r) => r.language || "" },
      ];

      const filterMeta = {
        dateFrom, dateTo, filterVisit, filterRisk, filterMH, filterAnon, filterService,
        clinics: filterClinics, search: searchDebounced,
      };

      // Audit log
      if (user) {
        await supabase.from("export_audit_logs").insert({
          user_id: user.id,
          export_type: "pre_service_surveys",
          row_count: filtered.length,
          is_full_export: filtered.length === rows.length,
          filters: filterMeta as any,
        });
      }

      exportToCsv(
        filtered,
        columns,
        "pre-service-surveys",
        { from: dateFrom, to: dateTo },
        user ? { userId: user.id, role: role || "admin", timestamp: Date.now(), module: "pre_survey" } : undefined,
      );

      toast({ title: tx("ส่งออกสำเร็จ", "Export complete"), description: `${filtered.length} ${tx("แถว", "rows")}` });
    } catch (e: any) {
      console.error("EXPORT_ERROR", e);
      toast({ title: tx("ส่งออกล้มเหลว", "Export failed"), description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const toggleClinic = (id: string) => {
    setFilterClinics((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setSearch(""); setFilterVisit("all"); setFilterRisk("all"); setFilterMH("all");
    setFilterAnon("all"); setFilterService("all"); setFilterClinics([]);
    setDateFrom(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setDateTo(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            {tx("แบบสำรวจก่อนรับบริการ", "Pre-Service Survey Responses")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tx("ติดตามผู้ใช้แบบไม่เปิดเผยตัวตนด้วย UIC hash", "Anonymous longitudinal tracking via UIC hash")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tx("รีเฟรช", "Refresh")}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exporting || filtered.length === 0}
            className="border-teal-500 text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {tx("Export CSV", "Export CSV")}
          </Button>
        </div>
      </div>

      {/* Dashboard heading */}
      <div>
        <h2 className="text-lg font-semibold">{tx("ภาพรวมข้อมูลแบบสำรวจ", "Survey Insights Dashboard")}</h2>
        <p className="text-xs text-muted-foreground">
          {tx("ตัวเลขทั้งหมดอัปเดตตามตัวกรองด้านล่าง", "All metrics reflect the filters below in real time")}
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label={tx("รวม", "Total")} value={insights.total} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label={tx("ครั้งแรก", "First-time")} value={insights.first} />
        <SummaryCard icon={<Repeat className="h-4 w-4" />} label={tx("กลับมาซ้ำ", "Repeat")} value={insights.repeat} />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label={tx("ค่าเฉลี่ยครั้ง", "Avg visits")} value={insights.avgVisits.toFixed(2)} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label={tx("ความเสี่ยงสูง", "High risk")} value={insights.highRisk} highlight />
        <SummaryCard icon={<HeartPulse className="h-4 w-4" />} label={tx("กังวลสุขภาพจิต %", "MH concern %")} value={pct(insights.mhConcern, insights.total)} />
        <SummaryCard icon={<UserX className="h-4 w-4" />} label={tx("ไม่เปิดเผยตัวตน %", "Anonymous %")} value={pct(insights.anon, insights.total)} />
        <SummaryCard icon={<UserCheck className="h-4 w-4" />} label={tx("ล็อกอิน %", "Logged-in %")} value={pct(insights.loggedIn, insights.total)} />
      </div>

      {/* Charts row 1: trend + visit type + risk dist */}
      <div className="grid lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">{tx("แนวโน้มความเสี่ยงสูง", "High-risk trend")}</h3>
            <ToggleGroup type="single" size="sm" value={String(trendRange)} onValueChange={(v) => v && setTrendRange(Number(v) as 7 | 30 | 90)}>
              <ToggleGroupItem value="7">7d</ToggleGroupItem>
              <ToggleGroupItem value="30">30d</ToggleGroupItem>
              <ToggleGroupItem value="90">90d</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights.trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">{tx("ประเภทการเข้ารับบริการ", "Visit Type")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={insights.visitDist} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40} label>
                  {insights.visitDist.map((_, i) => <Cell key={i} fill={VISIT_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2: risk dist + MH signal */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">{tx("การกระจายความเสี่ยง", "Risk Level Distribution")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.riskDist}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value">
                  {insights.riskDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">{tx("สัญญาณสุขภาพจิต", "Mental Health Signal")}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.mhDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis dataKey="name" type="category" fontSize={11} width={70} />
                <Tooltip />
                <Bar dataKey="value">
                  {insights.mhDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Clinic comparison */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">{tx("เปรียบเทียบสาขา", "Clinic Comparison")}</h3>
        {insights.clinicCompare.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("ไม่มีข้อมูล", "No data")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">{tx("สาขา", "Clinic")}</th>
                  <th className="text-right py-2">{tx("รวม", "Total")}</th>
                  <th className="text-right py-2">{tx("กลับมาซ้ำ %", "Repeat %")}</th>
                  <th className="text-right py-2">{tx("ความเสี่ยงสูง %", "High-risk %")}</th>
                  <th className="text-right py-2">{tx("ค่าเฉลี่ยครั้ง", "Avg visits")}</th>
                </tr>
              </thead>
              <tbody>
                {insights.clinicCompare.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="text-right">{c.total}</td>
                    <td className="text-right">{c.repeatRate.toFixed(1)}%</td>
                    <td className="text-right">{c.highRiskPct.toFixed(1)}%</td>
                    <td className="text-right">{c.avgVisits.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Longitudinal cohort */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">{tx("การรักษาความสัมพันธ์ระยะยาว (UIC anonymous)", "Longitudinal Retention (anonymous cohorts)")}</h3>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <MiniStat label={tx("UIC ที่ไม่ซ้ำ", "Unique UIC")} value={insights.uniqueHashes} />
          <MiniStat label={tx("ค่าเฉลี่ยครั้งกลับมา", "Avg repeat visits")} value={insights.avgRepeat.toFixed(2)} />
          <MiniStat label={tx("กลับมา %", "Returning %")} value={`${insights.returningPct.toFixed(1)}%`} />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={insights.cohortArr}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="range" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{tx("ตัวกรอง", "Filters")}</h3>
          <Button variant="ghost" size="sm" onClick={resetFilters}>{tx("รีเซ็ต", "Reset")}</Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
          <Input
            placeholder={tx("ค้นหา booking / UIC / สาขา / บริการ", "Search booking / UIC / clinic / service")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select value={filterVisit} onChange={(e) => setFilterVisit(e.target.value as any)} className="h-10 px-3 rounded-md border bg-background text-sm">
            <option value="all">{tx("ทุกครั้ง", "All visits")}</option>
            <option value="first">{tx("ครั้งแรก", "First-time")}</option>
            <option value="repeat">{tx("กลับมาซ้ำ", "Repeat")}</option>
          </select>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value as any)} className="h-10 px-3 rounded-md border bg-background text-sm">
            <option value="all">{tx("ความเสี่ยงทั้งหมด", "All risk")}</option>
            <option value="high">{tx("สูง", "High")}</option>
            <option value="medium">{tx("กลาง", "Medium")}</option>
            <option value="low">{tx("ต่ำ", "Low")}</option>
          </select>
          <select value={filterMH} onChange={(e) => setFilterMH(e.target.value as any)} className="h-10 px-3 rounded-md border bg-background text-sm">
            <option value="all">{tx("MH ทั้งหมด", "All MH")}</option>
            <option value="yes">{tx("ใช่", "Yes")}</option>
            <option value="maybe">{tx("อาจจะ", "Maybe")}</option>
            <option value="no">{tx("ไม่", "No")}</option>
          </select>
          <select value={filterAnon} onChange={(e) => setFilterAnon(e.target.value as any)} className="h-10 px-3 rounded-md border bg-background text-sm">
            <option value="all">{tx("ผู้ใช้ทั้งหมด", "All identities")}</option>
            <option value="anon">{tx("ไม่เปิดเผยตัวตน", "Anonymous")}</option>
            <option value="user">{tx("ล็อกอินแล้ว", "Logged-in")}</option>
          </select>
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="h-10 px-3 rounded-md border bg-background text-sm">
            <option value="all">{tx("บริการทั้งหมด", "All services")}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{language === "th" ? s.name_th : s.name_en}</option>
            ))}
          </select>
        </div>
        {branches.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs text-muted-foreground self-center mr-1">{tx("สาขา:", "Clinics:")}</span>
            {branches.map((b) => {
              const active = filterClinics.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleClinic(b.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    active ? "bg-teal-600 text-white border-teal-600" : "bg-background hover:bg-muted"
                  }`}
                >
                  {language === "th" ? b.name_th : b.name_en}
                </button>
              );
            })}
            {filterClinics.length > 0 && (
              <button onClick={() => setFilterClinics([])} className="text-xs px-2 py-1 text-muted-foreground underline">
                {tx("ล้าง", "Clear")}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{tx("Booking", "Booking")}</th>
                <th className="px-3 py-2 text-left">UIC</th>
                <th className="px-3 py-2 text-left">{tx("สาขา", "Clinic")}</th>
                <th className="px-3 py-2 text-left">{tx("บริการ", "Service")}</th>
                <th className="px-3 py-2 text-center">{tx("ครั้งที่", "Visit #")}</th>
                <th className="px-3 py-2 text-left">{tx("ความเสี่ยง", "Risk")}</th>
                <th className="px-3 py-2 text-left">{tx("MH", "MH")}</th>
                <th className="px-3 py-2 text-left">{tx("ผู้ใช้", "Identity")}</th>
                <th className="px-3 py-2 text-left">{tx("ส่งเมื่อ", "Submitted")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <div className="font-medium">{tx("ยังไม่มีข้อมูลแบบสำรวจ", "No survey data yet")}</div>
                    <div className="text-xs mt-1">{tx("ลองปรับตัวกรองหรือรีเฟรช", "Try adjusting filters or refresh")}</div>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const risk = riskOf(r);
                  const isAnon = !r.appointments?.user_id;
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.booking_id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-mono text-xs">{maskUic(r.uic_code)}</td>
                      <td className="px-3 py-2 text-xs">{branchName(r.appointments?.branch_id)}</td>
                      <td className="px-3 py-2 text-xs">{serviceName(r.appointments?.service_id)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={r.visit_sequence > 1 ? "default" : "secondary"}>#{r.visit_sequence}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={
                          risk === "high" ? "bg-rose-500 text-white"
                            : risk === "medium" ? "bg-amber-500 text-white"
                            : "bg-emerald-500 text-white"
                        }>{risk}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{r.mental_health_interest || "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {isAnon
                          ? <span className="text-muted-foreground">{tx("ไม่ระบุตัวตน", "anon")}</span>
                          : <span className="text-teal-700 dark:text-teal-300">{tx("ล็อกอิน", "user")}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString(language === "th" ? "th-TH" : "en-GB")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
          <span>{tx("รวม", "Total")}: {filtered.length}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</Button>
            <span>{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>›</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "border-rose-300 bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function pct(n: number, total: number): string {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

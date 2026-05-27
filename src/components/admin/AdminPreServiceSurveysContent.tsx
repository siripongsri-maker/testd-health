import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ClipboardList, Users, Repeat, TrendingUp, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { maskUic } from "@/lib/uic";

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
  knowledge: Record<string, string> | null;
  behavior: Record<string, string> | null;
  created_at: string;
}

const PAGE_SIZE = 25;

function riskOf(row: Row): "high" | "medium" | "low" {
  // Heuristic: low confidence/safety or wants MH support = higher
  if (row.confidence !== null && row.confidence <= 2) return "high";
  if (row.mental_health_interest === "yes") return "high";
  if (row.safety !== null && row.safety <= 2) return "medium";
  if (row.confidence !== null && row.confidence === 3) return "medium";
  return "low";
}

export default function AdminPreServiceSurveysContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filterVisit, setFilterVisit] = useState<"all" | "first" | "repeat">("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "high" | "medium" | "low">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointment_pre_service_surveys")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) console.error("PRE_SURVEY_LOAD", error);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterVisit === "first" && r.visit_sequence !== 1) return false;
      if (filterVisit === "repeat" && r.visit_sequence < 2) return false;
      if (filterRisk !== "all" && riskOf(r) !== filterRisk) return false;
      if (search) {
        const s = search.toLowerCase();
        const hit =
          r.booking_id.toLowerCase().includes(s) ||
          (r.uic_code || "").toLowerCase().includes(s) ||
          (r.channel || "").toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, search, filterVisit, filterRisk]);

  const summary = useMemo(() => {
    const total = rows.length;
    const first = rows.filter((r) => r.visit_sequence === 1).length;
    const repeat = total - first;
    const avgVisits =
      total > 0 ? rows.reduce((s, r) => s + r.visit_sequence, 0) / total : 0;
    const highRisk = rows.filter((r) => riskOf(r) === "high").length;
    return { total, first, repeat, avgVisits, highRisk };
  }, [rows]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            {tx("แบบสำรวจก่อนรับบริการ", "Pre-Service Survey Responses")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tx(
              "ติดตามผู้ใช้แบบไม่เปิดเผยตัวตนด้วย UIC hash",
              "Anonymous longitudinal tracking via UIC hash",
            )}
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {tx("รีเฟรช", "Refresh")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label={tx("รวม", "Total")} value={summary.total} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label={tx("ครั้งแรก", "First visit")} value={summary.first} />
        <SummaryCard icon={<Repeat className="h-4 w-4" />} label={tx("กลับมาซ้ำ", "Repeat")} value={summary.repeat} />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label={tx("ค่าเฉลี่ยครั้ง", "Avg visits")} value={summary.avgVisits.toFixed(2)} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label={tx("ความเสี่ยงสูง", "High risk")} value={summary.highRisk} highlight />
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <Input
            placeholder={tx("ค้นหา booking id / UIC", "Search booking id / UIC")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            value={filterVisit}
            onChange={(e) => {
              setFilterVisit(e.target.value as any);
              setPage(0);
            }}
            className="h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">{tx("ทุกครั้ง", "All visits")}</option>
            <option value="first">{tx("ครั้งแรก", "First-time")}</option>
            <option value="repeat">{tx("กลับมาซ้ำ", "Repeat")}</option>
          </select>
          <select
            value={filterRisk}
            onChange={(e) => {
              setFilterRisk(e.target.value as any);
              setPage(0);
            }}
            className="h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">{tx("ความเสี่ยงทั้งหมด", "All risk")}</option>
            <option value="high">{tx("สูง", "High")}</option>
            <option value="medium">{tx("กลาง", "Medium")}</option>
            <option value="low">{tx("ต่ำ", "Low")}</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{tx("Booking", "Booking")}</th>
                <th className="px-3 py-2 text-left">UIC</th>
                <th className="px-3 py-2 text-center">{tx("ครั้งที่", "Visit #")}</th>
                <th className="px-3 py-2 text-left">{tx("ช่องทาง", "Channel")}</th>
                <th className="px-3 py-2 text-left">{tx("ส่งเมื่อ", "Submitted")}</th>
                <th className="px-3 py-2 text-left">{tx("ความเสี่ยง", "Risk")}</th>
                <th className="px-3 py-2 text-left">{tx("MH", "MH")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    {tx("ยังไม่มีข้อมูล", "No responses yet")}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const risk = riskOf(r);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.booking_id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-mono text-xs">{maskUic(r.uic_code)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={r.visit_sequence > 1 ? "default" : "secondary"}>
                          #{r.visit_sequence}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{r.channel || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString(language === "th" ? "th-TH" : "en-GB")}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          className={
                            risk === "high"
                              ? "bg-rose-500 text-white"
                              : risk === "medium"
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-500 text-white"
                          }
                        >
                          {risk}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{r.mental_health_interest || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
          <span>
            {tx("รวม", "Total")}: {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ‹
            </Button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-3 ${highlight ? "border-rose-300 bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

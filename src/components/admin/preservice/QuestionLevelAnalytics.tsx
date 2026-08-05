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
import { Loader2, RefreshCw, Download, BarChart3, MessageSquareQuote, Grid3x3, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, type CsvColumn } from "@/lib/adminCsvExport";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/* Types mirrored from the DB RPCs                                     */
/* ------------------------------------------------------------------ */

export interface QuestionStat {
  question_key: string;
  label_th: string;
  label_en: string;
  answer_type: "yes_no_unsure" | "scale" | "text" | "choice";
  group_key: string | null;
  display_order: number;
  collected_from: string | null;
  collected_to: string | null;
  total_responses: number;
  answered: number;
  skipped: number;
  skip_rate: number;
  distribution: Record<string, number>;
  mean_value: number | null;
  median_value: number | null;
}

interface CrosstabRow { dim_value: string; answer_value: string | null; cnt: number }
interface OpenTextRow { keyword: string; cnt: number; sample: string | null }
interface BranchInfo { id: string; name_th: string; name_en: string }

export interface QuestionFilters {
  from: string;
  to: string;
  branchIds: string[];
  channel: string;
  risk: "all" | "high" | "medium" | "low";
  anon: "all" | "anon" | "user";
  visit: "all" | "first" | "repeat";
}

const ANSWER_COLORS: Record<string, string> = {
  yes: "#10b981", no: "#f43f5e", unsure: "#f59e0b", maybe: "#f59e0b",
};
const SCALE_COLORS = ["#f43f5e", "#fb923c", "#f59e0b", "#34d399", "#0d9488"];

const DIMENSIONS = [
  { value: "branch", th: "สาขา", en: "Branch" },
  { value: "visit", th: "ครั้งแรก / กลับมาซ้ำ", en: "First / repeat" },
  { value: "risk", th: "ระดับความเสี่ยง", en: "Risk level" },
  { value: "channel", th: "ช่องทาง", en: "Channel" },
  { value: "language", th: "ภาษา", en: "Language" },
  { value: "month", th: "ช่วงเวลา (รายเดือน)", en: "Month" },
] as const;

/** Build the RPC argument object from page-local filter state.
 *  Kept local to this page so shared helpers stay untouched. */
function rpcArgs(f: QuestionFilters) {
  return {
    p_from: f.from ? new Date(`${f.from}T00:00:00+07:00`).toISOString() : null,
    p_to: f.to ? new Date(`${f.to}T23:59:59+07:00`).toISOString() : null,
    p_branch_ids: f.branchIds.length ? f.branchIds : null,
    p_channels: f.channel === "all" ? null : [f.channel],
    p_risk: f.risk,
    p_anon: f.anon,
    p_visit: f.visit,
  };
}

export default function QuestionLevelAnalytics() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { user } = useAuth();
  const { role } = useAdminRole();

  const [filters, setFilters] = useState<QuestionFilters>({
    from: "",
    to: format(new Date(), "yyyy-MM-dd"),
    branchIds: [],
    channel: "all",
    risk: "all",
    anon: "all",
    visit: "all",
  });

  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [openText, setOpenText] = useState<OpenTextRow[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [ctQuestion, setCtQuestion] = useState<string>("b_condom");
  const [ctDimension, setCtDimension] = useState<string>("branch");
  const [ctRows, setCtRows] = useState<CrosstabRow[]>([]);
  const [ctLoading, setCtLoading] = useState(false);

  const branchName = useCallback(
    (id: string) => {
      const b = branches.find((x) => x.id === id);
      if (!b) return tx("ไม่ระบุสาขา", "Unknown branch");
      return language === "th" ? b.name_th : b.name_en;
    },
    [branches, language],
  );

  /* ---------------- data loading ---------------- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args = rpcArgs(filters);
      const [statRes, textRes] = await Promise.all([
        supabase.rpc("get_pre_service_question_stats", args as any),
        supabase.rpc("get_pre_service_open_text", { ...args, p_limit: 25 } as any),
      ]);
      if (statRes.error) throw statRes.error;
      setStats((statRes.data || []) as unknown as QuestionStat[]);
      if (!textRes.error) setOpenText((textRes.data || []) as unknown as OpenTextRow[]);
    } catch (err: any) {
      console.error("QUESTION_STATS_ERROR", err);
      toast({
        title: tx("โหลดผลรายคำถามไม่สำเร็จ", "Failed to load per-question results"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCrosstab = useCallback(async () => {
    setCtLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_pre_service_crosstab", {
        p_question_key: ctQuestion,
        p_dimension: ctDimension,
        ...rpcArgs(filters),
      } as any);
      if (error) throw error;
      setCtRows((data || []) as unknown as CrosstabRow[]);
    } catch (err: any) {
      console.error("CROSSTAB_ERROR", err);
      setCtRows([]);
    } finally {
      setCtLoading(false);
    }
  }, [ctQuestion, ctDimension, filters]);

  useEffect(() => {
    (async () => {
      const [{ data: br }, { data: ch }] = await Promise.all([
        supabase.from("booking_branches").select("id, name_th, name_en"),
        supabase.from("appointment_pre_service_surveys").select("channel").not("channel", "is", null).limit(500),
      ]);
      setBranches((br || []) as BranchInfo[]);
      setChannels(Array.from(new Set(((ch || []) as any[]).map((r) => r.channel).filter(Boolean))));
    })();
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCrosstab(); }, [loadCrosstab]);

  /* ---------------- exports ---------------- */
  const watermark = user
    ? { userId: user.id, role: role || "staff", timestamp: Date.now(), module: "pre_q" }
    : undefined;

  const exportSummary = () => {
    const cols: CsvColumn<QuestionStat>[] = [
      { key: "question_key", header: "question_key" },
      { key: "label_th", header: "คำถาม (TH)" },
      { key: "answer_type", header: "ชนิดคำตอบ" },
      { key: "answered", header: "จำนวนผู้ตอบ (n)" },
      { key: "skipped", header: "ข้ามข้อ" },
      { key: "skip_rate", header: "อัตราข้ามข้อ (%)" },
      { key: "mean", header: "ค่าเฉลี่ย", format: (r) => (r.mean_value ?? "") + "" },
      { key: "median", header: "มัธยฐาน", format: (r) => (r.median_value ?? "") + "" },
      {
        key: "dist", header: "การกระจายคำตอบ",
        format: (r) => Object.entries(r.distribution || {}).map(([k, v]) => `${k}=${v}`).join(" | "),
      },
      {
        key: "collected", header: "เริ่มเก็บข้อมูล",
        format: (r) => (r.collected_from ? format(new Date(r.collected_from), "yyyy-MM-dd") : "ไม่ได้เก็บ"),
      },
    ];
    exportToCsv(stats, cols, "pre_service_question_summary", { from: filters.from, to: filters.to }, watermark);
  };

  const exportRowLevel = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("get_pre_service_rowlevel_export", {
        ...rpcArgs(filters), p_limit: 20000,
      } as any);
      if (error) throw error;
      const rows = (data || []) as any[];
      if (!rows.length) {
        toast({ title: tx("ไม่มีข้อมูลตามตัวกรองนี้", "No data for this filter") });
        return;
      }
      const answerKeys = Array.from(
        new Set(rows.flatMap((r) => Object.keys(r.answers || {}))),
      );
      const cols: CsvColumn<any>[] = [
        { key: "uic_hash", header: "UIC hash" },
        { key: "created_at", header: "วันที่ตอบ", format: (r) => format(new Date(r.created_at), "yyyy-MM-dd HH:mm") },
        { key: "branch", header: "สาขา", format: (r) => (r.branch_id ? branchName(r.branch_id) : "") },
        { key: "channel", header: "ช่องทาง" },
        { key: "language", header: "ภาษา" },
        { key: "visit_type", header: "ครั้งแรก/ซ้ำ" },
        { key: "risk_level", header: "ระดับความเสี่ยง" },
        { key: "is_anonymous", header: "ไม่ระบุตัวตน", format: (r) => (r.is_anonymous ? "yes" : "no") },
        ...answerKeys.map((k) => ({
          key: k, header: k,
          format: (r: any) => (r.answers?.[k] === null || r.answers?.[k] === undefined ? "" : String(r.answers[k])),
        })),
      ];
      exportToCsv(rows, cols, "pre_service_rowlevel_deidentified", { from: filters.from, to: filters.to }, watermark);
    } catch (err: any) {
      toast({
        title: tx("ส่งออกไม่สำเร็จ", "Export failed"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- derived ---------------- */
  const chartableStats = useMemo(() => stats.filter((s) => s.answer_type !== "text"), [stats]);
  const crosstabMatrix = useMemo(() => {
    const dims = Array.from(new Set(ctRows.map((r) => r.dim_value)));
    const answers = Array.from(new Set(ctRows.map((r) => r.answer_value ?? "—")));
    return { dims, answers };
  }, [ctRows]);

  const totalN = stats[0]?.total_responses ?? 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">{tx("ตั้งแต่วันที่", "From")}</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ถึงวันที่", "To")}</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("สาขา", "Branch")}</Label>
            <Select
              value={filters.branchIds[0] || "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, branchIds: v === "all" ? [] : [v] }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกสาขา", "All branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{language === "th" ? b.name_th : b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ช่องทาง", "Channel")}</Label>
            <Select value={filters.channel} onValueChange={(v) => setFilters((f) => ({ ...f, channel: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกช่องทาง", "All channels")}</SelectItem>
                {channels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ระดับความเสี่ยง", "Risk level")}</Label>
            <Select value={filters.risk} onValueChange={(v) => setFilters((f) => ({ ...f, risk: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกระดับ", "All")}</SelectItem>
                <SelectItem value="high">{tx("สูง", "High")}</SelectItem>
                <SelectItem value="medium">{tx("ปานกลาง", "Medium")}</SelectItem>
                <SelectItem value="low">{tx("ต่ำ", "Low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("การระบุตัวตน", "Identity")}</Label>
            <Select value={filters.anon} onValueChange={(v) => setFilters((f) => ({ ...f, anon: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทั้งหมด", "All")}</SelectItem>
                <SelectItem value="user">{tx("ระบุตัวตน", "Identified")}</SelectItem>
                <SelectItem value="anon">{tx("ไม่ระบุตัวตน", "Anonymous")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ครั้งแรก / กลับมาซ้ำ", "First / repeat")}</Label>
            <Select value={filters.visit} onValueChange={(v) => setFilters((f) => ({ ...f, visit: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทั้งหมด", "All")}</SelectItem>
                <SelectItem value="first">{tx("ครั้งแรก", "First visit")}</SelectItem>
                <SelectItem value="repeat">{tx("กลับมาซ้ำ", "Repeat")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportSummary} disabled={loading || !stats.length}>
              <Download className="h-4 w-4 mr-1" />{tx("สรุปรายคำถาม", "Summary")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportRowLevel} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              {tx("รายแถว (ไม่ระบุตัวตน)", "Row-level")}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {tx(
            `คำนวณฝั่งฐานข้อมูลทั้งหมด · ครอบคลุมข้อมูลย้อนหลังทุกแถวที่มีในระบบ (${totalN.toLocaleString()} แบบสำรวจตามตัวกรองนี้)`,
            `Aggregated in the database · covers all historical rows (${totalN.toLocaleString()} surveys in this filter)`,
          )}
        </p>
      </Card>

      {/* Per-question cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {chartableStats.map((q) => {
            const entries = Object.entries(q.distribution || {}).sort((a, b) =>
              q.answer_type === "scale" ? Number(a[0]) - Number(b[0]) : b[1] - a[1],
            );
            const chartData = entries.map(([k, v]) => ({ name: k, value: v }));
            const notCollected = q.answered === 0 && q.skipped === q.total_responses;
            return (
              <Card key={q.question_key} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{language === "th" ? q.label_th : q.label_en}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{q.question_key}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{q.answer_type}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>n = <b className="text-foreground">{q.answered.toLocaleString()}</b></span>
                  <span>{tx("ข้ามข้อ", "Skipped")} {q.skip_rate}%</span>
                  {q.mean_value !== null && <span>{tx("เฉลี่ย", "Mean")} {q.mean_value}</span>}
                  {q.median_value !== null && <span>{tx("มัธยฐาน", "Median")} {q.median_value}</span>}
                </div>

                {notCollected ? (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-4 text-xs text-muted-foreground">
                    <Info className="h-4 w-4" />
                    {tx("ไม่ได้เก็บข้อมูลในช่วงนี้ (ไม่ใช่ค่า 0)", "Not collected in this period (not a zero)")}
                  </div>
                ) : (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {chartData.map((d, i) => (
                            <Cell
                              key={d.name}
                              fill={ANSWER_COLORS[d.name] || SCALE_COLORS[i % SCALE_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {q.collected_from
                    ? tx(
                        `เริ่มเก็บข้อมูล ${format(new Date(q.collected_from), "d MMM yyyy")}`,
                        `Collected since ${format(new Date(q.collected_from), "d MMM yyyy")}`,
                      )
                    : tx("ยังไม่มีข้อมูลย้อนหลัง", "No historical data")}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cross-tab */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{tx("ตารางไขว้ (Cross-tab)", "Cross-tab")}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={ctQuestion} onValueChange={setCtQuestion}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {chartableStats.map((q) => (
                <SelectItem key={q.question_key} value={q.question_key}>
                  {language === "th" ? q.label_th : q.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ctDimension} onValueChange={setCtDimension}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{language === "th" ? d.th : d.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ctLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : ctRows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">{tx("ไม่มีข้อมูล", "No data")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium">
                    {DIMENSIONS.find((d) => d.value === ctDimension)?.[language === "th" ? "th" : "en"]}
                  </th>
                  {crosstabMatrix.answers.map((a) => (
                    <th key={a} className="text-right py-2 px-2 font-medium">{a}</th>
                  ))}
                  <th className="text-right py-2 pl-2 font-medium">{tx("รวม", "Total")}</th>
                </tr>
              </thead>
              <tbody>
                {crosstabMatrix.dims.map((dim) => {
                  const cells = crosstabMatrix.answers.map(
                    (a) => ctRows.find((r) => r.dim_value === dim && (r.answer_value ?? "—") === a)?.cnt ?? 0,
                  );
                  const total = cells.reduce((s, c) => s + Number(c), 0);
                  return (
                    <tr key={dim} className="border-b last:border-0">
                      <td className="py-2 pr-3">{ctDimension === "branch" ? branchName(dim) : dim}</td>
                      {cells.map((c, i) => (
                        <td key={i} className="text-right py-2 px-2 tabular-nums">
                          {c}
                          {total > 0 && <span className="text-muted-foreground"> ({Math.round((Number(c) / total) * 100)}%)</span>}
                        </td>
                      ))}
                      <td className="text-right py-2 pl-2 font-medium tabular-nums">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Open-ended */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{tx("คำตอบปลายเปิด — จัดกลุ่มด้วยคำสำคัญ", "Open-ended — keyword groups")}</h3>
        </div>
        {openText.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tx("ไม่มีคำตอบปลายเปิดในช่วงนี้", "No open-ended answers in this period")}</p>
        ) : (
          <div className="space-y-2">
            {openText.map((k) => (
              <div key={k.keyword} className="flex items-start gap-3 text-xs border-b last:border-0 pb-2">
                <Badge variant="secondary" className="shrink-0">{k.keyword}</Badge>
                <span className="font-medium tabular-nums shrink-0">{k.cnt}</span>
                <span className="text-muted-foreground line-clamp-2">{k.sample}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 flex items-start gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          {tx(
            "หมายเหตุ: เครื่องมือคัดกรองมาตรฐาน (PHQ-4, AUDIT-C, ASSIST) ไม่ได้ถูกเก็บในแบบสำรวจก่อนรับบริการ จึงยังไม่แสดงคะแนนรายข้อและ band ในหน้านี้ — ข้อมูลชุดนั้นอยู่ในระบบ Harm Reduction แยกกัน",
            "Note: standardised screeners (PHQ-4, AUDIT-C, ASSIST) are not captured in the pre-service survey, so item scores and severity bands are not shown here — that data lives in the separate Harm Reduction system.",
          )}
        </p>
      </Card>
    </div>
  );
}

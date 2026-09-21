import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Search, Loader2, History, ExternalLink, Download, RefreshCw, QrCode,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/adminCsvExport";

/**
 * Client service history — every person who has ever used the service,
 * grouped by UIC, with follow-up stage (survey → counseling → evaluation →
 * travel allowance) and a link into the MEL service ledger.
 */

interface Props {
  branchFilter?: string;
  onBranchChange?: (v: string) => void;
}

interface HistoryRow {
  uic_hash: string;
  uic_display: string | null;
  visits: number;
  first_visit: string;
  last_visit: string;
  last_branch_id: string | null;
  last_branch_name_th: string | null;
  last_branch_name_en: string | null;
  appointments_count: number;
  completed_visits: number;
  note_status: string | null;
  counseling_completed_at: string | null;
  evaluations: number;
  last_evaluation_at: string | null;
  mel_events: number;
  claim_status: string | null;
  stage: string;
  total_count: number;
}

interface TimelineRow {
  survey_id: string;
  survey_at: string;
  uic_display: string | null;
  branch_id: string | null;
  branch_name_th: string | null;
  branch_name_en: string | null;
  appointment_id: string | null;
  appointment_date: string | null;
  appointment_status: string | null;
  note_id: string | null;
  note_status: string | null;
  counseling_completed_at: string | null;
  post_eval_token: string | null;
  evaluation_submitted_at: string | null;
  satisfaction_score: number | null;
  mel_event_count: number;
  claim_status: string | null;
}

const PAGE_SIZE = 50;

const STAGES: { key: string; th: string; en: string; cls: string }[] = [
  { key: "survey_only", th: "ตอบแบบสำรวจแล้ว รอพบผู้ให้คำปรึกษา", en: "Survey only", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "in_counseling", th: "อยู่ระหว่างดูแล", en: "In counseling", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  { key: "awaiting_evaluation", th: "ให้คำปรึกษาแล้ว รอตอบแบบประเมิน", en: "Awaiting evaluation", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  { key: "evaluated", th: "ตอบแบบประเมินแล้ว", en: "Evaluated", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "paid", th: "จ่ายค่าเดินทางแล้ว", en: "Allowance paid", cls: "bg-teal-100 text-teal-800 border-teal-200" },
];

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso)) : "—";
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(iso)) : "—";

export default function AdminClientHistoryContent({ branchFilter = "all", onBranchChange }: Props) {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stage, setStage] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<HistoryRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const args = useMemo(() => ({
    _search: search || null,
    _branch: branchFilter === "all" ? null : branchFilter,
    _stage: stage === "all" ? null : stage,
    _from: from || null,
    _to: to || null,
  }), [search, branchFilter, stage, from, to]);

  const load = async () => {
    setLoading(true);
    const [list, st] = await Promise.all([
      supabase.rpc("get_client_service_history", { ...args, _limit: PAGE_SIZE, _offset: page * PAGE_SIZE } as any),
      supabase.rpc("get_client_service_history_stats", {
        _branch: args._branch, _from: args._from, _to: args._to,
      } as any),
    ]);
    if (list.error) {
      toast({ title: tx("โหลดประวัติไม่สำเร็จ", "Failed to load history"), description: list.error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((list.data as any as HistoryRow[]) || []);
    }
    if (!st.error) setStats((st.data as any[])?.[0] ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [args, page]);
  useEffect(() => { setPage(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [args]);

  const openTimeline = async (row: HistoryRow) => {
    setSelected(row);
    setTimelineLoading(true);
    const { data, error } = await supabase.rpc("get_client_visit_timeline", { _uic_hash: row.uic_hash } as any);
    if (error) toast({ title: tx("โหลดไทม์ไลน์ไม่สำเร็จ", "Failed to load timeline"), variant: "destructive" });
    setTimeline(((data as any) || []) as TimelineRow[]);
    setTimelineLoading(false);
  };

  const exportCsv = async () => {
    const all: HistoryRow[] = [];
    for (let i = 0; i < 40; i++) {
      const { data, error } = await supabase.rpc("get_client_service_history", { ...args, _limit: 200, _offset: i * 200 } as any);
      if (error) break;
      const chunk = (data as any as HistoryRow[]) || [];
      all.push(...chunk);
      if (chunk.length < 200) break;
    }
    exportToCsv<HistoryRow>(
      all,
      [
        { key: "uic", header: "UIC", format: (r) => r.uic_display ?? "" },
        { key: "visits", header: "จำนวนครั้ง", format: (r) => String(r.visits) },
        { key: "first", header: "ครั้งแรก", format: (r) => fmtDate(r.first_visit) },
        { key: "last", header: "ครั้งล่าสุด", format: (r) => fmtDate(r.last_visit) },
        { key: "branch", header: "สาขาล่าสุด", format: (r) => r.last_branch_name_th ?? "" },
        { key: "appts", header: "นัดหมาย", format: (r) => String(r.appointments_count) },
        { key: "done", header: "รับบริการสำเร็จ", format: (r) => String(r.completed_visits) },
        { key: "note", header: "สถานะเคส", format: (r) => r.note_status ?? "" },
        { key: "eval", header: "ตอบแบบประเมิน", format: (r) => (r.evaluations > 0 ? "ตอบแล้ว" : "ยังไม่ตอบ") },
        { key: "stage", header: "ขั้นตอน", format: (r) => STAGES.find((s) => s.key === r.stage)?.th ?? r.stage },
        { key: "mel", header: "รายการ MEL", format: (r) => String(r.mel_events) },
        { key: "claim", header: "ค่าเดินทาง", format: (r) => r.claim_status ?? "" },
      ],
      "client_service_history",
    );
  };

  const total = rows[0]?.total_count ?? 0;
  const maxPage = Math.max(0, Math.ceil(Number(total) / PAGE_SIZE) - 1);

  const stageBadge = (key: string) => {
    const s = STAGES.find((x) => x.key === key);
    return <Badge variant="outline" className={s?.cls}>{s ? tx(s.th, s.en) : key}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: tx("ผู้รับบริการทั้งหมด", "Clients"), value: stats?.clients },
          { label: tx("ครั้งที่รับบริการ", "Visits"), value: stats?.visits },
          { label: tx("กลับมาซ้ำ", "Returning"), value: stats?.returning_clients },
          { label: tx("รอตอบแบบประเมิน", "Awaiting eval."), value: stats?.awaiting_evaluation },
          { label: tx("ตอบแบบประเมินแล้ว", "Evaluated"), value: stats?.evaluated },
          { label: tx("อยู่ระหว่างดูแล", "In counseling"), value: stats?.in_counseling },
          { label: tx("ยังไม่ได้พบผู้ให้คำปรึกษา", "Survey only"), value: stats?.survey_only },
        ].map((k) => (
          <Card key={k.label} className="p-3">
            <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
            <p className="text-2xl font-bold text-teal-700">{k.value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{tx("ค้นหา UIC", "Search UIC")}</Label>
            <div className="flex gap-1">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput.trim()); }}
                placeholder={tx("เช่น ชว280347", "e.g. ชว280347")}
                className="w-56"
              />
              <Button variant="outline" size="icon" onClick={() => setSearch(searchInput.trim())} aria-label={tx("ค้นหา", "Search")}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ขั้นตอนการติดตาม", "Follow-up stage")}</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกขั้นตอน", "All stages")}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{tx(s.th, s.en)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ตั้งแต่วันที่", "From")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("ถึงวันที่", "To")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />{tx("รีเฟรช", "Refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />CSV
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href="/admin?tab=mel-services"><ExternalLink className="h-4 w-4" />{tx("เปิดบันทึกบริการ MEL", "MEL service ledger")}</a>
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            {tx("ไม่พบผู้รับบริการตามเงื่อนไขที่เลือก", "No clients match these filters")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left p-3 font-medium">UIC</th>
                  <th className="text-left p-3 font-medium">{tx("ครั้ง", "Visits")}</th>
                  <th className="text-left p-3 font-medium">{tx("ครั้งแรก", "First")}</th>
                  <th className="text-left p-3 font-medium">{tx("ล่าสุด", "Last")}</th>
                  <th className="text-left p-3 font-medium">{tx("สาขาล่าสุด", "Branch")}</th>
                  <th className="text-left p-3 font-medium">{tx("แบบประเมินหลังคำปรึกษา", "Post-eval")}</th>
                  <th className="text-left p-3 font-medium">{tx("ขั้นตอน", "Stage")}</th>
                  <th className="text-left p-3 font-medium">MEL</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uic_hash} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono font-medium">{r.uic_display || "—"}</td>
                    <td className="p-3">
                      {r.visits}
                      {r.visits > 1 && <Badge variant="outline" className="ml-1.5 text-[10px]">{tx("กลับมาซ้ำ", "returning")}</Badge>}
                    </td>
                    <td className="p-3 text-xs">{fmtDate(r.first_visit)}</td>
                    <td className="p-3 text-xs">{fmtDate(r.last_visit)}</td>
                    <td className="p-3 text-xs">{(language === "th" ? r.last_branch_name_th : r.last_branch_name_en) || "—"}</td>
                    <td className="p-3">
                      {r.evaluations > 0 ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">{tx("ตอบแล้ว", "Submitted")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">{tx("ยังไม่ตอบ", "Not yet")}</Badge>
                      )}
                    </td>
                    <td className="p-3">{stageBadge(r.stage)}</td>
                    <td className="p-3 text-xs">{r.mel_events > 0 ? `${r.mel_events} ${tx("รายการ", "events")}` : "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openTimeline(r)}>
                        <History className="h-3.5 w-3.5" />{tx("ประวัติ", "History")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground no-print">
        <span>{tx("ทั้งหมด", "Total")} {Number(total).toLocaleString()} {tx("คน", "clients")}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            {tx("ก่อนหน้า", "Previous")}
          </Button>
          <span>{page + 1} / {maxPage + 1}</span>
          <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
            {tx("ถัดไป", "Next")}
          </Button>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setTimeline([]); } }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">{selected?.uic_display || tx("ประวัติผู้รับบริการ", "Client history")}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">{tx("รับบริการทั้งหมด", "Total visits")}</p>
                  <p className="font-semibold">{selected.visits}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">{tx("ขั้นตอนล่าสุด", "Current stage")}</p>
                  <div className="mt-1">{stageBadge(selected.stage)}</div>
                </div>
              </div>

              {timelineLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-teal-600" /></div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((t, i) => (
                    <div key={t.survey_id} className="rounded-xl border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {tx("ครั้งที่", "Visit")} {timeline.length - i} · {fmt(t.survey_at)}
                        </span>
                        {t.evaluation_submitted_at ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">{tx("ประเมินแล้ว", "Evaluated")}</Badge>
                        ) : t.post_eval_token ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">{tx("รอตอบแบบประเมิน", "Awaiting eval.")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tx("สาขา", "Branch")}: {(language === "th" ? t.branch_name_th : t.branch_name_en) || "—"}
                        {t.appointment_date && ` · ${tx("นัดหมาย", "Appointment")} ${t.appointment_date} (${t.appointment_status})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx("สถานะเคส", "Case status")}: {t.note_status || tx("ยังไม่บันทึก", "not recorded")}
                        {t.counseling_completed_at && ` · ${tx("ปิดเคส", "closed")} ${fmt(t.counseling_completed_at)}`}
                      </p>
                      {t.satisfaction_score != null && (
                        <p className="text-xs text-muted-foreground">{tx("คะแนนความพึงพอใจ", "Satisfaction")}: {t.satisfaction_score}/5</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        MEL: {t.mel_event_count > 0 ? `${t.mel_event_count} ${tx("รายการ", "events")}` : tx("ยังไม่มีบันทึก", "no record")}
                        {t.claim_status && ` · ${tx("ค่าเดินทาง", "Allowance")}: ${t.claim_status}`}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {t.post_eval_token && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5" asChild>
                              <a href={`/post-counseling-qr/${t.post_eval_token}`} target="_blank" rel="noreferrer">
                                <QrCode className="h-3.5 w-3.5" />{tx("QR แบบประเมิน", "Eval QR")}
                              </a>
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/post-counseling/${t.post_eval_token}`);
                              toast({ title: tx("คัดลอกลิงก์แล้ว", "Link copied") });
                            }}>
                              {tx("คัดลอกลิงก์", "Copy link")}
                            </Button>
                          </>
                        )}
                        {t.branch_id && (
                          <Button size="sm" variant="ghost" className="gap-1.5" asChild>
                            <a href="/admin?tab=mel-services" target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />{tx("ดูใน MEL", "Open in MEL")}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">{tx("ไม่พบประวัติ", "No history")}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

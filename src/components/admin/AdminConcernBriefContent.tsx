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
import { Loader2, RefreshCw, Download, Brain, HeartHandshake, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, type CsvColumn } from "@/lib/adminCsvExport";
import { CONCERNS } from "@/components/booking/ConcernSelector";
import PrintButton from "./PrintButton";

/**
 * Daily "what are people worried about" brief.
 *
 * Reads the plain-language concern + optional PHQ-4 screening summary that the
 * booking flow appends to the appointment note, so counselors can see the shape
 * of the day before clients reach the queue.
 */

interface Row {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  branch_id: string;
  referral_code: string | null;
}

interface BranchInfo { id: string; name_th: string; name_en: string }

interface Parsed {
  row: Row;
  concernIds: string[];
  phq4: number | null;
  mentalInterest: boolean;
  hrInterest: boolean;
}

const ACTIVE_STATUSES = ["booked", "confirmed", "pending", "arrived", "checked_in", "waiting", "in_progress"];

function parseNotes(row: Row): Parsed {
  const notes = row.notes || "";
  const concernIds: string[] = [];
  const concernLine = notes.split("\n").find((l) => l.startsWith("เรื่องที่กังวล:"));
  if (concernLine) {
    const body = concernLine.replace("เรื่องที่กังวล:", "");
    CONCERNS.forEach((c) => { if (body.includes(c.th)) concernIds.push(c.id); });
  }
  const phqMatch = notes.match(/PHQ-4[^:]*:\s*(\d+)\s*\/\s*12/);
  return {
    row,
    concernIds,
    phq4: phqMatch ? Number(phqMatch[1]) : null,
    mentalInterest: notes.includes("สนใจคุยเรื่องสุขภาพจิต: ใช่"),
    hrInterest: notes.includes("สนใจคุยเรื่องลดอันตราย"),
  };
}

export default function AdminConcernBriefContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("booking_branches").select("id, name_th, name_en").then(({ data }) => {
      setBranches((data || []) as BranchInfo[]);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("appointments")
        .select("id, appointment_date, start_time, status, notes, branch_id, referral_code")
        .eq("appointment_date", day)
        .order("start_time");
      if (branchFilter !== "all") q = q.eq("branch_id", branchFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as Row[]);
    } catch (err: any) {
      toast({
        title: tx("โหลดสรุปเรื่องที่กังวลไม่สำเร็จ", "Failed to load concern brief"),
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [day, branchFilter]);

  useEffect(() => { load(); }, [load]);

  // Keep the board fresh while the day runs
  useEffect(() => {
    const channel = supabase
      .channel("concern-brief")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const parsed = useMemo(() => rows.map(parseNotes), [rows]);
  const active = useMemo(
    () => parsed.filter((p) => ACTIVE_STATUSES.includes(p.row.status)),
    [parsed],
  );

  const stats = useMemo(() => {
    const withScreening = parsed.filter((p) => p.concernIds.length > 0 || p.phq4 !== null);
    return {
      total: parsed.length,
      active: active.length,
      withScreening: withScreening.length,
      mental: parsed.filter((p) => p.mentalInterest).length,
      hr: parsed.filter((p) => p.hrInterest).length,
      phqFlagged: parsed.filter((p) => p.phq4 !== null && p.phq4 >= 3).length,
    };
  }, [parsed, active]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    parsed.forEach((p) => p.concernIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    return CONCERNS
      .map((c) => ({ concern: c, count: counts.get(c.id) || 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [parsed]);

  const maxTopic = Math.max(1, ...topics.map((t) => t.count));

  const branchName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    return b ? (language === "th" ? b.name_th : b.name_en) : tx("ไม่ระบุสาขา", "Unknown branch");
  };

  const handleExport = () => {
    const columns: CsvColumn<Parsed>[] = [
      { key: "time", header: tx("เวลา", "Time"), format: (p) => p.row.start_time?.slice(0, 5) || "" },
      { key: "branch", header: tx("สาขา", "Branch"), format: (p) => branchName(p.row.branch_id) },
      { key: "code", header: tx("รหัส", "Code"), format: (p) => p.row.referral_code || "" },
      { key: "status", header: tx("สถานะ", "Status"), format: (p) => p.row.status },
      {
        key: "concerns",
        header: tx("เรื่องที่กังวล", "Concerns"),
        format: (p) => p.concernIds
          .map((id) => CONCERNS.find((c) => c.id === id))
          .map((c) => (c ? (language === "th" ? c.th : c.en) : ""))
          .join(" | "),
      },
      { key: "phq4", header: "PHQ-4", format: (p) => (p.phq4 === null ? "" : `${p.phq4}/12`) },
      { key: "mental", header: tx("สนใจสุขภาพจิต", "Mental health interest"), format: (p) => (p.mentalInterest ? "Y" : "") },
      { key: "hr", header: tx("สนใจลดอันตราย", "Harm reduction interest"), format: (p) => (p.hrInterest ? "Y" : "") },
    ];
    exportToCsv(parsed, columns, `concern-brief-${day}`);
  };

  const kpi = [
    { icon: Users, label: tx("นัดหมายวันนี้", "Appointments today"), value: stats.total, tone: "text-primary" },
    { icon: Clock, label: tx("ยังไม่ถึงคิว/กำลังรอ", "Still in queue"), value: stats.active, tone: "text-blue-600 dark:text-blue-400" },
    { icon: HeartHandshake, label: tx("ระบุเรื่องที่กังวล", "Shared a concern"), value: stats.withScreening, tone: "text-emerald-600 dark:text-emerald-400" },
    { icon: Brain, label: tx("PHQ-4 ≥ 3", "PHQ-4 ≥ 3"), value: stats.phqFlagged, tone: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">{tx("วันที่", "Date")}</Label>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">{tx("สาขา", "Branch")}</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tx("ทุกสาขา", "All branches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{language === "th" ? b.name_th : b.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1">{tx("รีเฟรช", "Refresh")}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!parsed.length}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
        <PrintButton documentTitle={`concern-brief-${day}`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpi.map((k) => (
          <Card key={k.label} className="p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <k.icon className={`h-4 w-4 ${k.tone}`} />
              {k.label}
            </div>
            <p className="text-2xl font-bold mt-1 tabular-nums">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 rounded-2xl">
        <h3 className="font-semibold text-sm mb-3">
          {tx("หัวข้อที่คนกังวลมากที่สุดวันนี้", "Top concerns today")}
        </h3>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tx("ยังไม่มีผู้รับบริการระบุเรื่องที่กังวลในวันนี้", "No one has shared a concern for this day yet.")}
          </p>
        ) : (
          <div className="space-y-2">
            {topics.map(({ concern, count }) => (
              <div key={concern.id} className="flex items-center gap-3">
                <span className="w-6 text-center">{concern.emoji}</span>
                <span className="flex-1 text-sm">{language === "th" ? concern.th : concern.en}</span>
                <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(count / maxTopic) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-bold tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            {tx("สนใจคุยสุขภาพจิต", "Mental health interest")}: {stats.mental}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <HeartHandshake className="h-3 w-3 mr-1" />
            {tx("สนใจลดอันตราย/chemsex", "Harm reduction interest")}: {stats.hr}
          </Badge>
        </div>
      </Card>

      <Card className="p-4 rounded-2xl">
        <h3 className="font-semibold text-sm mb-3">
          {tx("รายคิว (เรียงตามเวลานัด)", "Per client (by appointment time)")}
        </h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : parsed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("ไม่มีนัดหมายในวันนี้", "No appointments for this day.")}</p>
        ) : (
          <div className="space-y-2">
            {parsed.map((p) => (
              <div key={p.row.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{p.row.start_time?.slice(0, 5)}</span>
                  <span className="text-xs text-muted-foreground">{branchName(p.row.branch_id)}</span>
                  {p.row.referral_code && (
                    <span className="text-xs font-mono text-muted-foreground">{p.row.referral_code}</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">{p.row.status}</Badge>
                  {p.phq4 !== null && (
                    <Badge
                      className={`text-[10px] ${p.phq4 >= 6
                        ? "bg-rose-600 text-white"
                        : p.phq4 >= 3
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"}`}
                    >
                      PHQ-4 {p.phq4}/12
                    </Badge>
                  )}
                </div>
                {p.concernIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.concernIds.map((id) => {
                      const c = CONCERNS.find((x) => x.id === id);
                      if (!c) return null;
                      return (
                        <span key={id} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {c.emoji} {language === "th" ? c.th : c.en}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    {tx("ไม่ได้ระบุเรื่องที่กังวล", "No concern shared")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchUrgentCaseMap } from "@/lib/urgentCases";

/**
 * Urgent appointments (PHQ-4 ≥ 3 → open referral) that have NO pre-service
 * survey row yet. The counseling queue is built from
 * `appointment_pre_service_surveys`, so without this panel these cases are
 * flagged on the appointments page but invisible to counselors.
 */

interface Row {
  appointment_id: string;
  branch_id: string | null;
  appointment_date: string;
  start_time: string | null;
  referral_code: string | null;
  status: string;
  phq: number | null;
}

interface Props {
  tx: (th: string, en: string) => string;
  branchId?: string | null;
  branchName: (id: string | null) => string;
  /** Days back to look for still-open urgent cases. */
  days?: number;
  readOnly?: boolean;
  onOpened?: () => void;
}

const PHQ_RE = /PHQ[\s-]?4[^0-9]{0,30}(\d{1,2})\s*\/\s*12/i;

export function UrgentNoSurveyPanel({ tx, branchId, branchName, days = 7, readOnly, onOpened }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const urgentMap = await fetchUrgentCaseMap();
      const ids = Array.from(urgentMap.keys());
      if (ids.length === 0) { setRows([]); return; }

      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      let q = supabase
        .from("appointments")
        .select("id, branch_id, appointment_date, start_time, referral_code, status, notes, staff_notes")
        .in("id", ids)
        .gte("appointment_date", since)
        .not("status", "in", '("cancelled","no_show")');
      if (branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q;
      if (error) throw error;

      const apptIds = ((data as any[]) || []).map((a) => a.id);
      const withSurvey = new Set<string>();
      if (apptIds.length > 0) {
        const { data: sv } = await supabase
          .from("appointment_pre_service_surveys")
          .select("booking_id")
          .in("booking_id", apptIds);
        ((sv as any[]) || []).forEach((s) => s.booking_id && withSurvey.add(s.booking_id));
      }

      const next: Row[] = ((data as any[]) || [])
        .filter((a) => !withSurvey.has(a.id))
        .map((a) => {
          const m = PHQ_RE.exec([a.notes, a.staff_notes].filter(Boolean).join("\n"));
          return {
            appointment_id: a.id,
            branch_id: a.branch_id ?? null,
            appointment_date: a.appointment_date,
            start_time: a.start_time ?? null,
            referral_code: a.referral_code ?? null,
            status: a.status,
            phq: m ? Number(m[1]) : null,
          };
        })
        .sort((a, b) =>
          b.appointment_date.localeCompare(a.appointment_date) ||
          String(a.start_time || "99:99").localeCompare(String(b.start_time || "99:99")));

      setRows(next);
    } catch (e: any) {
      console.error("URGENT_NO_SURVEY_LOAD_FAILED", e);
    } finally {
      setLoading(false);
    }
  }, [branchId, days]);

  useEffect(() => { load(); }, [load]);

  const openCase = async (r: Row) => {
    setOpeningId(r.appointment_id);
    const { error } = await supabase.rpc("open_urgent_appointment_case", {
      p_appointment_id: r.appointment_id,
    } as any);
    setOpeningId(null);
    if (error) {
      toast.error(tx("เปิดเคสไม่สำเร็จ", "Failed to open case"), { description: error.message });
      return;
    }
    toast.success(tx("เปิดเคสแล้ว — เคสจะอยู่ในคิวด้านล่าง", "Case opened — it now appears in the queue"));
    await load();
    onOpened?.();
  };

  if (rows.length === 0) return null;

  return (
    <Card className="p-3 space-y-2 border-rose-300 bg-rose-50/40 dark:bg-rose-950/20">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <p className="text-sm font-semibold">
          {tx("เคสเร่งด่วนจากหน้านัดหมาย (ยังไม่มีแบบสอบถามก่อนรับบริการ)",
              "Urgent cases from appointments (no pre-service survey yet)")}
        </p>
        <Badge className="bg-rose-600 text-white">{rows.length}</Badge>
        <Button variant="ghost" size="sm" className="h-7 ml-auto text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          {tx("รีเฟรช", "Refresh")}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.appointment_id} className="rounded-md border border-rose-300/60 bg-background p-2 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-3 w-3 text-rose-600" />
              {r.appointment_date} {String(r.start_time || "").slice(0, 5)}
              <span className="font-normal text-muted-foreground truncate">{branchName(r.branch_id)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
              {r.phq !== null && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">PHQ-4 {r.phq}/12</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              {r.referral_code && <span className="font-mono">{r.referral_code}</span>}
            </div>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full border-rose-400 text-[11px] text-rose-700 hover:bg-rose-600 hover:text-white"
                disabled={openingId === r.appointment_id}
                onClick={() => openCase(r)}
              >
                {openingId === r.appointment_id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : tx("เปิดเคสเข้าคิวให้คำปรึกษา", "Open case in the queue")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

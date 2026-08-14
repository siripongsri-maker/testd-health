import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, History, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { exportToCsv, type CsvColumn } from "@/lib/adminCsvExport";

/**
 * Audit log for the Daily Ops workspace — shows who changed which record,
 * when (Bangkok time) and the before/after value of every changed field.
 */

interface AuditRow {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  actor_id: string | null;
  actor_is_staff: boolean;
  branch_id: string | null;
  record_date: string | null;
  changed_fields: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

const PAGE_SIZE = 50;

const TABLE_LABELS: Record<string, { th: string; en: string }> = {
  appointments: { th: "นัดหมาย", en: "Appointments" },
  hiv_selftest_requests: { th: "คำขอชุดตรวจ HIV", en: "HIV self-test requests" },
  case_notes: { th: "บันทึกเคส", en: "Case notes" },
  counseling_payout_claims: { th: "ค่าเดินทาง", en: "Travel allowance" },
  kit_orders: { th: "การจัดส่งชุดตรวจ", en: "Kit orders" },
};

const ACTION_LABELS: Record<string, { th: string; en: string; className: string }> = {
  insert: { th: "สร้างใหม่", en: "Created", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  update: { th: "แก้ไข", en: "Updated", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  delete: { th: "ลบ", en: "Deleted", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const FIELD_LABELS: Record<string, { th: string; en: string }> = {
  status: { th: "สถานะ", en: "Status" },
  staff_notes: { th: "บันทึกเจ้าหน้าที่", en: "Staff notes" },
  notes: { th: "บันทึก", en: "Notes" },
  note: { th: "บันทึก", en: "Note" },
  internal_notes: { th: "บันทึกภายใน", en: "Internal notes" },
  tracking_number: { th: "เลขพัสดุ", en: "Tracking no." },
  arrived_at: { th: "เวลาเช็คอิน", en: "Checked in" },
  checked_out_at: { th: "เวลาเช็คเอาท์", en: "Checked out" },
  completed_at: { th: "เวลาปิดเคส", en: "Completed at" },
  cancellation_reason: { th: "เหตุผลยกเลิก", en: "Cancel reason" },
  assigned_staff_id: { th: "เจ้าหน้าที่ที่รับผิดชอบ", en: "Assigned staff" },
  risk_level: { th: "ระดับความเสี่ยง", en: "Risk level" },
  payout_status: { th: "สถานะจ่ายเงิน", en: "Payout status" },
  amount: { th: "จำนวนเงิน", en: "Amount" },
  test_result: { th: "ผลตรวจ", en: "Test result" },
};

const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const formatBangkok = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const displayValue = (v: unknown, emptyLabel: string): string => {
  if (v === null || v === undefined || v === "") return emptyLabel;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

interface Props {
  /** Optional controlled day (yyyy-MM-dd) coming from the Daily Ops workspace. */
  day?: string;
  hideToolbar?: boolean;
}

export default function AdminAuditLogContent({ day: controlledDay, hideToolbar }: Props) {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [ownDay, setOwnDay] = useState(bangkokToday());
  const day = controlledDay ?? ownDay;

  const [tableFilter, setTableFilter] = useState<string>("all");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { setPage(0); }, [day, tableFilter]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    // Bangkok day boundaries expressed in UTC
    const from = new Date(`${day}T00:00:00+07:00`).toISOString();
    const to = new Date(`${day}T23:59:59.999+07:00`).toISOString();

    let q = supabase
      .from("staff_audit_log")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (tableFilter !== "all") q = q.eq("table_name", tableFilter);

    const { data } = await q;
    const list = (data as unknown as AuditRow[]) || [];
    setRows(list);
    setHasMore(list.length === PAGE_SIZE);

    const ids = Array.from(new Set(list.map(r => r.actor_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, display_name").in("id", ids);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = p.display_name || ""; });
      setActorNames(map);
    }
    setLoading(false);
  }, [day, tableFilter, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const actorLabel = (r: AuditRow) => {
    if (!r.actor_id) return tx("ระบบ / อัตโนมัติ", "System / automated");
    return actorNames[r.actor_id] || `${r.actor_id.slice(0, 8)}…`;
  };

  const fieldLabel = (k: string) =>
    FIELD_LABELS[k] ? tx(FIELD_LABELS[k].th, FIELD_LABELS[k].en) : k;

  const emptyLabel = tx("(ว่าง)", "(empty)");

  const csvCols: CsvColumn<AuditRow>[] = useMemo(() => ([
    { key: "created_at", header: "Time (Bangkok)", format: r => formatBangkok(r.created_at) },
    { key: "table_name", header: "Area", format: r => TABLE_LABELS[r.table_name]?.en || r.table_name },
    { key: "action", header: "Action", format: r => ACTION_LABELS[r.action]?.en || r.action },
    { key: "actor_id", header: "Actor", format: r => actorLabel(r) },
    { key: "record_id", header: "Record ID", format: r => r.record_id || "" },
    {
      key: "changed_fields", header: "Changes",
      format: r => Object.entries(r.changed_fields || {})
        .map(([k, v]) => `${k}: ${displayValue(v.old, "-")} → ${displayValue(v.new, "-")}`)
        .join(" | "),
    },
  ]), [actorNames, language]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {!hideToolbar && (
            <div className="space-y-1">
              <Label className="text-xs">{tx("วันที่", "Date")}</Label>
              <Input type="date" value={ownDay} onChange={(e) => setOwnDay(e.target.value)} className="w-44" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{tx("ส่วนงาน", "Area")}</Label>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทั้งหมด", "All areas")}</SelectItem>
                {Object.entries(TABLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{tx(v.th, v.en)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading} className="gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {tx("รีเฟรช", "Refresh")}
          </Button>
          <Button variant="outline" size="sm" disabled={!rows.length}
            onClick={() => exportToCsv(rows, csvCols, `audit_log_${day}`)} className="gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 h-6 w-6 opacity-50" />
            {tx("ยังไม่มีการเปลี่ยนแปลงในวันนี้", "No changes recorded for this day")}
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{tx("เวลา (ไทย)", "Time (TH)")}</TableHead>
                  <TableHead>{tx("ส่วนงาน", "Area")}</TableHead>
                  <TableHead>{tx("การกระทำ", "Action")}</TableHead>
                  <TableHead>{tx("ผู้ดำเนินการ", "Actor")}</TableHead>
                  <TableHead>{tx("ค่าก่อน / หลัง", "Before / after")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const action = ACTION_LABELS[r.action];
                  const tbl = TABLE_LABELS[r.table_name];
                  const changes = Object.entries(r.changed_fields || {});
                  return (
                    <TableRow key={r.id} className="align-top">
                      <TableCell className="whitespace-nowrap text-xs font-mono">{formatBangkok(r.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        {tbl ? tx(tbl.th, tbl.en) : r.table_name}
                        {r.record_id && (
                          <div className="font-mono text-[10px] text-muted-foreground">{r.record_id.slice(0, 8)}…</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${action?.className || "bg-muted text-muted-foreground"}`}>
                          {action ? tx(action.th, action.en) : r.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {actorLabel(r)}
                        {r.actor_is_staff && (
                          <Badge variant="outline" className="ml-1 text-[9px]">{tx("เจ้าหน้าที่", "Staff")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[280px]">
                        {changes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {changes.slice(0, 8).map(([k, v]) => (
                              <li key={k} className="text-xs">
                                <span className="font-medium">{fieldLabel(k)}: </span>
                                <span className="text-muted-foreground line-through break-all">{displayValue(v.old, emptyLabel)}</span>
                                <span className="mx-1">→</span>
                                <span className="text-foreground break-all">{displayValue(v.new, emptyLabel)}</span>
                              </li>
                            ))}
                            {changes.length > 8 && (
                              <li className="text-[10px] text-muted-foreground">
                                +{changes.length - 8} {tx("รายการ", "more")}
                              </li>
                            )}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          ← {tx("ก่อนหน้า", "Previous")}
        </Button>
        <span className="text-xs text-muted-foreground">{tx(`หน้า ${page + 1}`, `Page ${page + 1}`)}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
          {tx("ถัดไป", "Next")} →
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History, Download, RefreshCw, MousePointerClick, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";

interface SmsLogRow {
  id: string;
  request_id: string | null;
  recipient_name: string | null;
  phone: string;
  template_key: string | null;
  template_label: string | null;
  message: string;
  sender: string | null;
  status: "sent" | "failed";
  sms_provider_id: string | null;
  http_status: number | null;
  error_message: string | null;
  sent_by: string | null;
  sent_at: string;
  tracking_token: string | null;
  original_url: string | null;
  click_count: number;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function SmsHistoryDialog({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SmsLogRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_send_log")
      .select(
        "id, request_id, recipient_name, phone, template_key, template_label, message, sender, status, sms_provider_id, http_status, error_message, sent_by, sent_at, tracking_token, original_url, click_count, first_clicked_at, last_clicked_at",
      )
      .order("sent_at", { ascending: false })
      .limit(1000);
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error(t("โหลดประวัติไม่สำเร็จ", "Failed to load history"));
      return;
    }
    setRows((data || []) as SmsLogRow[]);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.recipient_name || "").toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      (r.template_label || "").toLowerCase().includes(q) ||
      (r.template_key || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: rows.length,
    sent: rows.filter((r) => r.status === "sent").length,
    failed: rows.filter((r) => r.status === "failed").length,
    clicked: rows.filter((r) => r.click_count > 0).length,
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error(t("ไม่มีข้อมูลให้ส่งออก", "Nothing to export"));
      return;
    }
    const columns: CsvColumn<SmsLogRow>[] = [
      { key: "sent_at", header: "Sent at", format: (r) => formatCsvDate(r.sent_at) },
      { key: "status", header: "Status" },
      { key: "recipient_name", header: "Recipient name" },
      { key: "phone", header: "Phone" },
      { key: "template_key", header: "Template key" },
      { key: "template_label", header: "Template label" },
      { key: "sender", header: "Sender" },
      { key: "message", header: "Message" },
      { key: "sms_provider_id", header: "Provider ID" },
      { key: "http_status", header: "HTTP status" },
      { key: "error_message", header: "Error" },
      { key: "tracking_token", header: "Tracking token" },
      { key: "original_url", header: "Original URL" },
      { key: "click_count", header: "Click count" },
      {
        key: "first_clicked_at",
        header: "First click",
        format: (r) => formatCsvDate(r.first_clicked_at || ""),
      },
      {
        key: "last_clicked_at",
        header: "Last click",
        format: (r) => formatCsvDate(r.last_clicked_at || ""),
      },
      { key: "request_id", header: "Selftest request ID" },
      { key: "sent_by", header: "Sent by (user id)" },
    ];
    exportToCsv(filtered, columns, "sms_send_log");
    toast.success(t("ส่งออก CSV แล้ว", "CSV exported"));
  };

  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> {t("ประวัติการส่ง SMS", "SMS Send History")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "ติดตามทุก SMS ที่ส่ง พร้อมสถานะส่ง เทมเพลต และคลิกกลับมาจากผู้รับ",
              "Track every SMS sent — status, template, and recipient click-throughs.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {[
            { label: t("ทั้งหมด", "Total"), value: stats.total, color: "text-foreground" },
            { label: t("ส่งสำเร็จ", "Sent"), value: stats.sent, color: "text-emerald-600" },
            { label: t("ล้มเหลว", "Failed"), value: stats.failed, color: "text-rose-600" },
            { label: t("คลิกกลับมา", "Clicked"), value: stats.clicked, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-md border p-2.5">
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Input
            placeholder={t("ค้นหา ชื่อ/เบอร์/เทมเพลต", "Search name / phone / template")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ทุกสถานะ", "All status")}</SelectItem>
              <SelectItem value="sent">{t("สำเร็จ", "Sent")}</SelectItem>
              <SelectItem value="failed">{t("ล้มเหลว", "Failed")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("รีเฟรช", "Refresh")}
          </Button>
          <Button size="sm" onClick={handleExport} className="ml-auto gap-1.5" disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />
            {t(`ดาวน์โหลด CSV (${filtered.length})`, `Download CSV (${filtered.length})`)}
          </Button>
        </div>

        <div className="overflow-auto flex-1 border rounded">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {t("ยังไม่มีประวัติ", "No history yet")}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>{t("เวลา", "Sent at")}</TableHead>
                  <TableHead>{t("สถานะ", "Status")}</TableHead>
                  <TableHead>{t("ผู้รับ", "Recipient")}</TableHead>
                  <TableHead>{t("เทมเพลต", "Template")}</TableHead>
                  <TableHead className="max-w-[260px]">{t("ข้อความ", "Message")}</TableHead>
                  <TableHead>{t("คลิกกลับ", "Clicks")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[11px] whitespace-nowrap">{fmt(r.sent_at)}</TableCell>
                    <TableCell>
                      {r.status === "sent" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {t("สำเร็จ", "Sent")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30 gap-1" title={r.error_message || ""}>
                          <XCircle className="h-3 w-3" /> {t("ล้มเหลว", "Failed")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.recipient_name || "—"}</div>
                      <div className="text-muted-foreground">{r.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.template_label || r.template_key || "—"}
                    </TableCell>
                    <TableCell className="text-[11px] max-w-[260px]">
                      <div className="line-clamp-2 whitespace-pre-wrap">{r.message}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.click_count > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 w-fit">
                            <MousePointerClick className="h-3 w-3" /> {r.click_count}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{fmt(r.last_clicked_at)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

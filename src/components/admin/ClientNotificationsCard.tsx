import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  event_type: string;
  status: string;
  message: string;
  attempts: number;
  phone_last4: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  eval_sms_sent: "ส่ง SMS แบบประเมินแล้ว",
  claim_received: "รับคำขอค่าเดินทาง",
  claim_approved: "อนุมัติค่าเดินทาง",
  claim_paid: "โอนเงินสำเร็จ",
  claim_rejected: "ไม่อนุมัติคำขอ",
};

const STATUS_CLASS: Record<string, string> = {
  queued: "bg-amber-100 text-amber-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export default function ClientNotificationsCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_status_notifications")
      .select("id, event_type, status, message, attempts, phone_last4, error_message, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("client-status-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_status_notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const runQueue = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("process-client-notifications", { body: {} });
    setBusy(false);
    if (error) {
      toast({ title: "ส่งแจ้งเตือนไม่สำเร็จ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `ส่งแล้ว ${(data as { sent?: number })?.sent ?? 0} ข้อความ` });
    load();
  };

  const queued = rows.filter((r) => r.status === "queued").length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <BellRing className="h-4 w-4 text-amber-600" />
        <span className="font-semibold text-sm">แจ้งเตือนผู้รับบริการอัตโนมัติ</span>
        <Badge variant="outline" className="text-[10px]">รอส่ง {queued}</Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" />รีเฟรช
          </Button>
          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" disabled={busy} onClick={runQueue}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            ส่งคิวตอนนี้
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        ระบบส่ง SMS อัตโนมัติเมื่อสถานะเคสเปลี่ยน: ส่งลิงก์แบบประเมิน · รับคำขอ · อนุมัติ · โอนเงินสำเร็จ
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />กำลังโหลด...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-2 text-xs rounded-md border bg-muted/30 px-2 py-1.5">
              <Badge className={`text-[10px] shrink-0 ${STATUS_CLASS[r.status] ?? ""}`}>
                {r.status === "sent" ? "ส่งแล้ว" : r.status === "failed" ? "ล้มเหลว" : "รอส่ง"}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{EVENT_LABEL[r.event_type] ?? r.event_type}</div>
                <div className="text-muted-foreground truncate">{r.message}</div>
                {r.error_message && <div className="text-rose-600 truncate">{r.error_message}</div>}
              </div>
              <div className="text-right text-[10px] text-muted-foreground shrink-0">
                <div>{new Date(r.sent_at ?? r.created_at).toLocaleString("th-TH")}</div>
                {r.phone_last4 && <div>เบอร์ ••••{r.phone_last4}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

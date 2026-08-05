import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QueueRow {
  id: string;
  status: string;
  auto_queued: boolean;
  scheduled_for: string | null;
  sent_at: string | null;
  attempts: number;
  phone_last4: string | null;
  error_message: string | null;
  created_at: string;
}

const LABEL: Record<string, string> = { queued: "รอส่ง", sent: "ส่งแล้ว", failed: "ส่งไม่สำเร็จ" };
const CLS: Record<string, string> = {
  queued: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
};

/** Auto-queued post-counseling evaluation SMS: monitor + manual flush. */
export default function PostEvalSmsQueueCard() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("post_eval_sms_dispatches")
      .select("id, status, auto_queued, scheduled_for, sent_at, attempts, phone_last4, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setRows((data as QueueRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("post-eval-sms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_eval_sms_dispatches" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const flush = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("process-post-eval-sms-queue", { body: {} });
    setSending(false);
    if (error) {
      toast({ title: "ส่งคิวไม่สำเร็จ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `ส่งแล้ว ${data?.sent ?? 0} ข้อความ`, description: `ไม่สำเร็จ ${data?.failed ?? 0} · ข้าม ${data?.skipped ?? 0}` });
    load();
  };

  const pending = rows.filter((r) => r.status === "queued").length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MessageSquare className="h-4 w-4 text-sky-600" />
        <span className="font-semibold text-sm">คิว SMS แบบประเมินหลังรับบริการ</span>
        <Badge variant="outline" className="text-[10px]">รอส่ง {pending}</Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" />รีเฟรช
          </Button>
          <Button size="sm" className="h-7 text-xs bg-sky-600 hover:bg-sky-700" disabled={sending || pending === 0} onClick={flush}>
            {sending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            ส่งคิวตอนนี้
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        ระบบจะเข้าคิวส่งลิงก์ประเมินอัตโนมัติ 30 นาทีหลังผู้รับบริการเช็คเอาต์ (เก็บเฉพาะเลขท้าย 4 ตัว)
      </p>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">ยังไม่มีรายการ</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs rounded-md border bg-muted/30 px-2 py-1.5">
              <Badge className={`text-[10px] ${CLS[r.status] ?? ""}`}>{LABEL[r.status] ?? r.status}</Badge>
              <span className="tabular-nums">•••{r.phone_last4 ?? "----"}</span>
              {r.auto_queued && <span className="text-muted-foreground">อัตโนมัติ</span>}
              {r.attempts > 1 && <span className="text-muted-foreground">พยายาม {r.attempts} ครั้ง</span>}
              <span className="ml-auto text-muted-foreground">
                {new Date(r.sent_at ?? r.scheduled_for ?? r.created_at).toLocaleString("th-TH")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

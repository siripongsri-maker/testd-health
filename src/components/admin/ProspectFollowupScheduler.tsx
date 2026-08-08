import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, CheckCircle2 } from "lucide-react";

const TASK_TYPES = [
  { value: "first_contact", label: "ติดต่อครั้งแรก" },
  { value: "followup", label: "ติดตามผล" },
  { value: "reminder", label: "เตือนอีกครั้ง" },
  { value: "thank_you", label: "ขอบคุณ / ปิดงาน" },
];

/** Recommended next task + interval based on the prospect's outreach status. */
export const STATUS_PLAYBOOK: Record<
  string,
  { task_type: string; days: number; hint: string }
> = {
  not_started: { task_type: "first_contact", days: 1, hint: "ส่งอีเมลแนะนำตัวภายในพรุ่งนี้" },
  in_progress: { task_type: "followup", days: 5, hint: "ยังไม่ตอบกลับ — ติดตามใน 5 วัน" },
  replied: { task_type: "followup", days: 3, hint: "ตอบกลับแล้ว — ส่งรายละเอียดใน 3 วัน" },
  linked: { task_type: "thank_you", days: 2, hint: "ได้ลิงก์แล้ว — ส่งคำขอบคุณ" },
  declined: { task_type: "reminder", days: 90, hint: "ปฏิเสธ — ลองใหม่อีกครั้งใน 90 วัน" },
};

function typeLabel(v: string) {
  return TASK_TYPES.find((t) => t.value === v)?.label ?? v;
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

interface NextTask {
  id: string;
  task_type: string;
  due_on: string;
  status: string;
}

export default function ProspectFollowupScheduler({
  domain,
  status,
  onScheduled,
}: {
  domain: string;
  status: string;
  onScheduled?: () => void;
}) {
  const plan = STATUS_PLAYBOOK[status] ?? STATUS_PLAYBOOK.in_progress;
  const [taskType, setTaskType] = useState(plan.task_type);
  const [dueOn, setDueOn] = useState(addDays(plan.days));
  const [saving, setSaving] = useState(false);
  const [next, setNext] = useState<NextTask | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-apply the playbook whenever the prospect's status changes.
  useEffect(() => {
    const p = STATUS_PLAYBOOK[status] ?? STATUS_PLAYBOOK.in_progress;
    setTaskType(p.task_type);
    setDueOn(addDays(p.days));
  }, [status]);

  const loadNext = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seo_outreach_tasks")
      .select("id, task_type, due_on, status")
      .eq("domain", domain)
      .eq("status", "pending")
      .order("due_on", { ascending: true })
      .limit(1);
    setNext(((data ?? [])[0] as NextTask) ?? null);
    setLoading(false);
  }, [domain]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const schedule = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("seo_outreach_tasks").insert({
      domain,
      task_type: taskType,
      title: `${typeLabel(taskType)} — ${domain}`,
      due_on: dueOn,
      notes: plan.hint,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("ตั้งเตือนไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(`ตั้งเตือน ${typeLabel(taskType)} วันที่ ${fmt(dueOn)}`);
    void loadNext();
    onScheduled?.();
  };

  const complete = async () => {
    if (!next) return;
    const { error } = await supabase
      .from("seo_outreach_tasks")
      .update({ status: "done", responded_on: new Date().toISOString().slice(0, 10) })
      .eq("id", next.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success("ปิดงานติดตามแล้ว");
    void loadNext();
    onScheduled?.();
  };

  const overdue = next ? next.due_on < new Date().toISOString().slice(0, 10) : false;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          ตั้งเตือนติดตาม
        </span>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : next ? (
          <div className="flex items-center gap-1.5">
            <Badge
              className={`text-[11px] border-0 ${
                overdue ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary"
              }`}
            >
              <CalendarClock className="h-3 w-3 mr-1" />
              {typeLabel(next.task_type)} · {fmt(next.due_on)}
              {overdue ? " (เลยกำหนด)" : ""}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={complete}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              เสร็จแล้ว
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">ยังไม่มีงานค้าง</span>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground">แนะนำ: {plan.hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={taskType} onValueChange={setTaskType}>
          <SelectTrigger className="h-9 w-[150px] text-xs" aria-label={`ประเภทงานติดตามของ ${domain}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
          aria-label={`วันครบกำหนดของ ${domain}`}
          className="h-9 w-[150px] text-xs"
        />
        <Button size="sm" className="h-9 text-xs" onClick={schedule} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="ml-1.5">ตั้งเตือน</span>
        </Button>
      </div>
    </div>
  );
}

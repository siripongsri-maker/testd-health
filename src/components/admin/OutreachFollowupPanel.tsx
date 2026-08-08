import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";

export interface OutreachTask {
  id: string;
  domain: string;
  task_type: string;
  title: string | null;
  due_on: string;
  status: string;
  response_outcome: string | null;
  responded_on: string | null;
  notes: string | null;
}

const TASK_TYPES = [
  { value: "first_contact", label: "ติดต่อครั้งแรก" },
  { value: "followup", label: "ติดตามผล" },
  { value: "reminder", label: "เตือนอีกครั้ง" },
  { value: "thank_you", label: "ขอบคุณ / ปิดงาน" },
];

const OUTCOMES = [
  { value: "no_response", label: "ยังไม่ตอบกลับ", tone: "bg-muted text-muted-foreground" },
  { value: "replied_positive", label: "ตอบกลับ (สนใจ)", tone: "bg-emerald-500/15 text-emerald-600" },
  { value: "replied_negative", label: "ตอบกลับ (ปฏิเสธ)", tone: "bg-destructive/10 text-destructive" },
  { value: "link_placed", label: "ได้ลิงก์แล้ว", tone: "bg-primary/15 text-primary" },
];

function typeLabel(v: string) {
  return TASK_TYPES.find((t) => t.value === v)?.label ?? v;
}
function outcomeMeta(v: string | null) {
  return OUTCOMES.find((o) => o.value === v) ?? null;
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function OutreachFollowupPanel({ domains }: { domains: string[] }) {
  const [tasks, setTasks] = useState<OutreachTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<"due" | "pending" | "done" | "all">("due");
  const [form, setForm] = useState({
    domain: "",
    task_type: "followup",
    due_on: addDays(7),
    notes: "",
  });

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_outreach_tasks")
      .select("*")
      .order("due_on", { ascending: true });
    if (error) toast.error("โหลดรายการติดตามไม่สำเร็จ");
    else setTasks((data ?? []) as OutreachTask[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending");
    return {
      due: pending.filter((t) => t.due_on <= today).length,
      pending: pending.length,
      done: tasks.filter((t) => t.status === "done").length,
      replied: tasks.filter(
        (t) => t.response_outcome && t.response_outcome !== "no_response",
      ).length,
    };
  }, [tasks, today]);

  const visible = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "done") return tasks.filter((t) => t.status === "done");
    if (filter === "pending") return tasks.filter((t) => t.status === "pending");
    return tasks.filter((t) => t.status === "pending" && t.due_on <= today);
  }, [tasks, filter, today]);

  const createTask = async () => {
    if (!form.domain) {
      toast.error("กรุณาเลือกโดเมน");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("seo_outreach_tasks").insert({
      domain: form.domain,
      task_type: form.task_type,
      title: `${typeLabel(form.task_type)} — ${form.domain}`,
      due_on: form.due_on,
      notes: form.notes || null,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("สร้างงานติดตามไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("สร้างงานติดตามแล้ว");
    setAddOpen(false);
    setForm({ domain: "", task_type: "followup", due_on: addDays(7), notes: "" });
    void load();
  };

  const patch = async (id: string, patchValues: Partial<OutreachTask>) => {
    const { error } = await supabase
      .from("seo_outreach_tasks")
      .update(patchValues)
      .eq("id", id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patchValues } as OutreachTask : t)),
    );
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("seo_outreach_tasks").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const snooze = (t: OutreachTask, days: number) =>
    patch(t.id, { due_on: addDays(days), status: "pending" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            งานติดตามการขอลิงก์ (Follow-up Reminders)
          </CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            ตั้งการติดตาม
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: "due" as const, label: "ถึงกำหนดแล้ว", value: counts.due },
            { key: "pending" as const, label: "รอดำเนินการ", value: counts.pending },
            { key: "done" as const, label: "เสร็จแล้ว", value: counts.done },
            { key: "all" as const, label: "ตอบกลับแล้ว", value: counts.replied },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-2xl p-3 text-left transition bg-muted/50 ${
                filter === c.key ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="text-xl font-bold">{c.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {c.label}
              </div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีงานติดตามในหมวดนี้
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((t) => {
              const overdue = t.status === "pending" && t.due_on < today;
              const meta = outcomeMeta(t.response_outcome);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    overdue ? "border-destructive/40 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{t.domain}</span>
                    <Badge variant="outline">{typeLabel(t.task_type)}</Badge>
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        overdue ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <CalendarClock className="h-3 w-3" />
                      {fmt(t.due_on)}
                      {overdue && " (เลยกำหนด)"}
                    </span>
                    {t.status === "done" && (
                      <Badge className="bg-emerald-500/15 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        เสร็จแล้ว
                      </Badge>
                    )}
                    {meta && <Badge className={meta.tone}>{meta.label}</Badge>}
                  </div>

                  {t.notes && (
                    <p className="text-xs text-muted-foreground">{t.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={t.response_outcome ?? ""}
                      onValueChange={(v) =>
                        void patch(t.id, {
                          response_outcome: v,
                          responded_on:
                            v === "no_response" ? null : new Date().toISOString().slice(0, 10),
                          status: v === "no_response" ? t.status : "done",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[190px] text-xs">
                        <SelectValue placeholder="บันทึกผลตอบกลับ" />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {t.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => void patch(t.id, { status: "done" })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        ทำเสร็จ
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => void patch(t.id, { status: "pending" })}
                      >
                        เปิดงานอีกครั้ง
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => void snooze(t, 7)}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      เลื่อน 7 วัน
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive ml-auto"
                      onClick={() => void remove(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตั้งงานติดตาม</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">โดเมน</label>
              <Select
                value={form.domain}
                onValueChange={(v) => setForm((p) => ({ ...p, domain: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกโดเมน" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">ประเภทงาน</label>
              <Select
                value={form.task_type}
                onValueChange={(v) => setForm((p) => ({ ...p, task_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">วันครบกำหนด</label>
              <Input
                type="date"
                value={form.due_on}
                onChange={(e) => setForm((p) => ({ ...p, due_on: e.target.value }))}
              />
              <div className="flex gap-2 pt-1">
                {[3, 7, 14, 30].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setForm((p) => ({ ...p, due_on: addDays(d) }))}
                  >
                    +{d} วัน
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">บันทึก</label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="เช่น ส่งอีเมลแนะนำ testD ไปแล้ว รอการตอบกลับ"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={() => void createTask()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

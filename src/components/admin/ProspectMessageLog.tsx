import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MessageSquare, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface MessageRow {
  id: string;
  direction: string;
  channel: string;
  subject: string | null;
  summary: string | null;
  sent_on: string;
  replied_on: string | null;
  key_notes: string | null;
}

const DIRECTIONS = [
  { value: "sent", label: "ส่งออก" },
  { value: "received", label: "ได้รับ" },
];

const CHANNELS = [
  { value: "email", label: "อีเมล" },
  { value: "form", label: "ฟอร์มติดต่อ" },
  { value: "social", label: "โซเชียล" },
  { value: "phone", label: "โทรศัพท์" },
  { value: "other", label: "อื่น ๆ" },
];

function label(list: { value: string; label: string }[], v: string) {
  return list.find((x) => x.value === v)?.label ?? v;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export default function ProspectMessageLog({ domain }: { domain: string }) {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "sent",
    channel: "email",
    subject: "",
    summary: "",
    sent_on: today(),
    replied_on: "",
    key_notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_outreach_messages")
      .select("id, direction, channel, subject, summary, sent_on, replied_on, key_notes")
      .eq("domain", domain)
      .order("sent_on", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("โหลดประวัติการติดต่อไม่สำเร็จ");
      return;
    }
    setRows((data ?? []) as MessageRow[]);
  }, [domain]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const add = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("seo_outreach_messages").insert({
      domain,
      direction: form.direction,
      channel: form.channel,
      subject: form.subject.trim() || null,
      summary: form.summary.trim() || null,
      sent_on: form.sent_on || today(),
      replied_on: form.replied_on || null,
      key_notes: form.key_notes.trim() || null,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("บันทึกประวัติการติดต่อแล้ว");
    setForm({
      direction: "sent",
      channel: "email",
      subject: "",
      summary: "",
      sent_on: today(),
      replied_on: "",
      key_notes: "",
    });
    void load();
  };

  const setReplied = async (id: string, value: string) => {
    const { error } = await supabase
      .from("seo_outreach_messages")
      .update({ replied_on: value || null })
      .eq("id", id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, replied_on: value || null } : r)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("seo_outreach_messages").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
        aria-expanded={open}
      >
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          ประวัติการติดต่อ
          {rows.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {rows.length}
            </Badge>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">ยังไม่มีบันทึกการติดต่อกับโดเมนนี้</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-md border bg-background p-2.5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      className={`text-[10px] border-0 ${
                        r.direction === "sent"
                          ? "bg-primary/15 text-primary"
                          : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      {label(DIRECTIONS, r.direction)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {label(CHANNELS, r.channel)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{fmt(r.sent_on)}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <Input
                        type="date"
                        aria-label={`วันที่ตอบกลับของ ${domain}`}
                        value={r.replied_on ?? ""}
                        onChange={(e) => setReplied(r.id, e.target.value)}
                        className="h-7 w-[135px] text-[11px]"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label="ลบบันทึกนี้"
                        onClick={() => remove(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </div>
                  {r.subject && <p className="text-[13px] font-medium">{r.subject}</p>}
                  {r.summary && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{r.summary}</p>
                  )}
                  {r.key_notes && (
                    <p className="text-[12px] text-foreground/80">
                      <span className="font-medium">ประเด็นสำคัญ: </span>
                      {r.key_notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-md border bg-background p-2.5 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="ทิศทางการติดต่อ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="ช่องทางการติดต่อ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="วันที่ติดต่อ"
                value={form.sent_on}
                onChange={(e) => setForm({ ...form, sent_on: e.target.value })}
                className="h-8 w-[140px] text-xs"
              />
              <Input
                type="date"
                aria-label="วันที่ตอบกลับ"
                value={form.replied_on}
                onChange={(e) => setForm({ ...form, replied_on: e.target.value })}
                className="h-8 w-[140px] text-xs"
              />
            </div>
            <Input
              placeholder="หัวข้อ / เรื่อง"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-8 text-xs"
            />
            <Textarea
              placeholder="สรุปข้อความที่ส่ง/ได้รับ"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="text-xs min-h-[56px]"
            />
            <Textarea
              placeholder="ประเด็นสำคัญ / สิ่งที่ต้องทำต่อ"
              value={form.key_notes}
              onChange={(e) => setForm({ ...form, key_notes: e.target.value })}
              className="text-xs min-h-[44px]"
            />
            <Button size="sm" className="h-8 text-xs" onClick={add} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span className="ml-1.5">บันทึกการติดต่อ</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

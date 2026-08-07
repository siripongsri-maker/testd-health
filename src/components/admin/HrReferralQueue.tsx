import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HeartHandshake, RefreshCw, Loader2, Inbox } from "lucide-react";
import ClientHrContextPanel from "./ClientHrContextPanel";

interface Props {
  tx: (th: string, en: string) => string;
  readOnly?: boolean;
}

interface Referral {
  id: string;
  user_id: string | null;
  anonymous_token: string | null;
  referral_type: string;
  status: string | null;
  priority: string | null;
  risk_level: string | null;
  contact_method: string | null;
  contact_value: string | null;
  notes: string | null;
  counselor_notes: string | null;
  screening_id: string | null;
  branch_id: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

const STATUSES = [
  { key: "requested", th: "รอรับเรื่อง", en: "New" },
  { key: "in_progress", th: "กำลังดูแล", en: "In progress" },
  { key: "completed", th: "เสร็จสิ้น", en: "Completed" },
  { key: "closed", th: "ปิดเคส", en: "Closed" },
];

const priorityTone = (p: string | null) =>
  p === "urgent"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
    : p === "high"
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    : "bg-muted text-muted-foreground";

export default function HrReferralQueue({ tx, readOnly = false }: Props) {
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hr_referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("hr_referrals load failed", error);
      setRows([]);
    } else {
      setRows((data || []) as unknown as Referral[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("hr-referral-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_referrals" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const update = async (row: Referral, patch: Partial<Referral>) => {
    setSavingId(row.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("hr_referrals")
      .update({
        ...patch,
        handled_by: auth.user?.id ?? null,
        handled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error(tx("บันทึกไม่สำเร็จ", "Save failed"));
      return;
    }
    toast.success(tx("บันทึกแล้ว", "Saved"));
    load();
  };

  const isNew = (r: Referral) => !r.status || r.status === "requested" || r.status === "pending";
  const pending = rows.filter(isNew).length;
  const fromAppointment = (r: Referral) => /\[APPT:[0-9a-f-]+\]/i.test(r.notes || "");
  const sorted = [...rows].sort((a, b) => {
    const score = (r: Referral) => (isNew(r) ? 0 : 2) + (r.priority === "urgent" ? -1 : 0);
    return score(a) - score(b) || (a.created_at < b.created_at ? 1 : -1);
  });


  return (
    <Card className="p-4 space-y-3 border-teal-200 bg-teal-50/20 dark:bg-teal-950/10">
      <div className="flex items-center gap-2 flex-wrap">
        <HeartHandshake className="h-4 w-4 text-teal-600" />
        <h2 className="text-sm font-bold">
          {tx("คิวส่งต่อจาก Harm Reduction", "Harm reduction referral queue")}
        </h2>
        <Badge variant="outline" className="text-[10px]">
          {tx("รอรับเรื่อง", "New")}: {pending}
        </Badge>
        <Button size="sm" variant="outline" className="ml-auto h-8" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {tx("รีเฟรช", "Refresh")}
        </Button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {tx("กำลังโหลด…", "Loading…")}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-4">
          <Inbox className="h-3.5 w-3.5" />
          {tx("ยังไม่มีคำขอปรึกษาจากโซน Harm Reduction", "No harm reduction support requests yet")}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id} className="rounded-md border bg-background">
                <button
                  type="button"
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.referral_type}</span>
                      <Badge className={`text-[10px] ${priorityTone(r.priority)}`}>{r.priority || "normal"}</Badge>
                      {r.risk_level && (
                        <Badge variant="outline" className="text-[10px]">
                          {tx("ความเสี่ยง", "Risk")}: {r.risk_level}
                        </Badge>
                      )}
                      {r.screening_id && (
                        <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300">
                          {tx("มีผลคัดกรอง", "Screening linked")}
                        </Badge>
                      )}
                      {!r.user_id && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {tx("ไม่ระบุตัวตน", "Anonymous")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                      {r.contact_method ? ` · ${r.contact_method}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {STATUSES.find((s) => s.key === (r.status || "requested"))
                      ? tx(
                          STATUSES.find((s) => s.key === (r.status || "requested"))!.th,
                          STATUSES.find((s) => s.key === (r.status || "requested"))!.en,
                        )
                      : r.status}
                  </Badge>
                </button>

                {open && (
                  <div className="px-3 pb-3 pt-1 border-t space-y-3">
                    {r.notes && (
                      <div className="text-xs bg-muted/40 rounded-md p-2.5 whitespace-pre-wrap">
                        <span className="font-semibold">{tx("ข้อความจากผู้รับบริการ", "Client message")}: </span>
                        {r.notes}
                      </div>
                    )}
                    {r.contact_value && (
                      <div className="text-xs">
                        <span className="font-semibold">{tx("ช่องทางติดต่อ", "Contact")}: </span>
                        {r.contact_method} — {r.contact_value}
                      </div>
                    )}

                    <ClientHrContextPanel clientId={r.user_id} tx={tx} />

                    <Textarea
                      rows={2}
                      disabled={readOnly}
                      placeholder={tx("บันทึกของผู้ให้คำปรึกษา…", "Counselor note…")}
                      value={drafts[r.id] ?? r.counselor_notes ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      {STATUSES.map((s) => (
                        <Button
                          key={s.key}
                          size="sm"
                          variant={(r.status || "requested") === s.key ? "default" : "outline"}
                          className="h-8 text-xs"
                          disabled={readOnly || savingId === r.id}
                          onClick={() =>
                            update(r, { status: s.key, counselor_notes: drafts[r.id] ?? r.counselor_notes ?? null })
                          }
                        >
                          {tx(s.th, s.en)}
                        </Button>
                      ))}
                      {savingId === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

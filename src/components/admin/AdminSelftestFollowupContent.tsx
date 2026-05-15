import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Phone, MessageSquare, RefreshCw, CheckCircle2, Search, History, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Row {
  id: string;
  created_at: string;
  result_submitted_at: string | null;
  status: string;
  test_result: string | null;
  self_reported_result: string | null;
  staff_notes: string | null;
  care_action: string | null;
  assigned_branch: string | null;
  full_name: string | null;
  phone: string | null;
  pii: { full_name: string | null; phone: string | null } | null;
}

const CARE_ACTIONS = [
  { value: "pending", labelTh: "รอติดตาม", labelEn: "Pending" },
  { value: "contacted", labelTh: "ติดต่อแล้ว", labelEn: "Contacted" },
  { value: "scheduled", labelTh: "นัดเข้าคลินิก", labelEn: "Clinic scheduled" },
  { value: "in_care", labelTh: "เข้าสู่การรักษา", labelEn: "In care" },
  { value: "declined", labelTh: "ปฏิเสธ", labelEn: "Declined" },
  { value: "unreachable", labelTh: "ติดต่อไม่ได้", labelEn: "Unreachable" },
];

interface HistoryRow {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  created_at: string;
}

export default function AdminSelftestFollowupContent() {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRow[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const loadHistory = async (id: string) => {
    setLoadingHistory((p) => ({ ...p, [id]: true }));
    const { data, error } = await supabase
      .from("hiv_selftest_case_history")
      .select("id, field_changed, old_value, new_value, changed_by_name, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: false });
    setLoadingHistory((p) => ({ ...p, [id]: false }));
    if (!error) setHistoryMap((p) => ({ ...p, [id]: (data as any) || [] }));
  };

  const toggleHistory = (id: string) => {
    setOpenHistory((p) => {
      const next = { ...p, [id]: !p[id] };
      if (next[id] && !historyMap[id]) loadHistory(id);
      return next;
    });
  };


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hiv_selftest_requests")
      .select(`
        id, created_at, result_submitted_at, status, test_result, self_reported_result,
        staff_notes, care_action, assigned_branch, full_name, phone,
        pii:selftest_pii ( full_name, phone )
      `)
      .or("self_reported_result.in.(reactive,positive,invalid),test_result.in.(reactive,positive,invalid)")
      .order("result_submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) console.error(error);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const action = r.care_action || "pending";
      const isOpen = !["in_care", "declined"].includes(action);
      if (statusFilter === "open" && !isOpen) return false;
      if (statusFilter === "closed" && isOpen) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (r.pii?.full_name || r.full_name || "").toLowerCase().includes(q)
        || (r.pii?.phone || r.phone || "").includes(q);
    });
  }, [rows, search, statusFilter]);

  const updateRow = async (id: string, patch: Partial<Row>) => {
    setSavingId(id);
    const { error } = await supabase.from("hiv_selftest_requests").update(patch as any).eq("id", id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(t("บันทึกแล้ว", "Saved"));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (openHistory[id]) loadHistory(id);
  };

  const counts = useMemo(() => {
    const open = rows.filter((r) => !["in_care", "declined"].includes(r.care_action || "pending")).length;
    return { total: rows.length, open, closed: rows.length - open };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("ติดตามผลตรวจ", "Result Follow-up")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("ติดตามผู้ที่ผลตรวจ Reactive / Positive / Invalid เพื่อนัดเข้ารับการรักษา", "Follow up on Reactive / Positive / Invalid results to link them into care.")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">{t("รวมเคส","Total cases")}</div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">{t("รอติดตาม","Open")}</div>
          <div className="text-2xl font-bold text-amber-600">{counts.open}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">{t("ปิดเคสแล้ว","Closed")}</div>
          <div className="text-2xl font-bold text-emerald-600">{counts.closed}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle className="text-base">{t("รายการที่ต้องติดตาม","Follow-up queue")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-64" placeholder={t("ค้นหา ชื่อ/เบอร์","Search name/phone")} value={search} onChange={(e)=>setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("รอติดตาม","Open")}</SelectItem>
                  <SelectItem value="closed">{t("ปิดเคส","Closed")}</SelectItem>
                  <SelectItem value="all">{t("ทั้งหมด","All")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">{t("ไม่มีเคสที่ต้องติดตาม 🎉","No cases to follow up 🎉")}</div>
          ) : filtered.map((r) => {
            const result = r.self_reported_result || r.test_result || "—";
            const name = r.pii?.full_name || r.full_name || t("ไม่ระบุชื่อ","No name");
            const phone = r.pii?.phone || r.phone || "";
            const action = r.care_action || "pending";
            const date = r.result_submitted_at || r.created_at;
            const isReactive = result === "reactive" || result === "positive";
            return (
              <Card key={r.id} className="border-l-4" style={{ borderLeftColor: isReactive ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{name}</span>
                        <Badge variant={isReactive ? "destructive" : "outline"}>{result}</Badge>
                        {r.assigned_branch && <Badge variant="outline" className="text-xs">{r.assigned_branch}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("ส่งผล","Submitted")}: {new Date(date).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {phone && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`tel:${phone}`}><Phone className="h-4 w-4 mr-1"/>{phone}</a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled title={t("เร็ว ๆ นี้","Coming soon")}>
                        <MessageSquare className="h-4 w-4 mr-1"/>SMS
                        <Badge variant="secondary" className="ml-2 text-[10px]">{t("เร็วๆนี้","Soon")}</Badge>
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("สถานะการติดตาม","Follow-up status")}</label>
                      <Select value={action} onValueChange={(v)=>updateRow(r.id, { care_action: v })} disabled={savingId === r.id}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {CARE_ACTIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{language==="th"?a.labelTh:a.labelEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("บันทึกของเจ้าหน้าที่","Staff notes")}</label>
                      <Textarea
                        defaultValue={r.staff_notes || ""}
                        placeholder={t("บันทึกการติดต่อ ผลการนัด ฯลฯ","Contact log, scheduling notes, etc.")}
                        rows={2}
                        onBlur={(e)=>{
                          if (e.target.value !== (r.staff_notes || "")) updateRow(r.id, { staff_notes: e.target.value });
                        }}
                      />
                    </div>
                  </div>

                  {action === "in_care" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="h-4 w-4"/> {t("เคสนี้เข้าสู่การรักษาแล้ว","Linked into care")}
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleHistory(r.id)}>
                      <History className="h-3.5 w-3.5 mr-1" />
                      {t("ประวัติการเปลี่ยนแปลง","Change history")}
                      {openHistory[r.id] ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                    </Button>
                    {openHistory[r.id] && (
                      <div className="mt-2 space-y-2">
                        {loadingHistory[r.id] ? (
                          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/></div>
                        ) : (historyMap[r.id] || []).length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2">{t("ยังไม่มีประวัติการเปลี่ยนแปลง","No changes recorded yet")}</div>
                        ) : (
                          <ol className="relative border-l border-border pl-4 space-y-3">
                            {(historyMap[r.id] || []).map((h) => {
                              const isAction = h.field_changed === "care_action";
                              const fieldLabel = isAction ? t("สถานะ","Status") : t("บันทึก","Notes");
                              return (
                                <li key={h.id} className="relative">
                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <Badge variant="outline" className="text-[10px]">{fieldLabel}</Badge>
                                    <span className="text-muted-foreground">
                                      {new Date(h.created_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}
                                    </span>
                                    {h.changed_by_name && (
                                      <span className="text-muted-foreground">· {h.changed_by_name}</span>
                                    )}
                                  </div>
                                  <div className="text-xs mt-1">
                                    {isAction ? (
                                      <span>
                                        <span className="text-muted-foreground line-through">{h.old_value || "—"}</span>
                                        <span className="mx-1">→</span>
                                        <span className="font-medium">{h.new_value || "—"}</span>
                                      </span>
                                    ) : (
                                      <div className="rounded bg-muted/50 p-2 whitespace-pre-wrap">
                                        {h.new_value || <span className="text-muted-foreground italic">{t("(ลบบันทึก)","(notes cleared)")}</span>}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

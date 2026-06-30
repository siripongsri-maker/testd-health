import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Phone, MessageSquare, RefreshCw, CheckCircle2, Search, History, ChevronDown, ChevronUp, PhoneCall, Clock, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SelftestSmsDialog, { type SmsRecipient } from "./SelftestSmsDialog";
import SmsHistoryDialog from "./SmsHistoryDialog";

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
  contact_attempt_1_at: string | null;
  contact_attempt_2_at: string | null;
  contact_attempt_3_at: string | null;
  pii: { full_name: string | null; phone: string | null } | null;
}

// Status tabs (each status gets its own tab)
const STATUS_TABS = [
  { value: "pending", labelTh: "รอติดตาม", labelEn: "Pending", closed: false, tone: "amber" },
  { value: "contacted", labelTh: "ติดต่อแล้ว", labelEn: "Contacted", closed: false, tone: "blue" },
  { value: "scheduled", labelTh: "นัดเข้าสู่การรักษา", labelEn: "Treatment scheduled", closed: false, tone: "indigo" },
  { value: "in_care", labelTh: "กำลังรักษา (ปิดเคส)", labelEn: "In care (closed)", closed: true, tone: "emerald" },
  { value: "declined", labelTh: "ปฏิเสธ (ปิดเคส)", labelEn: "Declined (closed)", closed: true, tone: "rose" },
  { value: "unreachable", labelTh: "ติดต่อไม่ได้ (ปิดเคส)", labelEn: "Unreachable (closed)", closed: true, tone: "slate" },
] as const;

const CARE_ACTIONS = STATUS_TABS.map((s) => ({ value: s.value, labelTh: s.labelTh, labelEn: s.labelEn }));

// 3-7-7 schedule: attempt 1 at day 0, attempt 2 +3 days, attempt 3 +7 days, then auto-close +7 days
const ATTEMPT_OFFSETS_DAYS = [0, 3, 10, 17];

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
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRow[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [historyFieldFilter, setHistoryFieldFilter] = useState<Record<string, string>>({});
  const [historySortAsc, setHistorySortAsc] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<SmsRecipient[]>([]);
  const [smsHistoryOpen, setSmsHistoryOpen] = useState(false);

  const toRecipient = (r: Row): SmsRecipient => ({
    id: r.id,
    name: r.pii?.full_name || r.full_name || t("ไม่ระบุชื่อ", "No name"),
    phone: r.pii?.phone || r.phone || "",
  });

  const openSmsFor = (rows: Row[]) => {
    if (rows.length === 0) return;
    setSmsRecipients(rows.map(toRecipient));
    setSmsOpen(true);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
        contact_attempt_1_at, contact_attempt_2_at, contact_attempt_3_at,
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
      if (statusFilter !== "all" && action !== statusFilter) return false;
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

  const recordAttempt = async (r: Row, idx: 1 | 2 | 3) => {
    const col = `contact_attempt_${idx}_at` as const;
    const patch: any = { [col]: new Date().toISOString() };
    // First attempt also flips status to "contacted" if still pending
    if (idx === 1 && (r.care_action || "pending") === "pending") {
      patch.care_action = "contacted";
    }
    await updateRow(r.id, patch);
  };

  const clearAttempt = async (r: Row, idx: 1 | 2 | 3) => {
    const col = `contact_attempt_${idx}_at` as const;
    await updateRow(r.id, { [col]: null } as any);
  };

  const tabCounts = useMemo(() => {
    const m: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => { m[s.value] = 0; });
    rows.forEach((r) => {
      const a = r.care_action || "pending";
      if (m[a] !== undefined) m[a]++;
    });
    return m;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("ติดตามผลตรวจ", "Result Follow-up")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("ติดตามผู้ที่ผลตรวจ Reactive / Positive / Invalid เพื่อนัดเข้ารับการรักษา", "Follow up on Reactive / Positive / Invalid results to link them into care.")}
        </p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="text-xs gap-1.5">
              <span>{language === "th" ? s.labelTh : s.labelEn}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts[s.value] ?? 0}</Badge>
            </TabsTrigger>
          ))}
          <TabsTrigger value="all" className="text-xs gap-1.5">
            <span>{t("ทั้งหมด","All")}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts.all ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle className="text-base">{t("รายการ","Cases")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-64" placeholder={t("ค้นหา ชื่อ/เบอร์","Search name/phone")} value={search} onChange={(e)=>setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSmsHistoryOpen(true)} className="gap-1.5">
                <History className="h-4 w-4" />
                {t("ประวัติ SMS / CSV", "SMS history / CSV")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const targets = filtered.filter((r) => (r.pii?.phone || r.phone || "").replace(/\D/g, "").length >= 9);
                  if (targets.length === 0) {
                    toast.info(t("ไม่พบเบอร์โทรที่พร้อมส่งในรายการที่แสดง", "No valid phone numbers in the current list"));
                    return;
                  }
                  openSmsFor(targets);
                }}
                className="gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                {t(`ส่ง SMS ทั้งหมด (${filtered.filter((r) => (r.pii?.phone || r.phone || "").replace(/\D/g, "").length >= 9).length})`, `Send SMS all (${filtered.filter((r) => (r.pii?.phone || r.phone || "").replace(/\D/g, "").length >= 9).length})`)}
              </Button>
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 rounded">
              <div className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                  onCheckedChange={(v) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (v) filtered.forEach((r) => next.add(r.id));
                      else filtered.forEach((r) => next.delete(r.id));
                      return next;
                    });
                  }}
                />
                <span>{t(`เลือกแล้ว ${selected.size} รายการ`, `${selected.size} selected`)}</span>
                {selected.size > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelected(new Set())}>
                    {t("ล้าง", "Clear")}
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => openSmsFor(filtered.filter((r) => selected.has(r.id)))}
                disabled={selected.size === 0}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {t(`ส่ง SMS (${selected.size})`, `Send SMS (${selected.size})`)}
              </Button>
            </div>
          )}
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
                    <div className="flex gap-3">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleSelected(r.id)}
                        aria-label={t("เลือกเพื่อส่ง SMS", "Select to send SMS")}
                        className="mt-1.5"
                      />
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
                    </div>
                    <div className="flex gap-2">
                      {phone && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`tel:${phone}`}><Phone className="h-4 w-4 mr-1"/>{phone}</a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSmsFor([r])}
                        disabled={!phone}
                        title={!phone ? t("ไม่มีเบอร์", "No phone") : undefined}
                      >
                        <MessageSquare className="h-4 w-4 mr-1"/>SMS
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

                  {/* 3-7-7 contact attempts */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      {t("การโทรติดตาม 3-7-7 (ครั้งที่ 1 วันนี้ · ครั้งที่ 2 อีก 3 วัน · ครั้งที่ 3 อีก 7 วัน)",
                         "Follow-up calls 3-7-7 (1st today · 2nd in 3 days · 3rd in 7 days)")}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([1,2,3] as const).map((idx) => {
                        const at = idx === 1 ? r.contact_attempt_1_at : idx === 2 ? r.contact_attempt_2_at : r.contact_attempt_3_at;
                        const baseDate = idx === 1
                          ? (r.result_submitted_at || r.created_at)
                          : idx === 2 ? r.contact_attempt_1_at : r.contact_attempt_2_at;
                        const offsetDays = idx === 1 ? 0 : idx === 2 ? 3 : 7;
                        const dueDate = baseDate ? new Date(new Date(baseDate).getTime() + offsetDays * 86400000) : null;
                        const prevDone = idx === 1 || (idx === 2 ? !!r.contact_attempt_1_at : !!r.contact_attempt_2_at);
                        const now = Date.now();
                        const overdue = !at && prevDone && dueDate && now > dueDate.getTime();
                        const upcoming = !at && prevDone && dueDate && now < dueDate.getTime();
                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border p-3 ${at ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900" : overdue ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900" : prevDone ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900" : "bg-muted/30 border-border opacity-70"}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <PhoneCall className="h-3.5 w-3.5" />
                                {t(`ครั้งที่ ${idx}`, `Attempt ${idx}`)}
                              </div>
                              {at ? (
                                <Badge variant="outline" className="h-5 text-[10px] border-emerald-500 text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />{t("โทรแล้ว","Called")}
                                </Badge>
                              ) : overdue ? (
                                <Badge variant="destructive" className="h-5 text-[10px]">
                                  <AlertCircle className="h-3 w-3 mr-1" />{t("เกินกำหนด","Overdue")}
                                </Badge>
                              ) : upcoming ? (
                                <Badge variant="outline" className="h-5 text-[10px]">
                                  <Clock className="h-3 w-3 mr-1" />{t("รอ","Upcoming")}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1.5">
                              {at
                                ? new Date(at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"})
                                : dueDate
                                  ? `${t("ครบกำหนด","Due")}: ${dueDate.toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"})}`
                                  : t("รอครั้งก่อนหน้า","Awaiting prior attempt")}
                            </div>
                            <div className="flex gap-1 mt-2">
                              {at ? (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => clearAttempt(r, idx)} disabled={savingId === r.id}>
                                  {t("ล้าง","Clear")}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={overdue ? "destructive" : "outline"}
                                  className="h-7 px-2 text-[11px] flex-1"
                                  onClick={() => recordAttempt(r, idx)}
                                  disabled={!prevDone || savingId === r.id}
                                >
                                  {t("บันทึกการโทร","Log call")}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {r.contact_attempt_3_at && !["in_care","declined","unreachable","scheduled"].includes(action) && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2">
                        <div className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          {t("โทรครบ 3 ครั้งแล้ว — พิจารณาปิดเคสเป็น 'ติดต่อไม่ได้'", "All 3 attempts completed — consider closing as 'Unreachable'")}
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateRow(r.id, { care_action: "unreachable" })} disabled={savingId === r.id}>
                          {t("ปิดเคส: ติดต่อไม่ได้", "Close: Unreachable")}
                        </Button>
                      </div>
                    )}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={historyFieldFilter[r.id] || "all"}
                            onValueChange={(v) => setHistoryFieldFilter((p) => ({ ...p, [r.id]: v }))}
                          >
                            <SelectTrigger className="h-7 w-44 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t("ทั้งหมด","All changes")}</SelectItem>
                              <SelectItem value="care_action">{t("เฉพาะสถานะ","Status only")}</SelectItem>
                              <SelectItem value="staff_notes">{t("เฉพาะบันทึก","Notes only")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setHistorySortAsc((p) => ({ ...p, [r.id]: !p[r.id] }))}
                          >
                            {historySortAsc[r.id]
                              ? t("เก่า → ใหม่","Oldest first")
                              : t("ใหม่ → เก่า","Newest first")}
                          </Button>
                        </div>
                        {loadingHistory[r.id] ? (
                          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/></div>
                        ) : (() => {
                          const filter = historyFieldFilter[r.id] || "all";
                          const asc = !!historySortAsc[r.id];
                          const list = (historyMap[r.id] || [])
                            .filter((h) => filter === "all" || h.field_changed === filter)
                            .slice()
                            .sort((a, b) => {
                              const da = new Date(a.created_at).getTime();
                              const db = new Date(b.created_at).getTime();
                              return asc ? da - db : db - da;
                            });
                          if (list.length === 0) {
                            return <div className="text-xs text-muted-foreground py-2">{t("ยังไม่มีประวัติการเปลี่ยนแปลง","No changes recorded yet")}</div>;
                          }
                          return (
                          <ol className="relative border-l border-border pl-4 space-y-3">
                            {list.map((h) => {
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
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <SelftestSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        recipients={smsRecipients}
        onSent={() => setSelected(new Set())}
        initialTemplateKey="first_reactive"
      />
      <SmsHistoryDialog open={smsHistoryOpen} onOpenChange={setSmsHistoryOpen} />
    </div>
  );
}

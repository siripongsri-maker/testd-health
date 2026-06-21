import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Phone, Image as ImageIcon, RefreshCw, Save, Trash2, MessageSquare, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePdpaAudit } from "@/hooks/usePdpaAudit";
import SelftestSmsDialog, { SmsRecipient } from "./SelftestSmsDialog";

interface Row {
  id: string;
  created_at: string;
  result_submitted_at: string | null;
  status: string;
  test_result: string | null;
  self_reported_result: string | null;
  result_photo_url: string | null;
  staff_notes: string | null;
  care_action: string | null;
  assigned_branch: string | null;
  tracking_number: string | null;
  full_name: string | null;
  phone: string | null;
  pii: { full_name: string | null; phone: string | null } | null;
}

const RESULT_COLOR: Record<string, string> = {
  reactive: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  positive: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  negative: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  invalid: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

const STATUS_OPTIONS = [
  { value: "pending", labelTh: "รอตรวจสอบ", labelEn: "Pending" },
  { value: "approved", labelTh: "อนุมัติแล้ว", labelEn: "Approved" },
  { value: "shipped", labelTh: "จัดส่งแล้ว", labelEn: "Shipped" },
  { value: "delivered", labelTh: "ถึงผู้รับแล้ว", labelEn: "Delivered" },
  { value: "result_submitted", labelTh: "ส่งผลแล้ว", labelEn: "Result Submitted" },
  { value: "followed_up", labelTh: "ติดตามแล้ว", labelEn: "Followed Up" },
  { value: "rejected", labelTh: "ปฏิเสธ", labelEn: "Rejected" },
];

export default function AdminSelftestResultsContent() {
  const { language } = useLanguage();
  const { log: logAudit } = usePdpaAudit();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [photo, setPhoto] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { status: string; tracking_number: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<SmsRecipient[]>([]);
  const [smsTemplateKey, setSmsTemplateKey] = useState<string>("negative_prep_invite");

  const load = async () => {
    setLoading(true);
    // Fetch rows with any result info. Use 3 .not() queries combined, since
    // PostgREST .or() with multiple `is.null` negations is unreliable.
    const select = `
      id, created_at, result_submitted_at, status, test_result, self_reported_result,
      result_photo_url, staff_notes, care_action, assigned_branch, tracking_number, full_name, phone,
      pii:selftest_pii ( full_name, phone )
    `;

    const [a, b, c] = await Promise.all([
      supabase.from("hiv_selftest_requests").select(select).not("result_photo_url", "is", null).limit(1000),
      supabase.from("hiv_selftest_requests").select(select).not("self_reported_result", "is", null).limit(1000),
      supabase.from("hiv_selftest_requests").select(select).not("test_result", "is", null).limit(1000),
    ]);

    if (a.error || b.error || c.error) {
      console.error("selftest results load error", a.error, b.error, c.error);
      toast.error(t("โหลดข้อมูลไม่สำเร็จ", "Failed to load data"));
      setLoading(false);
      return;
    }

    const byId = new Map<string, Row>();
    [...(a.data || []), ...(b.data || []), ...(c.data || [])].forEach((r: any) => {
      if (!byId.has(r.id)) byId.set(r.id, r as Row);
    });

    const merged = Array.from(byId.values()).sort((x, y) => {
      const dx = new Date(x.result_submitted_at || x.created_at).getTime();
      const dy = new Date(y.result_submitted_at || y.created_at).getTime();
      return dy - dx;
    });

    setRows(merged);
    setEdits(
      Object.fromEntries(
        merged.map((r) => [r.id, { status: r.status, tracking_number: r.tracking_number || "" }])
      )
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const result = r.self_reported_result || r.test_result || "";
      if (filter !== "all" && result !== filter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = (r.pii?.full_name || r.full_name || "").toLowerCase();
      const phone = (r.pii?.phone || r.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || r.id.toLowerCase().startsWith(q);
    });
  }, [rows, search, filter]);

  const counts = useMemo(() => {
    const c = { total: rows.length, reactive: 0, positive: 0, negative: 0, invalid: 0 };
    rows.forEach((r) => {
      const v = r.self_reported_result || r.test_result;
      if (v && v in c) (c as any)[v]++;
    });
    return c;
  }, [rows]);

  const toRecipient = (r: Row): SmsRecipient => ({
    id: r.id,
    name: r.pii?.full_name || r.full_name || "—",
    phone: (r.pii?.phone || r.phone || "").trim(),
  });

  const negativeFiltered = useMemo(
    () =>
      filtered.filter((r) => (r.self_reported_result || r.test_result) === "negative"),
    [filtered],
  );

  const openSmsForRow = (r: Row, templateKey = "negative_prep_invite") => {
    const rec = toRecipient(r);
    if (!rec.phone) {
      toast.error(t("ไม่มีเบอร์โทรของผู้รับ", "Recipient has no phone number"));
      return;
    }
    setSmsRecipients([rec]);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

  const openBulkSmsNegatives = (templateKey = "negative_prep_invite") => {
    const recipients = negativeFiltered.map(toRecipient).filter((r) => r.phone);
    if (recipients.length === 0) {
      toast.error(t("ไม่พบผู้รับผล Negative ที่มีเบอร์โทร", "No Negative recipients with a phone number"));
      return;
    }
    setSmsRecipients(recipients);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

  const isDirty = (r: Row) => {
    const e = edits[r.id];
    if (!e) return false;
    return e.status !== r.status || (e.tracking_number || "") !== (r.tracking_number || "");
  };

  const save = async (r: Row) => {
    const e = edits[r.id];
    if (!e) return;
    setSavingId(r.id);
    const { error } = await supabase
      .from("hiv_selftest_requests")
      .update({
        status: e.status,
        tracking_number: e.tracking_number || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    setSavingId(null);
    if (error) {
      console.error(error);
      toast.error(t("บันทึกไม่สำเร็จ", "Save failed"));
      return;
    }
    toast.success(t("บันทึกสำเร็จ", "Saved"));
    setRows((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, status: e.status, tracking_number: e.tracking_number || null } : x
      )
    );
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const r = confirmDelete;
    const id = r.id;
    setDeletingId(id);
    const { error } = await supabase.from("hiv_selftest_requests").delete().eq("id", id);
    setDeletingId(null);
    setConfirmDelete(null);
    if (error) {
      console.error(error);
      await logAudit({
        action_type: "data_delete",
        target_type: "hiv_selftest_requests",
        target_id: id,
        target_classification: "highly_restricted",
        result: "failed",
        reason: "admin_delete_selftest_case",
        metadata: { error: error.message },
      });
      toast.error(t("ลบไม่สำเร็จ", "Delete failed"));
      return;
    }
    await logAudit({
      action_type: "data_delete",
      target_type: "hiv_selftest_requests",
      target_id: id,
      target_classification: "highly_restricted",
      result: "allowed",
      reason: "admin_delete_selftest_case",
      metadata: {
        full_name: r.pii?.full_name || r.full_name || null,
        phone: r.pii?.phone || r.phone || null,
        status: r.status,
        test_result: r.test_result,
        self_reported_result: r.self_reported_result,
        result_submitted_at: r.result_submitted_at,
        created_at: r.created_at,
      },
    });
    toast.success(t("ลบเคสแล้ว", "Case deleted"));
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("รายงานผลชุดตรวจ", "Self-test Results")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("ทุกผลตรวจที่ส่งเข้ามาในระบบ พร้อมชื่อและเบอร์โทรเพื่อติดต่อ", "All submitted results with name & phone for follow-up contact.")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t("ทั้งหมด","Total"), value: counts.total, color: "text-foreground" },
          { label: t("Reactive","Reactive"), value: counts.reactive, color: "text-rose-600" },
          { label: t("Positive","Positive"), value: counts.positive, color: "text-rose-600" },
          { label: t("Negative","Negative"), value: counts.negative, color: "text-emerald-600" },
          { label: t("Invalid","Invalid"), value: counts.invalid, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <CardTitle className="text-base">{t("รายการผลตรวจ","Result List")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-64" placeholder={t("ค้นหา ชื่อ/เบอร์/รหัส","Search name/phone/id")} value={search} onChange={(e)=>setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("ทั้งหมด","All results")}</SelectItem>
                  <SelectItem value="reactive">Reactive</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`} />
              </Button>
            </div>
          </div>
          {negativeFiltered.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {t(
                  `พบผล Negative ${negativeFiltered.length} ราย — ส่ง SMS ติดตามรับ PrEP ได้`,
                  `${negativeFiltered.length} Negative results — send PrEP follow-up SMS`,
                )}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-emerald-500/40"
                  onClick={() => openBulkSmsNegatives("negative_prep_invite")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("เชิญรับ PrEP", "Invite for PrEP")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-emerald-500/40"
                  onClick={() => openBulkSmsNegatives("negative_prep_pickup")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("ติดต่อรับยา PrEP", "Contact for PrEP pickup")}
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">{t("ไม่มีข้อมูล","No data")}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("วันที่ส่งผล","Submitted")}</TableHead>
                    <TableHead>{t("ชื่อ","Name")}</TableHead>
                    <TableHead>{t("เบอร์โทร","Phone")}</TableHead>
                    <TableHead>{t("ผลตรวจ","Result")}</TableHead>
                    <TableHead>{t("สถานะการติดตาม","Follow-up Status")}</TableHead>
                    <TableHead>{t("เลขพัสดุ","Tracking #")}</TableHead>
                    <TableHead>{t("สาขา","Branch")}</TableHead>
                    <TableHead className="text-right">{t("การจัดการ","Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const result = r.self_reported_result || r.test_result || "—";
                    const name = r.pii?.full_name || r.full_name || "—";
                    const phone = r.pii?.phone || r.phone || "";
                    const date = r.result_submitted_at || r.created_at;
                    const e = edits[r.id] || { status: r.status, tracking_number: r.tracking_number || "" };
                    const dirty = isDirty(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(date).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})}</TableCell>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>
                          {phone ? (
                            <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3 w-3"/>{phone}
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={RESULT_COLOR[result] || ""}>{result}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={e.status}
                            onValueChange={(v) =>
                              setEdits((prev) => ({ ...prev, [r.id]: { ...e, status: v } }))
                            }
                          >
                            <SelectTrigger className="h-8 w-40"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {language === "th" ? o.labelTh : o.labelEn}
                                </SelectItem>
                              ))}
                              {/* Preserve any unknown legacy status */}
                              {!STATUS_OPTIONS.some((o) => o.value === e.status) && (
                                <SelectItem value={e.status}>{e.status}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-32"
                            placeholder="—"
                            value={e.tracking_number}
                            onChange={(ev) =>
                              setEdits((prev) => ({ ...prev, [r.id]: { ...e, tracking_number: ev.target.value } }))
                            }
                          />
                        </TableCell>
                        <TableCell><span className="text-xs">{r.assigned_branch || "—"}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.result_photo_url && (
                              <Button size="sm" variant="ghost" onClick={()=>setPhoto(r.result_photo_url)} title={t("ดูรูป","View photo")}>
                                <ImageIcon className="h-4 w-4"/>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={dirty ? "default" : "ghost"}
                              disabled={!dirty || savingId === r.id}
                              onClick={() => save(r)}
                              title={t("บันทึก","Save")}
                            >
                              {savingId === r.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === r.id}
                              onClick={() => setConfirmDelete(r)}
                              title={t("ลบเคส","Delete case")}
                            >
                              {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!photo} onOpenChange={(o)=>!o && setPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("รูปผลตรวจ","Result Photo")}</DialogTitle></DialogHeader>
          {photo && <img src={photo} alt="result" className="w-full rounded" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o)=>!o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ยืนยันการลบเคส","Confirm Delete Case")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `ต้องการลบเคสของ "${confirmDelete?.pii?.full_name || confirmDelete?.full_name || confirmDelete?.id.slice(0,8)}" ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
                `Delete case for "${confirmDelete?.pii?.full_name || confirmDelete?.full_name || confirmDelete?.id.slice(0,8)}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ยกเลิก","Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("ลบ","Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

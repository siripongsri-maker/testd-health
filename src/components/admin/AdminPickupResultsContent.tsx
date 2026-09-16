/**
 * ผลตรวจของผู้รับชุดตรวจหน้างาน (on-site pickup)
 *
 * แสดงว่าคนที่มารับชุดตรวจหน้างานในช่วงวันที่ที่เลือก มีใครส่งผลกลับมาแล้วบ้าง
 * และผลเป็นอะไร (1 ขีด = ไม่เกิดปฏิกิริยา, 2 ขีด = เกิดปฏิกิริยา)
 *
 * การจับคู่ผล: ใช้ผลที่อยู่ในแถวเดียวกันก่อน ถ้าไม่มีจะมองหาการส่งผลของเบอร์โทร
 * เดียวกันที่เกิดขึ้นหลังวันรับชุดตรวจ (ผู้ใช้บางคนส่งผลผ่านลิงก์สาธารณะ
 * ซึ่งสร้างเป็นอีกรายการหนึ่ง)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Download, Search, Store } from "lucide-react";
import { toast } from "sonner";
import {
  normalizeSelfTestResult,
  selfTestResultLabel,
  SELFTEST_RESULT_CLASS,
} from "@/lib/selftestResultLabels";

interface PiiRow {
  full_name: string | null;
  phone: string | null;
}

interface RawRow {
  id: string;
  created_at: string;
  status: string | null;
  assigned_branch: string | null;
  pickup_branch: string | null;
  self_reported_result: string | null;
  test_result: string | null;
  result_submitted_at: string | null;
  result_photo_url: string | null;
  full_name: string | null;
  phone: string | null;
  pii: PiiRow | PiiRow[] | null;
}

interface PersonRow {
  id: string;
  name: string;
  phone: string;
  branch: string;
  pickedUpAt: string;
  result: string | null;
  submittedAt: string | null;
  linked: boolean;
}

const TZ = "Asia/Bangkok";

/** YYYY-MM-DD in Bangkok time. */
function bkkToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function pii(r: RawRow): PiiRow | null {
  const p = r.pii;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function digits(v?: string | null): string {
  return String(v ?? "").replace(/\D/g, "");
}

function maskPhone(v: string): string {
  const d = digits(v);
  if (d.length < 6) return v || "—";
  return `${d.slice(0, 3)}-xxx-${d.slice(-2)}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminPickupResultsContent() {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const [from, setFrom] = useState<string>(bkkToday());
  const [to, setTo] = useState<string>(bkkToday());
  const [branch, setBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [reveal, setReveal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Bangkok day boundaries → UTC instants
      const startIso = new Date(`${from}T00:00:00+07:00`).toISOString();
      const endIso = new Date(`${to}T23:59:59.999+07:00`).toISOString();

      const select = `
        id, created_at, status, assigned_branch, pickup_branch,
        self_reported_result, test_result, result_submitted_at, result_photo_url,
        full_name, phone, pii:selftest_pii ( full_name, phone )
      `;

      const [pickupRes, submittedRes] = await Promise.all([
        supabase
          .from("hiv_selftest_requests")
          .select(select)
          .eq("delivery_mode", "pickup")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .order("created_at", { ascending: true })
          .limit(2000),
        supabase
          .from("hiv_selftest_requests")
          .select(select)
          .not("result_submitted_at", "is", null)
          .gte("result_submitted_at", startIso)
          .order("result_submitted_at", { ascending: true })
          .limit(3000),
      ]);

      if (pickupRes.error || submittedRes.error) {
        console.error(pickupRes.error || submittedRes.error);
        toast.error(t("โหลดข้อมูลไม่สำเร็จ", "Failed to load data"));
        return;
      }

      const submissions = (submittedRes.data ?? []) as unknown as RawRow[];
      const byPhone = new Map<string, RawRow[]>();
      submissions.forEach((s) => {
        const ph = digits(pii(s)?.phone ?? s.phone);
        if (!ph) return;
        const list = byPhone.get(ph) ?? [];
        list.push(s);
        byPhone.set(ph, list);
      });

      const rows: PersonRow[] = ((pickupRes.data ?? []) as unknown as RawRow[]).map((r) => {
        const p = pii(r);
        const phone = p?.phone ?? r.phone ?? "";
        const ownResult = r.self_reported_result ?? r.test_result;
        let result: string | null = ownResult ?? null;
        let submittedAt: string | null = r.result_submitted_at;
        let linked = false;

        if (!result) {
          const ph = digits(phone);
          const match = (byPhone.get(ph) ?? [])
            .filter((s) => s.id !== r.id && new Date(s.result_submitted_at!) >= new Date(r.created_at))
            .sort((a, b) => +new Date(a.result_submitted_at!) - +new Date(b.result_submitted_at!))[0];
          if (match) {
            result = match.self_reported_result ?? match.test_result ?? null;
            submittedAt = match.result_submitted_at;
            linked = true;
          }
        }

        return {
          id: r.id,
          name: p?.full_name ?? r.full_name ?? t("ไม่ระบุชื่อ", "No name"),
          phone,
          branch: r.pickup_branch ?? r.assigned_branch ?? "—",
          pickedUpAt: r.created_at,
          result,
          submittedAt: result ? submittedAt : null,
          linked,
        };
      });

      setPeople(rows);
    } finally {
      setLoading(false);
    }
  }, [from, to, language]);

  useEffect(() => {
    load();
  }, [load]);

  const branches = useMemo(
    () => Array.from(new Set(people.map((p) => p.branch).filter((b) => b && b !== "—"))).sort(),
    [people],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (branch !== "all" && p.branch !== branch) return false;
      const key = normalizeSelfTestResult(p.result);
      if (statusFilter === "submitted" && key === "unknown") return false;
      if (statusFilter === "pending" && key !== "unknown") return false;
      if (statusFilter !== "all" && statusFilter !== "submitted" && statusFilter !== "pending" && key !== statusFilter)
        return false;
      if (q && !(p.name.toLowerCase().includes(q) || digits(p.phone).includes(digits(q)))) return false;
      return true;
    });
  }, [people, branch, statusFilter, search]);

  const totals = useMemo(() => {
    const base = people.filter((p) => branch === "all" || p.branch === branch);
    const count = (k: string) => base.filter((p) => normalizeSelfTestResult(p.result) === k).length;
    return {
      total: base.length,
      submitted: base.filter((p) => normalizeSelfTestResult(p.result) !== "unknown").length,
      negative: count("negative"),
      reactive: count("reactive") + count("positive"),
      invalid: count("invalid"),
      pending: count("unknown"),
    };
  }, [people, branch]);

  const exportCsv = () => {
    const header = [
      t("ชื่อ", "Name"),
      t("เบอร์โทร", "Phone"),
      t("สาขา", "Branch"),
      t("วันเวลาที่รับชุดตรวจ", "Picked up at"),
      t("ผลตรวจ", "Result"),
      t("วันเวลาที่ส่งผล", "Submitted at"),
    ];
    const lines = filtered.map((p) => [
      p.name,
      reveal ? p.phone : maskPhone(p.phone),
      p.branch,
      fmtTime(p.pickedUpAt),
      selfTestResultLabel(p.result, language === "th" ? "th" : "en"),
      fmtTime(p.submittedAt),
    ]);
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pickup-results-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kpi = (label: string, value: number, tone: string) => (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-primary" />
            {t("ผลตรวจของผู้รับชุดตรวจหน้างาน", "On-site pickup — result submissions")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "เลือกวันที่รับชุดตรวจ ระบบจะแสดงว่ามีใครส่งผลกลับมาแล้วบ้าง และผลเป็นอะไร",
              "Pick the pickup date to see who has already submitted a result and what it was.",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground">{t("ตั้งแต่วันที่", "From")}</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[10.5rem]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("ถึงวันที่", "To")}</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[10.5rem]" />
            </div>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-9 w-[10rem]">
                <SelectValue placeholder={t("ทุกสาขา", "All branches")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ทุกสาขา", "All branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[12rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ทั้งหมด", "All")}</SelectItem>
                <SelectItem value="submitted">{t("ส่งผลแล้ว", "Submitted")}</SelectItem>
                <SelectItem value="pending">{t("ยังไม่ส่งผล", "Not submitted")}</SelectItem>
                <SelectItem value="negative">{t("ไม่เกิดปฏิกิริยา (1 ขีด)", "Non-reactive")}</SelectItem>
                <SelectItem value="reactive">{t("เกิดปฏิกิริยา (2 ขีด)", "Reactive")}</SelectItem>
                <SelectItem value="invalid">{t("อ่านผลไม่ได้", "Invalid")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("ค้นหาชื่อ/เบอร์โทร", "Search name or phone")}
                className="h-9 w-[14rem] pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReveal((v) => !v)}>
              {reveal ? t("ซ่อนเบอร์โทร", "Hide phones") : t("แสดงเบอร์โทร", "Reveal phones")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {kpi(t("รับชุดตรวจหน้างาน", "Picked up on site"), totals.total, "text-primary")}
            {kpi(t("ส่งผลแล้ว", "Submitted"), totals.submitted, "text-foreground")}
            {kpi(t("ไม่เกิดปฏิกิริยา (1 ขีด)", "Non-reactive"), totals.negative, "text-emerald-600")}
            {kpi(t("เกิดปฏิกิริยา (2 ขีด)", "Reactive"), totals.reactive, "text-rose-600")}
            {kpi(t("ยังไม่ส่งผล", "Not submitted"), totals.pending, "text-amber-600")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("รายชื่อ", "People")} ({filtered.length.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("ไม่พบผู้รับชุดตรวจหน้างานในช่วงวันที่นี้", "No on-site pickups in this date range")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ชื่อ", "Name")}</TableHead>
                  <TableHead>{t("เบอร์โทร", "Phone")}</TableHead>
                  <TableHead>{t("สาขา", "Branch")}</TableHead>
                  <TableHead>{t("รับชุดตรวจ", "Picked up")}</TableHead>
                  <TableHead>{t("ผลตรวจ", "Result")}</TableHead>
                  <TableHead>{t("ส่งผลเมื่อ", "Submitted")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const key = normalizeSelfTestResult(p.result);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.phone ? (reveal ? p.phone : maskPhone(p.phone)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{p.branch}</TableCell>
                      <TableCell className="text-xs">{fmtTime(p.pickedUpAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SELFTEST_RESULT_CLASS[key]}>
                          {selfTestResultLabel(p.result, language === "th" ? "th" : "en")}
                        </Badge>
                        {p.linked && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            {t("จับคู่จากเบอร์โทร", "matched by phone")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{fmtTime(p.submittedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { th as thLocale, enUS } from "date-fns/locale";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, ChevronRight,
  Clock, Loader2, Minus, Package, RefreshCw, ShieldAlert, TrendingDown,
  TrendingUp, Truck, UserRoundCheck, Users, Wallet, XCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types matching public.get_ops_dashboard()
// ─────────────────────────────────────────────────────────────
interface OpsToday {
  total: number; remaining: number; overdue: number; in_service: number;
  done: number; cancelled: number; no_show: number; walkins: number;
}
interface OpsDay {
  date: string; dow: number; total: number; morning: number;
  afternoon: number; evening: number; peak_hour: string | null; blocked: boolean;
}
interface OpsBranch {
  branch_id: string; name_th: string; name_en: string | null; today: number; next7: number;
}
interface OpsWeekBlock {
  bookings: number; done: number; no_show: number; cancelled: number; walkins: number;
}
interface OpsData {
  generated_at: string;
  today_date: string;
  today: OpsToday;
  next7: OpsDay[];
  branch_load: OpsBranch[];
  week: { start: string; current: OpsWeekBlock; previous: OpsWeekBlock; kits_current: number; kits_previous: number };
  daily_series: Array<{ date: string; booked: number; done: number; no_show: number; kits: number }>;
  kits: { pending: number; shipped: number; delivered_waiting_result: number; result_submitted_7d: number; new_today: number };
  actions: { kits_to_pack: number; kits_stuck_shipped: number; payouts_pending: number; open_chats: number; tomorrow_bookings: number };
}

const DOW_TH = ["", "จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const DOW_EN = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pctDelta(now: number, before: number): number | null {
  if (!before) return now > 0 ? 100 : null;
  return Math.round(((now - before) / before) * 100);
}

// ─────────────────────────────────────────────────────────────
function DeltaPill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const up = value > 0, flat = value === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-semibold",
      flat ? "text-muted-foreground" : up ? "text-emerald-600" : "text-rose-500"
    )}>
      <Icon className="h-3 w-3" />{value > 0 ? "+" : ""}{value}%
    </span>
  );
}

function HeroStat({
  label, value, icon: Icon, tone = "default", hint, onClick,
}: {
  label: string; value: number; icon: React.ElementType;
  tone?: "default" | "good" | "warn" | "bad"; hint?: string; onClick?: () => void;
}) {
  const toneRing = {
    default: "from-primary/15 to-primary/0 text-primary",
    good: "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
    warn: "from-amber-500/15 to-amber-500/0 text-amber-600",
    bad: "from-rose-500/15 to-rose-500/0 text-rose-600",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left transition-all",
        onClick && "hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", toneRing)} />
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <Icon className={cn("h-4 w-4", toneRing.split(" ").pop())} />
          {onClick && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
        </div>
        <div className="text-3xl font-bold leading-none text-foreground">
          <AnimatedCounter value={value} duration={700} />
        </div>
        <p className="mt-1 text-xs font-medium text-foreground/80">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
export default function AdminDashboardContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const locale = isTh ? thLocale : enUS;
  const [, setSearchParams] = useSearchParams();
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = useCallback((tab: string) => setSearchParams({ tab }), [setSearchParams]);

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    const { data: res, error: err } = await supabase.rpc("get_ops_dashboard" as any);
    if (err) setError(err.message);
    else { setError(null); setData(res as unknown as OpsData); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(true), 120000);
    return () => clearInterval(t);
  }, [load]);

  const next7 = useMemo(() => (data?.next7 ?? []).map((d) => ({
    ...d,
    label: `${isTh ? DOW_TH[d.dow] : DOW_EN[d.dow]} ${format(parseISO(d.date), "d/M")}`,
  })), [data, isTh]);

  const series = useMemo(() => (data?.daily_series ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), "d MMM", { locale }),
  })), [data, locale]);

  const maxNext7 = Math.max(1, ...next7.map((d) => d.total));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-foreground">
            {isTh ? "โหลดข้อมูลภาพรวมไม่สำเร็จ" : "Could not load the overview"}
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" onClick={() => load()}>{isTh ? "ลองอีกครั้ง" : "Retry"}</Button>
        </CardContent>
      </Card>
    );
  }

  const t = data.today;
  const w = data.week;
  const a = data.actions;

  const weekRows = [
    { key: "bookings", label: isTh ? "นัดหมาย" : "Bookings", now: w.current.bookings, prev: w.previous.bookings },
    { key: "done", label: isTh ? "รับบริการสำเร็จ" : "Served", now: w.current.done, prev: w.previous.done },
    { key: "walkins", label: isTh ? "Walk-in" : "Walk-ins", now: w.current.walkins, prev: w.previous.walkins },
    { key: "no_show", label: isTh ? "ไม่มาตามนัด" : "No-show", now: w.current.no_show, prev: w.previous.no_show, invert: true },
    { key: "kits", label: isTh ? "ขอชุดตรวจ" : "Kit requests", now: w.kits_current, prev: w.kits_previous },
  ];

  const actionItems = [
    { n: a.kits_to_pack, label: isTh ? "ชุดตรวจรอจัดส่ง" : "Kits to pack", icon: Package, tab: "kit-orders", tone: "warn" as const },
    { n: a.kits_stuck_shipped, label: isTh ? "ส่งแล้วเกิน 7 วัน ยังไม่ถึง" : "Shipped >7 days, undelivered", icon: Truck, tab: "kit-orders", tone: "bad" as const },
    { n: a.tomorrow_bookings, label: isTh ? "นัดหมายพรุ่งนี้ (เตรียมทีม)" : "Bookings tomorrow", icon: CalendarCheck, tab: "schedule", tone: "default" as const },
    { n: a.payouts_pending, label: isTh ? "ค่าเดินทางรออนุมัติ" : "Travel payouts pending", icon: Wallet, tab: "daily-ops", tone: "warn" as const },
    { n: a.open_chats, label: isTh ? "แชทที่ยังเปิดอยู่" : "Open support chats", icon: ShieldAlert, tab: "user-chats", tone: "default" as const },
  ].filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isTh ? "ศูนย์วางแผนงานประจำวัน" : "Daily Operations Planner"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(data.today_date), isTh ? "EEEEที่ d MMMM yyyy" : "EEEE d MMMM yyyy", { locale })}
            {" · "}
            {isTh ? "อัปเดตล่าสุด" : "Updated"} {format(new Date(data.generated_at), "HH:mm")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isTh ? "รีเฟรช" : "Refresh"}
        </Button>
      </div>

      {/* Today hero */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HeroStat
          label={isTh ? "นัดหมายวันนี้" : "Appointments today"} value={t.total}
          hint={isTh ? `เหลืออีก ${t.remaining} คิว` : `${t.remaining} left`}
          icon={CalendarDays} onClick={() => go("today")}
        />
        <HeroStat
          label={isTh ? "กำลังรับบริการ" : "In service now"} value={t.in_service}
          hint={isTh ? `Walk-in วันนี้ ${t.walkins}` : `${t.walkins} walk-ins`}
          icon={UserRoundCheck} tone="good" onClick={() => go("queue-board")}
        />
        <HeroStat
          label={isTh ? "เสร็จสิ้นแล้ว" : "Completed"} value={t.done}
          hint={isTh ? `ยกเลิก ${t.cancelled} · ไม่มา ${t.no_show}` : `${t.cancelled} cancelled · ${t.no_show} no-show`}
          icon={CheckCircle2} tone="good" onClick={() => go("daily-branch-brief")}
        />
        <HeroStat
          label={isTh ? "เลยเวลานัด ยังไม่เช็คอิน" : "Overdue check-in"} value={t.overdue}
          hint={isTh ? "ต้องติดตามทันที" : "Follow up now"}
          icon={Clock} tone={t.overdue > 0 ? "bad" : "default"} onClick={() => go("front-desk")}
        />
      </div>

      {/* Action queue */}
      {actionItems.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isTh ? "สิ่งที่ต้องจัดการ" : "Needs action"}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {actionItems.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.tab)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/40",
                  item.tone === "bad" ? "border-rose-500/30 bg-rose-500/5"
                    : item.tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/60"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0",
                  item.tone === "bad" ? "text-rose-600" : item.tone === "warn" ? "text-amber-600" : "text-primary")} />
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <span className="text-lg font-bold text-foreground">{item.n}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7-day plan */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isTh ? "แผนงาน 7 วันข้างหน้า" : "Next 7 days plan"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isTh ? "ใช้วางกำลังคนต่อวัน — แถบสีแสดงช่วงเช้า / บ่าย / เย็น" : "Staffing view — morning / afternoon / evening split"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {next7.map((d, i) => (
              <div
                key={d.date}
                className={cn(
                  "rounded-xl border p-3",
                  d.blocked ? "border-rose-500/30 bg-rose-500/5"
                    : i === 0 ? "border-primary/40 bg-primary/5" : "border-border/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{d.label}</span>
                  {i === 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{isTh ? "วันนี้" : "Today"}</Badge>}
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{d.total}</p>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="bg-sky-500" style={{ width: `${(d.morning / Math.max(d.total, 1)) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(d.afternoon / Math.max(d.total, 1)) * 100}%` }} />
                  <div className="bg-violet-500" style={{ width: `${(d.evening / Math.max(d.total, 1)) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {d.blocked
                    ? (isTh ? "ปิดทำการบางส่วน" : "Closure scheduled")
                    : d.peak_hour
                      ? `${isTh ? "ช่วงพีค" : "Peak"} ${d.peak_hour}`
                      : (isTh ? "ยังไม่มีคิว" : "No bookings")}
                </p>
                <div className="mt-1 h-1 rounded-full bg-primary/20">
                  <div className="h-1 rounded-full bg-primary" style={{ width: `${(d.total / maxNext7) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />{isTh ? "ก่อน 12:00" : "Before 12:00"}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />12:00–16:00</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />{isTh ? "หลัง 16:00" : "After 16:00"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Week comparison + branch load */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isTh ? "สัปดาห์นี้เทียบสัปดาห์ก่อน" : "This week vs last week"}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isTh ? "เริ่มสัปดาห์" : "Week of"} {format(parseISO(w.start), "d MMM", { locale })}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekRows.map((r) => {
              const delta = pctDelta(r.now, r.prev);
              return (
                <div key={r.key} className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2">
                  <span className="flex-1 text-sm text-foreground">{r.label}</span>
                  <span className="text-lg font-bold text-foreground">{r.now}</span>
                  <span className="w-16 text-right text-[11px] text-muted-foreground">
                    {isTh ? "ก่อน" : "prev"} {r.prev}
                  </span>
                  <span className="w-16 text-right">
                    <DeltaPill value={r.invert && delta !== null ? delta : delta} />
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isTh ? "ภาระงานรายสาขา" : "Branch workload"}</CardTitle>
            <p className="text-xs text-muted-foreground">{isTh ? "วันนี้ และ 7 วันข้างหน้า" : "Today and next 7 days"}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.branch_load.map((b) => {
              const max = Math.max(1, ...data.branch_load.map((x) => x.next7));
              return (
                <div key={b.branch_id} className="rounded-lg border border-border/40 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{isTh ? b.name_th : (b.name_en || b.name_th)}</span>
                    <span className="text-xs text-muted-foreground">
                      {isTh ? "วันนี้" : "today"} <b className="text-foreground">{b.today}</b> · 7d <b className="text-foreground">{b.next7}</b>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(b.next7 / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {data.branch_load.length === 0 && (
              <p className="text-sm text-muted-foreground">{isTh ? "ยังไม่มีข้อมูลสาขา" : "No branch data"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 14-day trend */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isTh ? "แนวโน้ม 14 วันล่าสุด" : "Last 14 days"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="booked" name={isTh ? "นัดหมาย" : "Booked"} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="done" name={isTh ? "สำเร็จ" : "Served"} fill="hsl(142, 70%, 40%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="no_show" name={isTh ? "ไม่มา" : "No-show"} fill="hsl(0, 72%, 55%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="kits" name={isTh ? "ชุดตรวจ" : "Kits"} fill="hsl(265, 65%, 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Kit pipeline */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isTh ? "สายพานชุดตรวจ HIV" : "HIV kit pipeline"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { n: data.kits.new_today, l: isTh ? "คำขอวันนี้" : "New today", c: "text-primary" },
            { n: data.kits.pending, l: isTh ? "รอจัดส่ง" : "To pack", c: "text-amber-600" },
            { n: data.kits.shipped, l: isTh ? "กำลังจัดส่ง" : "Shipping", c: "text-sky-600" },
            { n: data.kits.delivered_waiting_result, l: isTh ? "ถึงแล้ว รอผล" : "Awaiting result", c: "text-violet-600" },
            { n: data.kits.result_submitted_7d, l: isTh ? "รายงานผล 7 วัน" : "Results 7d", c: "text-emerald-600" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
              <p className={cn("text-2xl font-bold", k.c)}><AnimatedCounter value={k.n} duration={700} /></p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{k.l}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FlaskConical, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { bkkDay, formatBkkDayLabel } from "./FollowupStatsPanel";

export interface ResultStatRow {
  id: string;
  created_at: string;
  result_submitted_at: string | null;
  test_result: string | null;
  self_reported_result: string | null;
  result_photo_url: string | null;
  care_action: string | null;
  province: string | null;
  full_name?: string | null;
  phone?: string | null;
  tracking_number?: string | null;
}

interface DailyStat {
  day: string;
  total: number;
  negative: number;
  reactive: number;
  invalid: number;
  withPhoto: number;
  followedUp: number;
}

function resultOf(r: ResultStatRow): "negative" | "reactive" | "invalid" | "other" {
  const v = (r.self_reported_result || r.test_result || "").toLowerCase();
  if (v === "negative" || v === "non_reactive") return "negative";
  if (v === "reactive" || v === "positive") return "reactive";
  if (v === "invalid") return "invalid";
  return "other";
}

export default function SelftestResultsStatsPanel({ rows }: { rows: ResultStatRow[] }) {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);
  const [rangeDays, setRangeDays] = useState("30");
  const [drill, setDrill] = useState<{ type: "day" | "province"; key: string } | null>(null);

  const rangeBounds = useMemo(() => {
    const todayDay = bkkDay(new Date().toISOString());
    const start = new Date(`${todayDay}T00:00:00+07:00`);
    const rangeStart = new Date(start.getTime() - (Number(rangeDays) - 1) * 24 * 60 * 60 * 1000);
    return { from: bkkDay(rangeStart.toISOString()), to: todayDay };
  }, [rangeDays]);

  const rangeRows = useMemo(
    () => rows.filter((r) => {
      const day = bkkDay(r.result_submitted_at || r.created_at);
      return day >= rangeBounds.from && day <= rangeBounds.to;
    }),
    [rows, rangeBounds],
  );

  const daily = useMemo<DailyStat[]>(() => {
    const map = new Map<string, DailyStat>();
    for (const r of rangeRows) {
      const day = bkkDay(r.result_submitted_at || r.created_at);
      let s = map.get(day);
      if (!s) {
        s = { day, total: 0, negative: 0, reactive: 0, invalid: 0, withPhoto: 0, followedUp: 0 };
        map.set(day, s);
      }
      s.total++;
      const res = resultOf(r);
      if (res === "negative") s.negative++;
      else if (res === "reactive") s.reactive++;
      else if (res === "invalid") s.invalid++;
      if (r.result_photo_url) s.withPhoto++;
      if (r.care_action && r.care_action !== "pending") s.followedUp++;
    }
    return Array.from(map.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [rangeRows]);

  const totals = useMemo(
    () =>
      daily.reduce(
        (acc, d) => ({
          total: acc.total + d.total,
          negative: acc.negative + d.negative,
          reactive: acc.reactive + d.reactive,
          invalid: acc.invalid + d.invalid,
          withPhoto: acc.withPhoto + d.withPhoto,
          followedUp: acc.followedUp + d.followedUp,
        }),
        { total: 0, negative: 0, reactive: 0, invalid: 0, withPhoto: 0, followedUp: 0 }
      ),
    [daily]
  );

  const byProvince = useMemo(() => {
    const map = new Map<string, number>();
    rangeRows.forEach((r) => {
      const p = r.province || t("ไม่ระบุ", "Unknown");
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rangeRows, language]);

  const unknownProvince = t("ไม่ระบุ", "Unknown");
  const drillRows = useMemo(() => {
    if (!drill) return [];
    return rangeRows
      .filter((r) =>
        drill.type === "day"
          ? bkkDay(r.result_submitted_at || r.created_at) === drill.key
          : (r.province || unknownProvince) === drill.key,
      )
      .sort((a, b) =>
        (b.result_submitted_at || b.created_at).localeCompare(a.result_submitted_at || a.created_at),
      );
  }, [drill, rangeRows, unknownProvince]);

  const resultLabel = (r: ResultStatRow) => {
    const res = resultOf(r);
    if (res === "negative") return { text: t("ผลลบ", "Negative"), cls: "text-emerald-600" };
    if (res === "reactive") return { text: "Reactive", cls: "text-rose-600" };
    if (res === "invalid") return { text: t("อ่านไม่ได้", "Invalid"), cls: "text-amber-600" };
    return { text: t("ไม่ระบุ", "Unknown"), cls: "text-muted-foreground" };
  };


  const reactiveRate = totals.total > 0 ? Math.round((totals.reactive / totals.total) * 100) : 0;
  const photoRate = totals.total > 0 ? Math.round((totals.withPhoto / totals.total) * 100) : 0;
  const followRate = totals.total > 0 ? Math.round((totals.followedUp / totals.total) * 100) : 0;

  const exportCsv = () => {
    const header = ["date", "total", "negative", "reactive", "invalid", "with_photo", "followed_up"];
    const lines = daily.map((d) =>
      [d.day, d.total, d.negative, d.reactive, d.invalid, d.withPhoto, d.followedUp].join(",")
    );
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `selftest-results-daily-stats-${rangeBounds.from}-to-${rangeBounds.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { icon: FlaskConical, label: t("ผลที่ส่งทั้งหมด", "Total results"), value: totals.total, tone: "text-primary" },
    { icon: CheckCircle2, label: t("ผลลบ (Negative)", "Negative"), value: totals.negative, tone: "text-emerald-600" },
    { icon: ShieldAlert, label: t("Reactive", "Reactive"), value: totals.reactive, tone: "text-rose-600" },
    { icon: AlertTriangle, label: t("อ่านผลไม่ได้", "Invalid"), value: totals.invalid, tone: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">{t("ช่วงวันที่", "Date range")}</div>
          <div className="text-xs text-muted-foreground">
            {t(`แสดงผลย้อนหลัง ${rangeDays} วัน รวมวันนี้`, `Showing the last ${rangeDays} days including today`)}
          </div>
        </div>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-full sm:w-44" aria-label={t("เลือกช่วงวันที่", "Select date range")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("ย้อนหลัง 7 วัน", "Last 7 days")}</SelectItem>
            <SelectItem value="30">{t("ย้อนหลัง 30 วัน", "Last 30 days")}</SelectItem>
            <SelectItem value="90">{t("ย้อนหลัง 90 วัน", "Last 90 days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <k.icon className={`h-4 w-4 ${k.tone}`} />
                {k.label}
              </div>
              <div className="text-2xl font-bold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {t("อัตรา Reactive", "Reactive rate")}: {reactiveRate}%
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("มีรูปผลตรวจ", "With photo")}: {photoRate}%
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("ติดตามแล้ว", "Followed up")}: {followRate}%
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("สถิติรายวัน", "Daily statistics")}</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-2 font-medium">{t("วันที่", "Date")}</th>
                  <th className="text-center p-2 font-medium">{t("ทั้งหมด", "Total")}</th>
                  <th className="text-center p-2 font-medium">{t("ผลลบ", "Negative")}</th>
                  <th className="text-center p-2 font-medium">Reactive</th>
                  <th className="text-center p-2 font-medium">{t("อ่านไม่ได้", "Invalid")}</th>
                  <th className="text-center p-2 font-medium">{t("มีรูป", "Photo")}</th>
                  <th className="text-center p-2 font-medium">{t("ติดตามแล้ว", "Followed up")}</th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      {t("ไม่มีข้อมูล", "No data")}
                    </td>
                  </tr>
                ) : (
                  daily.map((d) => (
                    <tr
                      key={d.day}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDrill({ type: "day", key: d.day })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setDrill({ type: "day", key: d.day });
                      }}
                      className="border-t cursor-pointer hover:bg-muted/50 focus:bg-muted/50 outline-none"
                    >
                      <td className="p-2 whitespace-nowrap underline decoration-dotted underline-offset-4">
                        {formatBkkDayLabel(d.day, language)}
                      </td>
                      <td className="text-center p-2 font-semibold">{d.total}</td>
                      <td className="text-center p-2 text-emerald-600">{d.negative}</td>
                      <td className="text-center p-2 text-rose-600">{d.reactive}</td>
                      <td className="text-center p-2 text-amber-600">{d.invalid}</td>
                      <td className="text-center p-2 text-muted-foreground">{d.withPhoto}</td>
                      <td className="text-center p-2 text-muted-foreground">{d.followedUp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("จังหวัดที่ส่งผลมากที่สุด", "Top provinces")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byProvince.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("ไม่มีข้อมูล", "No data")}</div>
          ) : (
            byProvince.map(([p, n]) => {
              const max = byProvince[0][1] || 1;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDrill({ type: "province", key: p })}
                  className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="underline decoration-dotted underline-offset-4">{p}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.round((n / max) * 100)}%` }} />
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {drill?.type === "day"
                ? `${t("เคสวันที่", "Cases on")} ${drill ? formatBkkDayLabel(drill.key, language) : ""}`
                : `${t("เคสในจังหวัด", "Cases in")} ${drill?.key ?? ""}`}
              <span className="ml-2 text-muted-foreground font-normal">({drillRows.length})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
            {drillRows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">{t("ไม่มีข้อมูล", "No data")}</div>
            ) : (
              <div className="space-y-2">
                {drillRows.map((r) => {
                  const lbl = resultLabel(r);
                  return (
                    <div key={r.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {r.full_name || t("ไม่ระบุชื่อ", "Unnamed")}
                        </span>
                        <span className={`text-xs font-semibold ${lbl.cls}`}>{lbl.text}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {r.phone && <span>{r.phone}</span>}
                        <span>{r.province || unknownProvince}</span>
                        <span>{formatBkkDayLabel(bkkDay(r.result_submitted_at || r.created_at), language)}</span>
                        {r.tracking_number && <span>#{r.tracking_number}</span>}
                        {r.result_photo_url && <span>{t("มีรูปผล", "Has photo")}</span>}
                        {r.care_action && r.care_action !== "pending" && (
                          <span className="text-emerald-600">{t("ติดตามแล้ว", "Followed up")}</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground/70 font-mono">
                        {r.id.slice(0, 8)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

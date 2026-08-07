import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, PhoneCall, Users, CheckCircle2, CalendarClock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export interface StatRow {
  id: string;
  created_at: string;
  result_submitted_at: string | null;
  care_action: string | null;
  assigned_branch: string | null;
  contact_attempt_1_at: string | null;
  contact_attempt_2_at: string | null;
  contact_attempt_3_at: string | null;
}

/** Bangkok calendar date (YYYY-MM-DD) for an ISO timestamp */
export function bkkDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatBkkDayLabel(day: string, language: string) {
  if (!day) return "";
  const d = new Date(`${day}T00:00:00+07:00`);
  return d.toLocaleDateString(language === "th" ? "th-TH" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface DailyStat {
  day: string;
  cases: number;
  calls: number;
  call1: number;
  call2: number;
  call3: number;
  contacted: number;
  scheduled: number;
  inCare: number;
  unreachable: number;
  declined: number;
  pending: number;
}

export default function FollowupStatsPanel({ rows }: { rows: StatRow[] }) {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const daily = useMemo<DailyStat[]>(() => {
    const map = new Map<string, DailyStat>();
    const ensure = (day: string) => {
      let s = map.get(day);
      if (!s) {
        s = { day, cases: 0, calls: 0, call1: 0, call2: 0, call3: 0, contacted: 0, scheduled: 0, inCare: 0, unreachable: 0, declined: 0, pending: 0 };
        map.set(day, s);
      }
      return s;
    };

    for (const r of rows) {
      const caseDay = bkkDay(r.result_submitted_at || r.created_at);
      const s = ensure(caseDay);
      s.cases++;
      const a = r.care_action || "pending";
      if (a === "contacted") s.contacted++;
      else if (a === "scheduled") s.scheduled++;
      else if (a === "in_care") s.inCare++;
      else if (a === "unreachable") s.unreachable++;
      else if (a === "declined") s.declined++;
      else s.pending++;

      // Calls counted on the day the call happened
      const attempts: Array<[string | null, 1 | 2 | 3]> = [
        [r.contact_attempt_1_at, 1],
        [r.contact_attempt_2_at, 2],
        [r.contact_attempt_3_at, 3],
      ];
      for (const [at, idx] of attempts) {
        if (!at) continue;
        const cs = ensure(bkkDay(at));
        cs.calls++;
        if (idx === 1) cs.call1++;
        else if (idx === 2) cs.call2++;
        else cs.call3++;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [rows]);

  const totals = useMemo(() => {
    return daily.reduce(
      (acc, d) => ({
        cases: acc.cases + d.cases,
        calls: acc.calls + d.calls,
        contacted: acc.contacted + d.contacted,
        scheduled: acc.scheduled + d.scheduled,
        inCare: acc.inCare + d.inCare,
        unreachable: acc.unreachable + d.unreachable,
        declined: acc.declined + d.declined,
        pending: acc.pending + d.pending,
      }),
      { cases: 0, calls: 0, contacted: 0, scheduled: 0, inCare: 0, unreachable: 0, declined: 0, pending: 0 }
    );
  }, [daily]);

  const reachRate = totals.cases > 0
    ? Math.round(((totals.contacted + totals.scheduled + totals.inCare) / totals.cases) * 100)
    : 0;
  const linkRate = totals.cases > 0 ? Math.round(((totals.scheduled + totals.inCare) / totals.cases) * 100) : 0;

  const exportCsv = () => {
    const header = [
      "date", "cases", "calls", "call_1", "call_2", "call_3",
      "contacted", "scheduled", "in_care", "unreachable", "declined", "pending",
    ];
    const lines = daily.map((d) =>
      [d.day, d.cases, d.calls, d.call1, d.call2, d.call3, d.contacted, d.scheduled, d.inCare, d.unreachable, d.declined, d.pending].join(",")
    );
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `followup-daily-stats-${bkkDay(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { icon: Users, label: t("เคสทั้งหมด", "Total cases"), value: totals.cases, tone: "text-primary" },
    { icon: PhoneCall, label: t("การโทรทั้งหมด", "Total calls"), value: totals.calls, tone: "text-blue-600" },
    { icon: CalendarClock, label: t("นัดเข้ารักษา", "Scheduled"), value: totals.scheduled, tone: "text-indigo-600" },
    { icon: CheckCircle2, label: t("เข้าสู่การรักษา", "In care"), value: totals.inCare, tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-4">
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
          {t("อัตราติดต่อได้", "Reach rate")}: {reachRate}%
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("อัตราส่งต่อเข้ารักษา", "Linkage rate")}: {linkRate}%
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("ติดต่อไม่ได้", "Unreachable")}: {totals.unreachable}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("รอติดตาม", "Pending")}: {totals.pending}
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
                  <th className="text-center p-2 font-medium">{t("เคส", "Cases")}</th>
                  <th className="text-center p-2 font-medium">{t("โทร", "Calls")}</th>
                  <th className="text-center p-2 font-medium">{t("ครั้งที่ 1", "1st")}</th>
                  <th className="text-center p-2 font-medium">{t("ครั้งที่ 2", "2nd")}</th>
                  <th className="text-center p-2 font-medium">{t("ครั้งที่ 3", "3rd")}</th>
                  <th className="text-center p-2 font-medium">{t("ติดต่อแล้ว", "Contacted")}</th>
                  <th className="text-center p-2 font-medium">{t("นัดรักษา", "Scheduled")}</th>
                  <th className="text-center p-2 font-medium">{t("เข้ารักษา", "In care")}</th>
                  <th className="text-center p-2 font-medium">{t("ติดต่อไม่ได้", "Unreachable")}</th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">{t("ไม่มีข้อมูล", "No data")}</td></tr>
                ) : daily.map((d) => (
                  <tr key={d.day} className="border-t">
                    <td className="p-2 whitespace-nowrap">{formatBkkDayLabel(d.day, language)}</td>
                    <td className="text-center p-2 font-semibold">{d.cases}</td>
                    <td className="text-center p-2">{d.calls}</td>
                    <td className="text-center p-2 text-muted-foreground">{d.call1}</td>
                    <td className="text-center p-2 text-muted-foreground">{d.call2}</td>
                    <td className="text-center p-2 text-muted-foreground">{d.call3}</td>
                    <td className="text-center p-2">{d.contacted}</td>
                    <td className="text-center p-2">{d.scheduled}</td>
                    <td className="text-center p-2 text-emerald-600">{d.inCare}</td>
                    <td className="text-center p-2 text-muted-foreground">{d.unreachable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

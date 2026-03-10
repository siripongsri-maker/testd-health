import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import type { MonthlyBreakdown } from "@/hooks/useAdminAnalytics";
import type { MetricDef } from "@/hooks/useAdminAnalytics";
import { useLanguage } from "@/lib/i18n";

interface Props {
  data: MonthlyBreakdown[];
  metrics: MetricDef[];
  loading?: boolean;
}

export function MonthlyBreakdownTable({ data, metrics, loading }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";

  if (loading || data.length === 0) return null;

  // Only show metrics that are in the data
  const visibleMetrics = metrics.filter((m) => data[0]?.[m.key] !== undefined);

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {isTh ? "แยกตามเดือน" : "Monthly Breakdown"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{isTh ? "เดือน" : "Month"}</TableHead>
                {visibleMetrics.map((m) => (
                  <TableHead key={m.key} className="text-xs text-right">
                    {m.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="text-sm font-medium">{row.label}</TableCell>
                  {visibleMetrics.map((m) => (
                    <TableCell key={m.key} className="text-sm text-right tabular-nums">
                      {(row[m.key] as number)?.toLocaleString() ?? "–"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="font-semibold bg-muted/30">
                <TableCell className="text-sm">{isTh ? "รวม" : "Total"}</TableCell>
                {visibleMetrics.map((m) => {
                  const total = data.reduce((s, r) => s + ((r[m.key] as number) || 0), 0);
                  return (
                    <TableCell key={m.key} className="text-sm text-right tabular-nums">
                      {total.toLocaleString()}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

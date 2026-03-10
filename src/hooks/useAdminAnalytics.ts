import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import type { DateRange, DateRangeWithCompare } from "@/components/admin/analytics/AdminDateRangeFilter";

// ─── Metric definition ────────────────────────────────────────────
export interface MetricDef {
  key: string;
  label: string;
  /** Table to query */
  table: string;
  /** Column to use for date filtering */
  dateColumn: string;
  /** Additional equality filters */
  filters?: Record<string, string | string[]>;
  /** If 'in', use .in() for status arrays */
  filterMode?: "eq" | "in";
}

export interface MetricResult {
  key: string;
  current: number;
  previous: number | null;
}

export interface MonthlyBreakdown {
  month: string; // 'YYYY-MM'
  label: string; // 'Jan 2026'
  [key: string]: number | string;
}

// ─── Standard metric definitions ──────────────────────────────────
export const ADMIN_METRICS: MetricDef[] = [
  { key: "appointments_created", label: "Appointments Created", table: "appointments", dateColumn: "created_at" },
  { key: "appointments_completed", label: "Completed Appointments", table: "appointments", dateColumn: "completed_at", filters: { status: "completed,checked_out" }, filterMode: "in" },
  { key: "appointments_noshow", label: "No Show", table: "appointments", dateColumn: "updated_at", filters: { status: "no_show" } },
  { key: "appointments_cancelled", label: "Cancelled", table: "appointments", dateColumn: "cancelled_at", filters: { status: "cancelled" } },
  { key: "selftest_requested", label: "Self-Test Requested", table: "hiv_selftest_requests", dateColumn: "created_at" },
  { key: "selftest_delivered", label: "Self-Test Delivered", table: "hiv_selftest_requests", dateColumn: "updated_at", filters: { status: "delivered,received,received_confirmed" }, filterMode: "in" },
  { key: "selftest_result_submitted", label: "Results Submitted", table: "hiv_selftest_requests", dateColumn: "updated_at", filters: { status: "result_submitted" } },
  { key: "prevention_match", label: "Prevention Match", table: "prevention_match_results", dateColumn: "created_at" },
  { key: "support_chats", label: "Support Chats", table: "direct_chat_threads", dateColumn: "created_at" },
  { key: "pageviews", label: "Pageviews", table: "analytics_events", dateColumn: "created_at", filters: { event_type: "pageview" } },
];

// ─── Count query helper ───────────────────────────────────────────
async function countInRange(
  table: string,
  dateColumn: string,
  from: Date,
  to: Date,
  filters?: Record<string, string | string[]>,
  filterMode?: "eq" | "in"
): Promise<number> {
  let q = (supabase as any)
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(dateColumn, startOfDay(from).toISOString())
    .lte(dateColumn, endOfDay(to).toISOString());

  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      if (filterMode === "in" || (typeof val === "string" && val.includes(","))) {
        const vals = typeof val === "string" ? val.split(",") : val;
        q = q.in(col, vals);
      } else {
        q = q.eq(col, val);
      }
    }
  }

  const { count, error } = await q;
  if (error) console.error(`Analytics count error [${table}]:`, error.message);
  return count || 0;
}

// ─── Main hook ────────────────────────────────────────────────────
export function useAdminAnalytics(
  dateRange: DateRangeWithCompare,
  metrics: MetricDef[] = ADMIN_METRICS
) {
  const [results, setResults] = useState<MetricResult[]>([]);
  const [monthly, setMonthly] = useState<MonthlyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { current, previous, compareEnabled } = dateRange;

      // Fetch all current counts in parallel
      const currentCounts = await Promise.all(
        metrics.map((m) =>
          countInRange(m.table, m.dateColumn, current.from, current.to, m.filters, m.filterMode)
        )
      );

      // Fetch previous counts if compare is enabled
      let prevCounts: (number | null)[] = metrics.map(() => null);
      if (compareEnabled && previous) {
        prevCounts = await Promise.all(
          metrics.map((m) =>
            countInRange(m.table, m.dateColumn, previous.from, previous.to, m.filters, m.filterMode)
          )
        );
      }

      const metricResults: MetricResult[] = metrics.map((m, i) => ({
        key: m.key,
        current: currentCounts[i],
        previous: prevCounts[i],
      }));
      setResults(metricResults);

      // Monthly breakdown: generate months in current range
      const months = eachMonthOfInterval({ start: current.from, end: current.to });
      if (months.length > 1) {
        const monthlyData: MonthlyBreakdown[] = [];
        for (const monthStart of months) {
          const mEnd = endOfMonth(monthStart) > current.to ? current.to : endOfMonth(monthStart);
          const mStart = monthStart < current.from ? current.from : monthStart;
          const row: MonthlyBreakdown = {
            month: format(monthStart, "yyyy-MM"),
            label: format(monthStart, "MMM yyyy"),
          };
          // Only fetch key metrics for monthly to limit queries
          const keyMetrics = metrics.slice(0, 6);
          const counts = await Promise.all(
            keyMetrics.map((m) =>
              countInRange(m.table, m.dateColumn, mStart, mEnd, m.filters, m.filterMode)
            )
          );
          keyMetrics.forEach((m, i) => {
            row[m.key] = counts[i];
          });
          monthlyData.push(row);
        }
        setMonthly(monthlyData);
      } else {
        setMonthly([]);
      }
    } catch (err) {
      console.error("Admin analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, metrics]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /** Get result for a specific metric key */
  const getMetric = (key: string): MetricResult | undefined =>
    results.find((r) => r.key === key);

  return { results, monthly, loading, getMetric, refetch: fetchAll };
}

import { useLanguage } from "@/lib/i18n";
import { AdminDateRangeFilter, useAdminDateRange } from "@/components/admin/analytics/AdminDateRangeFilter";
import { AdminStatCard } from "@/components/admin/analytics/AdminStatCard";
import { MonthlyBreakdownTable } from "@/components/admin/analytics/MonthlyBreakdownTable";
import { useAdminAnalytics, ADMIN_METRICS } from "@/hooks/useAdminAnalytics";
import {
  CalendarDays, Package, CheckCircle, XCircle, Clock,
  Heart, MessageSquare, Eye, BarChart3, Users, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const METRIC_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  appointments_created: { icon: CalendarDays, color: "text-sky-600" },
  appointments_completed: { icon: CheckCircle, color: "text-emerald-600" },
  appointments_noshow: { icon: XCircle, color: "text-red-500" },
  appointments_cancelled: { icon: Clock, color: "text-amber-600" },
  selftest_requested: { icon: Package, color: "text-purple-600" },
  selftest_delivered: { icon: Package, color: "text-blue-600" },
  selftest_result_submitted: { icon: Activity, color: "text-emerald-600" },
  prevention_match: { icon: Heart, color: "text-pink-600" },
  support_chats: { icon: MessageSquare, color: "text-indigo-600" },
  pageviews: { icon: Eye, color: "text-sky-600" },
};

const METRIC_LABELS_TH: Record<string, string> = {
  appointments_created: "จองทั้งหมด",
  appointments_completed: "จองสำเร็จ",
  appointments_noshow: "ไม่มา",
  appointments_cancelled: "ยกเลิก",
  selftest_requested: "ขอชุดตรวจ",
  selftest_delivered: "จัดส่งแล้ว",
  selftest_result_submitted: "ส่งผลตรวจ",
  prevention_match: "Prevention Match",
  support_chats: "แชทสนับสนุน",
  pageviews: "เข้าชมหน้า",
};

export default function AdminAnalyticsOverview() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [dateRange, setDateRange] = useAdminDateRange("this_month");
  const { results, monthly, loading, getMetric } = useAdminAnalytics(dateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            {isTh ? "ภาพรวมตามช่วงเวลา" : "Period Analytics Overview"}
          </h2>
        </div>
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Booking & Appointment Metrics ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          {isTh ? "นัดหมาย" : "Appointments"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["appointments_created", "appointments_completed", "appointments_noshow", "appointments_cancelled"].map(
            (key) => {
              const m = getMetric(key);
              const meta = METRIC_ICONS[key] || { icon: Activity, color: "text-primary" };
              return (
                <AdminStatCard
                  key={key}
                  label={isTh ? METRIC_LABELS_TH[key] || key : ADMIN_METRICS.find((x) => x.key === key)?.label || key}
                  value={m?.current ?? 0}
                  previousValue={m?.previous}
                  icon={meta.icon}
                  iconColor={meta.color}
                  loading={loading}
                />
              );
            }
          )}
        </div>
      </div>

      {/* ── Self-Test Metrics ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          {isTh ? "ชุดตรวจ HIV" : "HIV Self-Test"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["selftest_requested", "selftest_delivered", "selftest_result_submitted"].map((key) => {
            const m = getMetric(key);
            const meta = METRIC_ICONS[key] || { icon: Activity, color: "text-primary" };
            return (
              <AdminStatCard
                key={key}
                label={isTh ? METRIC_LABELS_TH[key] || key : ADMIN_METRICS.find((x) => x.key === key)?.label || key}
                value={m?.current ?? 0}
                previousValue={m?.previous}
                icon={meta.icon}
                iconColor={meta.color}
                loading={loading}
              />
            );
          })}
        </div>
      </div>

      {/* ── Engagement Metrics ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          {isTh ? "การมีส่วนร่วม" : "Engagement"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["prevention_match", "support_chats", "pageviews"].map((key) => {
            const m = getMetric(key);
            const meta = METRIC_ICONS[key] || { icon: Activity, color: "text-primary" };
            return (
              <AdminStatCard
                key={key}
                label={isTh ? METRIC_LABELS_TH[key] || key : ADMIN_METRICS.find((x) => x.key === key)?.label || key}
                value={m?.current ?? 0}
                previousValue={m?.previous}
                icon={meta.icon}
                iconColor={meta.color}
                loading={loading}
              />
            );
          })}
        </div>
      </div>

      {/* ── Monthly Breakdown Chart ── */}
      {monthly.length > 1 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isTh ? "แนวโน้มรายเดือน" : "Monthly Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="appointments_created"
                    name={isTh ? "จอง" : "Bookings"}
                    fill="hsl(var(--primary))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="appointments_completed"
                    name={isTh ? "สำเร็จ" : "Completed"}
                    fill="hsl(142, 76%, 36%)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="selftest_requested"
                    name={isTh ? "ขอชุดตรวจ" : "Self-Test"}
                    fill="hsl(280, 65%, 60%)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Monthly Breakdown Table ── */}
      <MonthlyBreakdownTable
        data={monthly}
        metrics={ADMIN_METRICS.slice(0, 6)}
        loading={loading}
      />
    </div>
  );
}

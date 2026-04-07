import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatCard } from "@/components/admin/analytics/AdminStatCard";
import { Calendar, TestTube, MessageCircle, TrendingUp, AlertTriangle, CheckCircle, Info, MousePointerClick } from "lucide-react";
import { FunnelCounts, computeRates, generateInsights, InsightSeverity } from "@/lib/conversionInsights";
import { format, subDays } from "date-fns";

const EVENT_TYPES = [
  'homepage_cta_booking_click',
  'homepage_cta_selftest_click',
  'homepage_cta_support_click',
  'sticky_cta_click',
  'page_view_booking',
  'page_view_selftest',
  'booking_started',
  'booking_submitted',
  'selftest_started',
  'selftest_submitted',
] as const;

type EventRow = { event_type: string; count: number };

const SEVERITY_CONFIG: Record<InsightSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
};

export default function AdminConversionInsightsContent() {
  const [days, setDays] = useState(30);
  const since = useMemo(() => format(subDays(new Date(), days), 'yyyy-MM-dd'), [days]);

  const { data: rawCounts, isLoading } = useQuery({
    queryKey: ['conversion-funnel', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type')
        .in('event_type', EVENT_TYPES as unknown as string[])
        .gte('created_at', since);

      if (error) throw error;

      const counts: Record<string, number> = {};
      EVENT_TYPES.forEach(e => counts[e] = 0);
      (data || []).forEach((row: { event_type: string }) => {
        counts[row.event_type] = (counts[row.event_type] || 0) + 1;
      });
      return counts;
    },
  });

  const funnel: FunnelCounts = useMemo(() => {
    if (!rawCounts) return {
      bookingClicks: 0, selftestClicks: 0, supportClicks: 0, stickyClicks: 0,
      pageViewBooking: 0, pageViewSelftest: 0,
      bookingStarted: 0, bookingSubmitted: 0,
      selftestStarted: 0, selftestSubmitted: 0,
    };
    return {
      bookingClicks: rawCounts['homepage_cta_booking_click'] || 0,
      selftestClicks: rawCounts['homepage_cta_selftest_click'] || 0,
      supportClicks: rawCounts['homepage_cta_support_click'] || 0,
      stickyClicks: rawCounts['sticky_cta_click'] || 0,
      pageViewBooking: rawCounts['page_view_booking'] || 0,
      pageViewSelftest: rawCounts['page_view_selftest'] || 0,
      bookingStarted: rawCounts['booking_started'] || 0,
      bookingSubmitted: rawCounts['booking_submitted'] || 0,
      selftestStarted: rawCounts['selftest_started'] || 0,
      selftestSubmitted: rawCounts['selftest_submitted'] || 0,
    };
  }, [rawCounts]);

  const rates = useMemo(() => computeRates(funnel), [funnel]);
  const insights = useMemo(() => generateInsights(funnel, rates), [funnel, rates]);

  const totalClicks = funnel.bookingClicks + funnel.selftestClicks + funnel.supportClicks + funnel.stickyClicks;
  const isEmpty = totalClicks === 0 && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header + date filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Conversion Insights</h2>
          <p className="text-sm text-muted-foreground">วิเคราะห์ funnel จาก CTA → จอง/ส่งแบบฟอร์ม</p>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <Card className="border border-border/50">
          <CardContent className="p-8 text-center">
            <MousePointerClick className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">ยังไม่มีข้อมูล funnel — ข้อมูลจะเริ่มปรากฏเมื่อมีผู้ใช้คลิก CTA บนหน้าแรก</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminStatCard label="CTA Clicks ทั้งหมด" value={totalClicks} icon={MousePointerClick} loading={isLoading} />
            <AdminStatCard label="Booking Conversion" value={rates.bookingOverall} icon={Calendar} iconColor="text-blue-500" loading={isLoading} isRate />
            <AdminStatCard label="Self-test Conversion" value={rates.selftestOverall} icon={TestTube} iconColor="text-emerald-500" loading={isLoading} isRate />
            <AdminStatCard label="Support Clicks" value={funnel.supportClicks} icon={MessageCircle} iconColor="text-purple-500" loading={isLoading} />
          </div>

          {/* Funnel visualization */}
          <div className="grid md:grid-cols-2 gap-4">
            <FunnelCard
              title="Booking Funnel"
              steps={[
                { label: 'คลิก CTA', value: funnel.bookingClicks },
                { label: 'ดูหน้า Booking', value: funnel.pageViewBooking },
                { label: 'เริ่มจอง', value: funnel.bookingStarted },
                { label: 'จองสำเร็จ', value: funnel.bookingSubmitted },
              ]}
            />
            <FunnelCard
              title="Self-test Funnel"
              steps={[
                { label: 'คลิก CTA', value: funnel.selftestClicks },
                { label: 'ดูหน้า Self-test', value: funnel.pageViewSelftest },
                { label: 'เริ่มกรอกฟอร์ม', value: funnel.selftestStarted },
                { label: 'ส่งสำเร็จ', value: funnel.selftestSubmitted },
              ]}
            />
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Auto-generated Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.map(insight => {
                  const cfg = SEVERITY_CONFIG[insight.severity];
                  const Icon = cfg.icon;
                  return (
                    <div key={insight.id} className={`p-3 rounded-lg border ${cfg.bg}`}>
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${cfg.color}`}>{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                          <p className="text-xs font-medium mt-1">💡 {insight.action}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function FunnelCard({ title, steps }: { title: string; steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map(s => s.value), 1);

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => {
          const pct = Math.round((step.value / max) * 100);
          const dropPct = i > 0 && steps[i - 1].value > 0
            ? Math.round(((steps[i - 1].value - step.value) / steps[i - 1].value) * 100)
            : null;

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{step.value}</span>
                  {dropPct !== null && dropPct > 0 && (
                    <span className={`text-[10px] ${dropPct > 50 ? 'text-red-500' : 'text-amber-500'}`}>
                      -{dropPct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

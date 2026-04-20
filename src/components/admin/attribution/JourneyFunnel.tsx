import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Download, ArrowDown } from 'lucide-react';

export function JourneyFunnel() {
  const { language } = useLanguage();

  // Funnel data — analytics_events for top of funnel, appointments table for check-in/checkout
  // (because check_in/check_out aren't tracked as analytics_events; they live as timestamps on appointments).
  const { data: funnelData } = useQuery({
    queryKey: ['journey-funnel-v3'],
    queryFn: async () => {
      const eventGroups: { key: string; events: string[] }[] = [
        { key: 'pageview', events: ['pageview'] },
        { key: 'service_view', events: ['page_view_booking', 'page_view_selftest'] },
        { key: 'started', events: ['booking_started', 'selftest_started'] },
        { key: 'submitted', events: ['booking_submitted', 'selftest_submitted', 'booking_created'] },
        { key: 'review', events: ['review_submitted'] },
      ];

      const counts: Record<string, number> = {};
      for (const g of eventGroups) {
        const { count } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .in('event_type', g.events);
        counts[g.key] = count || 0;
      }

      const { count: uniqueVisitors } = await supabase
        .from('visitor_attribution')
        .select('*', { count: 'exact', head: true });

      // Pull check-in / check-out / completion counts directly from appointments table
      const [arrivedRes, completedRes, checkedOutRes] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).not('arrived_at', 'is', null),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).not('checked_out_at', 'is', null),
      ]);
      const arrivedCount = arrivedRes.count || 0;
      const completedCount = completedRes.count || 0;
      const checkedOutCount = checkedOutRes.count || 0;
      // "Success" = either explicitly completed or checked_out (per Admin Booking standard)
      const successCount = Math.max(completedCount, checkedOutCount);

      return [
        { step: language === 'th' ? 'ผู้เข้าชมไม่ซ้ำ' : 'Unique Visitors', count: uniqueVisitors || 0, fill: 'hsl(var(--primary))' },
        { step: language === 'th' ? 'เข้าชมหน้า' : 'Page Views', count: counts.pageview || 0, fill: 'hsl(var(--primary) / 0.9)' },
        { step: language === 'th' ? 'ดูบริการ' : 'Viewed Service', count: counts.service_view || 0, fill: 'hsl(var(--primary) / 0.75)' },
        { step: language === 'th' ? 'เริ่มทำ' : 'Started', count: counts.started || 0, fill: 'hsl(var(--primary) / 0.6)' },
        { step: language === 'th' ? 'ส่งสำเร็จ' : 'Submitted', count: counts.submitted || 0, fill: 'hsl(var(--primary) / 0.45)' },
        { step: language === 'th' ? 'Check-in (มาถึง)' : 'Check-in (Arrived)', count: arrivedCount, fill: 'hsl(var(--primary) / 0.35)' },
        { step: language === 'th' ? 'สำเร็จ/Check-out' : 'Success/Check-out', count: successCount, fill: 'hsl(var(--primary) / 0.25)' },
        { step: language === 'th' ? 'รีวิว' : 'Review', count: counts.review || 0, fill: 'hsl(var(--primary) / 0.18)' },
      ];
    },
  });

  // Top landing pages
  const { data: topPages } = useQuery({
    queryKey: ['top-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_attribution')
        .select('first_touch_landing_page')
        .not('first_touch_landing_page', 'is', null);
      if (error) throw error;

      const grouped: Record<string, number> = {};
      (data as any[])?.forEach((r: any) => {
        const p = r.first_touch_landing_page || '/';
        grouped[p] = (grouped[p] || 0) + 1;
      });

      return Object.entries(grouped)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Service performance: View → Started → Submitted, joined with booking_services for names.
  // Uses HEAD count queries for accurate aggregate totals (no row limit), then a
  // smaller sample for per-service breakdown.
  const { data: serviceViews } = useQuery({
    queryKey: ['service-views-v4'],
    queryFn: async () => {
      // 1. Aggregate counts via HEAD queries — accurate, no row limit
      const countOf = async (types: string[]) => {
        const { count } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .in('event_type', types);
        return count || 0;
      };

      const [viewsCount, startedCount, bookedCount, completedCount] = await Promise.all([
        countOf(['page_view_booking', 'service_card_view', 'service_detail_view']),
        countOf(['booking_started']),
        countOf(['booking_submitted', 'booking_created']),
        countOf(['completed']),
      ]);

      const aggregate = {
        views: viewsCount,
        started: startedCount,
        booked: bookedCount,
        completed: completedCount,
      };

      // 2. Per-service breakdown — only events that have service_id at column level
      const eventTypes = [
        'page_view_booking',
        'service_card_view',
        'service_detail_view',
        'booking_started',
        'booking_submitted',
        'booking_created',
        'completed',
      ];

      const { data: events } = await supabase
        .from('analytics_events')
        .select('service_id, event_type')
        .in('event_type', eventTypes)
        .not('service_id', 'is', null)
        .limit(5000);

      const grouped: Record<string, { views: number; started: number; booked: number; completed: number }> = {};

      (events as any[])?.forEach((r: any) => {
        const sid = r.service_id;
        if (!sid) return;
        if (!grouped[sid]) grouped[sid] = { views: 0, started: 0, booked: 0, completed: 0 };
        const b = grouped[sid];
        const t = r.event_type;
        if (t === 'page_view_booking' || t === 'service_card_view' || t === 'service_detail_view') b.views++;
        else if (t === 'booking_started') b.started++;
        else if (t === 'booking_submitted' || t === 'booking_created') b.booked++;
        else if (t === 'completed') b.completed++;
      });

      const ids = Object.keys(grouped);

      let perService: { service: string; views: number; started: number; booked: number; completed: number }[] = [];
      if (ids.length > 0) {
        const { data: svcRows } = await supabase
          .from('booking_services')
          .select('id, name_th, name_en, slug')
          .in('id', ids);
        const nameMap = new Map(
          (svcRows as any[] | null)?.map((s) => [s.id, language === 'th' ? s.name_th : s.name_en]) || []
        );
        perService = Object.entries(grouped)
          .map(([id, stats]) => ({ service: nameMap.get(id) || id.slice(0, 8), ...stats }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);
      }

      const aggregateRow = {
        service: language === 'th' ? '🌐 ทุกบริการรวม (ย้อนหลัง)' : '🌐 All services (historical)',
        ...aggregate,
      };

      return [aggregateRow, ...perService];
    },
  });

  const exportCSV = () => {
    if (!funnelData) return;
    const bom = '\uFEFF';
    const header = 'Step,Count\n';
    const rows = funnelData.map(r => `${r.step},${r.count}`).join('\n');
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journey_funnel.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Conversion funnel */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {language === 'th' ? '🔄 Conversion Funnel' : '🔄 Conversion Funnel'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {funnelData && funnelData.some(f => f.count > 0) ? (
            <div className="space-y-1">
              {funnelData.map((step, i) => {
                const maxCount = Math.max(...funnelData.map(f => f.count), 1);
                const widthPct = Math.max((step.count / maxCount) * 100, 8);
                const dropoff = i > 0 && funnelData[i - 1].count > 0
                  ? Math.round(((funnelData[i - 1].count - step.count) / funnelData[i - 1].count) * 100)
                  : null;

                return (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-20 text-right shrink-0">{step.step}</span>
                      <div className="flex-1 relative">
                        <div
                          className="h-8 rounded flex items-center px-2 transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: step.fill,
                            minWidth: '40px',
                          }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">{step.count}</span>
                        </div>
                      </div>
                      {dropoff !== null && dropoff > 0 && (
                        <span className="text-xs text-destructive shrink-0 flex items-center gap-0.5">
                          <ArrowDown className="h-3 w-3" />{dropoff}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ยังไม่มีข้อมูล Journey' : 'No journey data yet'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top landing pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'th' ? '📄 หน้าเข้าชมยอดนิยม' : '📄 Top Landing Pages'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPages && topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">{p.page}</code>
                    <span className="font-medium">{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Service performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'th' ? '🩺 บริการ: ดู → เริ่ม → จอง → สำเร็จ' : '🩺 Service: View → Start → Book → Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceViews && serviceViews.length > 0 ? (
              <div className="space-y-2">
                {serviceViews.map((s, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium truncate">{s.service}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span title="Viewed">👁 {s.views}</span>
                      <span title="Started">▶ {s.started}</span>
                      <span title="Booked">📅 {s.booked}</span>
                      <span title="Completed">✅ {s.completed}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 space-y-1">
                <p>{language === 'th' ? 'ยังไม่มีข้อมูลรายบริการ' : 'No per-service data yet'}</p>
                <p className="text-[11px]">
                  {language === 'th'
                    ? 'การจองตั้งแต่ตอนนี้จะแยกตามบริการอัตโนมัติ'
                    : 'Bookings from now on will be tagged by service automatically'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

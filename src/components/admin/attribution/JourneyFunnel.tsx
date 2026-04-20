import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Download, ArrowDown } from 'lucide-react';

export function JourneyFunnel() {
  const { language } = useLanguage();

  // Funnel data from analytics_events — using events that actually exist in the system
  const { data: funnelData } = useQuery({
    queryKey: ['journey-funnel-v2'],
    queryFn: async () => {
      const eventGroups: { key: string; events: string[] }[] = [
        { key: 'pageview', events: ['pageview'] },
        { key: 'service_view', events: ['page_view_booking', 'page_view_selftest'] },
        { key: 'started', events: ['booking_started', 'selftest_started'] },
        { key: 'submitted', events: ['booking_submitted', 'selftest_submitted', 'booking_created'] },
        { key: 'confirmed', events: ['booking_confirmed', 'check_in', 'completed'] },
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

      return [
        { step: language === 'th' ? 'ผู้เข้าชมไม่ซ้ำ' : 'Unique Visitors', count: uniqueVisitors || 0, fill: 'hsl(var(--primary))' },
        { step: language === 'th' ? 'เข้าชมหน้า' : 'Page Views', count: counts.pageview || 0, fill: 'hsl(var(--primary) / 0.85)' },
        { step: language === 'th' ? 'ดูบริการ' : 'Viewed Service', count: counts.service_view || 0, fill: 'hsl(var(--primary) / 0.7)' },
        { step: language === 'th' ? 'เริ่มทำ' : 'Started', count: counts.started || 0, fill: 'hsl(var(--primary) / 0.55)' },
        { step: language === 'th' ? 'ส่งสำเร็จ' : 'Submitted', count: counts.submitted || 0, fill: 'hsl(var(--primary) / 0.4)' },
        { step: language === 'th' ? 'ยืนยัน/Check-in' : 'Confirmed', count: counts.confirmed || 0, fill: 'hsl(var(--primary) / 0.3)' },
        { step: language === 'th' ? 'รีวิว' : 'Review', count: counts.review || 0, fill: 'hsl(var(--primary) / 0.2)' },
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

  // Service performance: View → Started → Submitted, joined with booking_services for names
  const { data: serviceViews } = useQuery({
    queryKey: ['service-views-v2'],
    queryFn: async () => {
      // Pull events that carry service_id
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('service_id, event_type')
        .not('service_id', 'is', null)
        .in('event_type', [
          'page_view_booking',
          'service_card_view',
          'service_detail_view',
          'booking_started',
          'booking_submitted',
          'booking_created',
          'completed',
        ]);
      if (error) throw error;

      const grouped: Record<string, { views: number; started: number; booked: number; completed: number }> = {};
      (events as any[])?.forEach((r: any) => {
        const s = r.service_id;
        if (!grouped[s]) grouped[s] = { views: 0, started: 0, booked: 0, completed: 0 };
        if (r.event_type === 'page_view_booking' || r.event_type.includes('view')) grouped[s].views++;
        if (r.event_type === 'booking_started') grouped[s].started++;
        if (r.event_type === 'booking_submitted' || r.event_type === 'booking_created') grouped[s].booked++;
        if (r.event_type === 'completed') grouped[s].completed++;
      });

      const ids = Object.keys(grouped);
      if (ids.length === 0) return [];

      // Resolve service names
      const { data: svcRows } = await supabase
        .from('booking_services')
        .select('id, name_th, name_en, slug')
        .in('id', ids);
      const nameMap = new Map((svcRows as any[] | null)?.map((s) => [s.id, language === 'th' ? s.name_th : s.name_en]) || []);

      return Object.entries(grouped)
        .map(([id, stats]) => ({ service: nameMap.get(id) || id.slice(0, 8), ...stats }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
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
              {language === 'th' ? '🩺 บริการ: ดู → จอง → สำเร็จ' : '🩺 Service: View → Book → Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceViews && serviceViews.length > 0 ? (
              <div className="space-y-2">
                {serviceViews.map((s, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium truncate">{s.service}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>👁 {s.views}</span>
                      <span>📅 {s.booked}</span>
                      <span>✅ {s.completed}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No service data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { Download, ArrowDown, RefreshCw, TrendingUp, Users, MousePointer, CalendarCheck, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VirtualAdminAnalytics } from '@/lib/virtualAdminAnalytics';

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

interface BoothStat {
  booth_id: string;
  booth_label: string;
  clicks: number;
  bookings: number;
  conversionRate: number;
}

interface VirtualFunnelDashboardProps {
  analyticsData: VirtualAdminAnalytics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function VirtualFunnelDashboard({ analyticsData, loading, error, onRefresh }: VirtualFunnelDashboardProps) {
  const { language } = useLanguage();
  const th = language === 'th';
  const [episodeFilter, setEpisodeFilter] = useState<string>('all');

  const data = useMemo(() => {
    if (!analyticsData || error) return null;
    const filtered = analyticsData.episodes.filter((ep) => episodeFilter === 'all' || ep.slug === episodeFilter);
    const starts = filtered.reduce((sum, ep) => sum + ep.starts, 0);
    const views = filtered.reduce((sum, ep) => sum + ep.views, 0);
    const completions = filtered.reduce((sum, ep) => sum + ep.completes, 0);
    const ctaClicks = filtered.reduce((sum, ep) => sum + ep.cta_clicks, 0);
    const boothStats: BoothStat[] = analyticsData.ctaClicks.map((cta) => ({
      booth_id: cta.name,
      booth_label: cta.name,
      clicks: cta.value,
      bookings: 0,
      conversionRate: 0,
    }));
    return {
      funnel: [
        { label: th ? '🎮 เริ่มเล่น' : '🎮 Story Started', count: starts, color: 'hsl(var(--primary))' },
        { label: th ? '📖 ดูซีน' : '📖 Scenes Viewed', count: views, color: 'hsl(var(--primary) / 0.85)' },
        { label: th ? '✅ เล่นจบ' : '✅ Completed', count: completions, color: 'hsl(var(--primary) / 0.7)' },
        { label: th ? '🔗 กด CTA' : '🔗 CTA Clicked', count: ctaClicks, color: 'hsl(var(--primary) / 0.55)' },
        { label: th ? '📅 สร้างการจอง' : '📅 Booking Created', count: 0, color: 'hsl(var(--primary) / 0.4)' },
        { label: th ? '✔️ ยืนยันการจอง' : '✔️ Booking Confirmed', count: 0, color: 'hsl(var(--primary) / 0.3)' },
      ] as FunnelStep[],
      boothStats,
      episodeBreakdown: filtered.map((ep) => ({ name: ep.slug, starts: ep.starts, completions: ep.completes, cta: ep.cta_clicks })),
      referralRate: 0,
      ctaRate: completions > 0 ? Math.round((ctaClicks / completions) * 100) : 0,
      totalStarts: starts,
      totalCompletions: completions,
      totalCTA: ctaClicks,
      totalBookings: 0,
      totalConfirmed: 0,
    };
  }, [analyticsData, episodeFilter, error, th]);

  const exportCSV = () => {
    if (!data) return;
    const bom = '\uFEFF';
    const lines = [
      'Step,Count',
      ...data.funnel.map(f => `${f.label},${f.count}`),
      '',
      'CTA/Booth,Clicks,Bookings,Conversion %',
      ...data.boothStats.map(b => `${b.booth_label},${b.clicks},${b.bookings},${b.conversionRate}%`),
      '',
      'Episode,Starts,Completions,CTA Clicks',
      ...data.episodeBreakdown.map(e => `${e.name},${e.starts},${e.completions},${e.cta}`),
    ];
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virtual_funnel_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {th ? 'Virtual Stories → Booking Funnel' : 'Virtual Stories → Booking Funnel'}
        </h3>
        <div className="flex gap-2">
          <Select value={episodeFilter} onValueChange={setEpisodeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{th ? 'ทั้งหมด' : 'All'}</SelectItem>
              <SelectItem value="ep1">Episode 1</SelectItem>
              <SelectItem value="ep2">Episode 2</SelectItem>
              <SelectItem value="clinic">Virtual Clinic</SelectItem>
              <SelectItem value="guide">AI Guide</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: th ? 'เริ่มเล่น' : 'Starts', value: data.totalStarts, icon: Users },
            { label: th ? 'เล่นจบ' : 'Completed', value: data.totalCompletions, icon: TrendingUp },
            { label: 'CTA Clicks', value: data.totalCTA, icon: MousePointer },
            { label: th ? 'สร้างจอง' : 'Bookings', value: data.totalBookings, icon: CalendarCheck },
            { label: th ? 'Referral Rate' : 'Referral %', value: `${data.referralRate}%`, icon: TrendingUp },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <kpi.icon className="h-4 w-4 mx-auto mb-1.5 text-primary" />
                <div className="text-xl font-bold">{isLoading ? '...' : kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {th ? '🔄 Conversion Funnel: Virtual → Booking' : '🔄 Conversion Funnel: Virtual → Booking'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.funnel.some(f => f.count > 0) ? (
            <div className="space-y-1">
              {data.funnel.map((step, i) => {
                const maxCount = Math.max(...data.funnel.map(f => f.count), 1);
                const widthPct = Math.max((step.count / maxCount) * 100, 8);
                const dropoff = i > 0 && data.funnel[i - 1].count > 0
                  ? Math.round(((data.funnel[i - 1].count - step.count) / data.funnel[i - 1].count) * 100)
                  : null;

                return (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-32 text-right shrink-0">{step.label}</span>
                      <div className="flex-1 relative">
                        <div
                          className="h-8 rounded flex items-center px-2 transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: step.color,
                            minWidth: '40px',
                          }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">{step.count}</span>
                        </div>
                      </div>
                      {dropoff !== null && dropoff > 0 && (
                        <span className="text-xs text-destructive shrink-0 flex items-center gap-0.5">
                          <ArrowDown className="h-3 w-3" />-{dropoff}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {th ? 'ยังไม่มีข้อมูล' : 'No data yet'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA/Booth Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {th ? '🏥 CTA / Booth → Booking Conversion' : '🏥 CTA / Booth → Booking Conversion'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.boothStats.length > 0 ? (
              <div className="space-y-2">
                {data.boothStats.slice(0, 10).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]">{b.booth_label}</code>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        <MousePointer className="h-3 w-3 inline mr-0.5" />{b.clicks}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <CalendarCheck className="h-3 w-3 inline mr-0.5" />{b.bookings}
                      </span>
                      <Badge variant={b.conversionRate > 10 ? 'default' : 'secondary'} className="text-[10px]">
                        {b.conversionRate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Episode Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {th ? '📊 แยกตามตอน' : '📊 By Episode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.episodeBreakdown.length > 0 ? (
              <div className="space-y-3">
                {data.episodeBreakdown.map((ep, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium truncate">{ep.name}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                      <span>▶ {th ? 'เริ่ม' : 'Start'}: {ep.starts}</span>
                      <span>✅ {th ? 'จบ' : 'Done'}: {ep.completions}</span>
                      <span>🔗 CTA: {ep.cta}</span>
                      {ep.starts > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round((ep.completions / ep.starts) * 100)}% {th ? 'จบ' : 'done'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

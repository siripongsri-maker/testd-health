import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { Download, ArrowDown, RefreshCw, TrendingUp, Users, MousePointer, CalendarCheck, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export function VirtualFunnelDashboard() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [episodeFilter, setEpisodeFilter] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['virtual-funnel', episodeFilter],
    queryFn: async () => {
      // Fetch all virtual-related analytics events
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, metadata, created_at, anonymous_id, session_id, booking_id')
        .or('event_type.like.virtual_%,event_type.like.virtual_story_%,event_type.eq.booking_created,event_type.eq.booking_confirmed')
        .order('created_at', { ascending: false })
        .limit(10000);

      const allEvents = events || [];
      const getMeta = (e: any, key: string) => {
        try {
          const m = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
          return m?.[key];
        } catch { return undefined; }
      };

      // Filter by episode if needed
      const virtualEvents = allEvents.filter(e => {
        if (!e.event_type.startsWith('virtual_')) return false;
        if (episodeFilter === 'all') return true;
        const ep = getMeta(e, 'episode_number');
        const storyId = getMeta(e, 'story_id') || '';
        if (episodeFilter === 'ep1') return ep === 1 || storyId.includes('ep1');
        if (episodeFilter === 'ep2') return ep === 2 || storyId.includes('ep2');
        if (episodeFilter === 'clinic') return e.event_type.includes('clinic') || e.event_type.includes('booth');
        if (episodeFilter === 'guide') return e.event_type.includes('guide');
        return true;
      });

      // Funnel steps
      const hubViews = virtualEvents.filter(e => e.event_type === 'virtual_hub_topic_click').length;
      const storyStarts = virtualEvents.filter(e => e.event_type === 'virtual_story_started').length;
      const sceneViews = virtualEvents.filter(e => e.event_type === 'virtual_story_scene_viewed').length;
      const completions = virtualEvents.filter(e => e.event_type === 'virtual_story_completed').length;
      const ctaClicks = virtualEvents.filter(e =>
        e.event_type === 'virtual_story_cta_clicked' ||
        e.event_type === 'virtual_cta_click' ||
        e.event_type === 'virtual_clinic_booth_click'
      ).length;

      // Get sessions that had virtual events, then check if they led to bookings
      const virtualSessions = new Set<string>();
      const virtualAnonymousIds = new Set<string>();
      virtualEvents.forEach(e => {
        if (e.session_id) virtualSessions.add(e.session_id);
        if (e.anonymous_id) virtualAnonymousIds.add(e.anonymous_id);
      });

      // Count bookings from virtual sessions
      const bookingEvents = allEvents.filter(e => e.event_type === 'booking_created');
      const bookingsFromVirtual = bookingEvents.filter(e =>
        (e.session_id && virtualSessions.has(e.session_id)) ||
        (e.anonymous_id && virtualAnonymousIds.has(e.anonymous_id))
      ).length;

      const confirmedEvents = allEvents.filter(e => e.event_type === 'booking_confirmed');
      const confirmedFromVirtual = confirmedEvents.filter(e =>
        (e.session_id && virtualSessions.has(e.session_id)) ||
        (e.anonymous_id && virtualAnonymousIds.has(e.anonymous_id))
      ).length;

      // Booth/CTA breakdown
      const boothClicks: Record<string, { label: string; clicks: number; sessions: Set<string> }> = {};
      virtualEvents.filter(e =>
        e.event_type === 'virtual_story_cta_clicked' ||
        e.event_type === 'virtual_cta_click' ||
        e.event_type === 'virtual_clinic_booth_click'
      ).forEach(e => {
        const target = getMeta(e, 'cta_target') || getMeta(e, 'target_route') || getMeta(e, 'target') || 'unknown';
        const label = getMeta(e, 'booth_label') || getMeta(e, 'choice_text') || target;
        if (!boothClicks[target]) boothClicks[target] = { label, clicks: 0, sessions: new Set() };
        boothClicks[target].clicks++;
        if (e.session_id) boothClicks[target].sessions.add(e.session_id);
        if (e.anonymous_id) boothClicks[target].sessions.add(e.anonymous_id);
      });

      // Calculate booth-to-booking conversion
      const boothStats: BoothStat[] = Object.entries(boothClicks)
        .map(([id, data]) => {
          const boothBookings = bookingEvents.filter(e =>
            (e.session_id && data.sessions.has(e.session_id)) ||
            (e.anonymous_id && data.sessions.has(e.anonymous_id))
          ).length;
          return {
            booth_id: id,
            booth_label: data.label,
            clicks: data.clicks,
            bookings: boothBookings,
            conversionRate: data.clicks > 0 ? Math.round((boothBookings / data.clicks) * 100) : 0,
          };
        })
        .sort((a, b) => b.clicks - a.clicks);

      // Episode breakdown
      const episodeBreakdown: Record<string, { starts: number; completions: number; cta: number }> = {};
      virtualEvents.forEach(e => {
        const ep = getMeta(e, 'episode_number') || getMeta(e, 'story_id') || 'other';
        const key = typeof ep === 'number' ? `Episode ${ep}` : String(ep);
        if (!episodeBreakdown[key]) episodeBreakdown[key] = { starts: 0, completions: 0, cta: 0 };
        if (e.event_type === 'virtual_story_started') episodeBreakdown[key].starts++;
        if (e.event_type === 'virtual_story_completed') episodeBreakdown[key].completions++;
        if (e.event_type.includes('cta')) episodeBreakdown[key].cta++;
      });

      // Referral rate: completions → CTA clicks → bookings
      const referralRate = completions > 0 ? Math.round((bookingsFromVirtual / completions) * 100) : 0;
      const ctaRate = completions > 0 ? Math.round((ctaClicks / completions) * 100) : 0;

      return {
        funnel: [
          { label: th ? '🎮 เริ่มเล่น' : '🎮 Story Started', count: storyStarts, color: 'hsl(var(--primary))' },
          { label: th ? '📖 ดูซีน' : '📖 Scenes Viewed', count: sceneViews, color: 'hsl(var(--primary) / 0.85)' },
          { label: th ? '✅ เล่นจบ' : '✅ Completed', count: completions, color: 'hsl(var(--primary) / 0.7)' },
          { label: th ? '🔗 กด CTA' : '🔗 CTA Clicked', count: ctaClicks, color: 'hsl(var(--primary) / 0.55)' },
          { label: th ? '📅 สร้างการจอง' : '📅 Booking Created', count: bookingsFromVirtual, color: 'hsl(var(--primary) / 0.4)' },
          { label: th ? '✔️ ยืนยันการจอง' : '✔️ Booking Confirmed', count: confirmedFromVirtual, color: 'hsl(var(--primary) / 0.3)' },
        ] as FunnelStep[],
        boothStats,
        episodeBreakdown: Object.entries(episodeBreakdown).map(([name, data]) => ({ name, ...data })),
        referralRate,
        ctaRate,
        totalStarts: storyStarts,
        totalCompletions: completions,
        totalCTA: ctaClicks,
        totalBookings: bookingsFromVirtual,
        totalConfirmed: confirmedFromVirtual,
      };
    },
  });

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

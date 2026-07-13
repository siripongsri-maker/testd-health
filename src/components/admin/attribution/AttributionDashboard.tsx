import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, MousePointerClick, Target, Globe, Radio } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function AttributionDashboard() {
  const { language } = useLanguage();
  const [touchModel, setTouchModel] = useState<'first' | 'last'>('last');
  const [live, setLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const qc = useQueryClient();

  // Realtime: refresh on new visitor_attribution rows / tracked_links clicks
  useEffect(() => {
    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: ['attribution-channels'] });
      qc.invalidateQueries({ queryKey: ['attribution-campaigns'] });
      qc.invalidateQueries({ queryKey: ['attribution-partners'] });
      qc.invalidateQueries({ queryKey: ['attribution-summary'] });
      setLastUpdate(new Date());
    };
    const channel = supabase
      .channel('attribution-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_attribution' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_links' }, invalidateAll)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Channel performance
  const { data: channelData } = useQuery({
    queryKey: ['attribution-channels', touchModel],
    queryFn: async () => {
      const touchPrefix = touchModel === 'first' ? 'first_touch' : 'last_touch';
      const { data, error } = await supabase
        .from('visitor_attribution')
        .select(`${touchPrefix}_channel, anonymous_id, user_id`)
        .not(`${touchPrefix}_channel`, 'is', null);
      if (error) throw error;

      const grouped: Record<string, { visits: number; identified: number }> = {};
      (data as any[])?.forEach((row: any) => {
        const ch = row[`${touchPrefix}_channel`] || 'direct';
        if (!grouped[ch]) grouped[ch] = { visits: 0, identified: 0 };
        grouped[ch].visits++;
        if (row.user_id) grouped[ch].identified++;
      });

      return Object.entries(grouped)
        .map(([channel, stats]) => ({ channel, ...stats }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
    },
  });

  // Campaign performance
  const { data: campaignData } = useQuery({
    queryKey: ['attribution-campaigns', touchModel],
    queryFn: async () => {
      const touchPrefix = touchModel === 'first' ? 'first_touch' : 'last_touch';
      const { data, error } = await supabase
        .from('visitor_attribution')
        .select(`${touchPrefix}_campaign, anonymous_id, user_id`)
        .not(`${touchPrefix}_campaign`, 'is', null);
      if (error) throw error;

      const grouped: Record<string, { visits: number; identified: number }> = {};
      (data as any[])?.forEach((row: any) => {
        const c = row[`${touchPrefix}_campaign`] || 'none';
        if (!grouped[c]) grouped[c] = { visits: 0, identified: 0 };
        grouped[c].visits++;
        if (row.user_id) grouped[c].identified++;
      });

      return Object.entries(grouped)
        .map(([campaign, stats]) => ({ campaign, ...stats }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
    },
  });

  // Top partners
  const { data: partnerData } = useQuery({
    queryKey: ['attribution-partners', touchModel],
    queryFn: async () => {
      const touchPrefix = touchModel === 'first' ? 'first_touch' : 'last_touch';
      const { data, error } = await supabase
        .from('visitor_attribution')
        .select(`${touchPrefix}_partner, anonymous_id, user_id`)
        .not(`${touchPrefix}_partner`, 'is', null);
      if (error) throw error;

      const grouped: Record<string, { visits: number; identified: number }> = {};
      (data as any[])?.forEach((row: any) => {
        const p = row[`${touchPrefix}_partner`] || 'unknown';
        if (!grouped[p]) grouped[p] = { visits: 0, identified: 0 };
        grouped[p].visits++;
        if (row.user_id) grouped[p].identified++;
      });

      return Object.entries(grouped)
        .map(([partner, stats]) => ({ partner, ...stats }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
    },
  });

  // Summary stats
  const { data: summary } = useQuery({
    queryKey: ['attribution-summary'],
    queryFn: async () => {
      const { count: totalVisitors } = await supabase.from('visitor_attribution').select('*', { count: 'exact', head: true });
      const { count: identified } = await supabase.from('visitor_attribution').select('*', { count: 'exact', head: true }).not('user_id', 'is', null);
      const { count: totalClicks } = await supabase.from('tracked_links').select('click_count');
      const { data: clickData } = await supabase.from('tracked_links').select('click_count');
      const clicks = (clickData as any[])?.reduce((sum: number, r: any) => sum + (r.click_count || 0), 0) || 0;
      return {
        totalVisitors: totalVisitors || 0,
        identified: identified || 0,
        totalClicks: clicks,
        conversionRate: totalVisitors ? Math.round(((identified || 0) / totalVisitors) * 100) : 0,
      };
    },
    refetchInterval: 60_000,
  });

  const statCards = [
    { icon: Users, label: language === 'th' ? 'ผู้เข้าชมทั้งหมด' : 'Total Visitors', value: summary?.totalVisitors || 0 },
    { icon: Target, label: language === 'th' ? 'ระบุตัวตนแล้ว' : 'Identified', value: summary?.identified || 0 },
    { icon: MousePointerClick, label: language === 'th' ? 'คลิกลิงก์' : 'Link Clicks', value: summary?.totalClicks || 0 },
    { icon: TrendingUp, label: language === 'th' ? 'อัตรา Conversion' : 'Conversion', value: `${summary?.conversionRate || 0}%` },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <s.icon className="h-4 w-4" />
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Touch model toggle */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={touchModel} onValueChange={v => setTouchModel(v as 'first' | 'last')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first">{language === 'th' ? 'First Touch (ครั้งแรก)' : 'First Touch'}</SelectItem>
            <SelectItem value="last">{language === 'th' ? 'Last Touch (ล่าสุด)' : 'Last Touch'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Channel chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {language === 'th' ? '📊 ช่องทางที่มา' : '📊 Channel Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channelData && channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={channelData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="channel" width={80} fontSize={12} />
                <Tooltip />
                <Bar dataKey="visits" fill="hsl(var(--primary))" name={language === 'th' ? 'เข้าชม' : 'Visits'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="identified" fill="hsl(var(--accent))" name={language === 'th' ? 'ระบุตัวตน' : 'Identified'} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ยังไม่มีข้อมูล' : 'No data yet'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Campaign + Partner side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'th' ? '🎯 แคมเปญ' : '🎯 Campaigns'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaignData && campaignData.length > 0 ? (
              <div className="space-y-2">
                {campaignData.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.campaign}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{c.visits}</span>
                      {c.identified > 0 && <span className="text-xs text-primary">({c.identified})</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No campaigns</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'th' ? '🤝 พาร์ทเนอร์ / KOL' : '🤝 Partners / KOL'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partnerData && partnerData.length > 0 ? (
              <div className="space-y-2">
                {partnerData.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.partner}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{p.visits}</span>
                      {p.identified > 0 && <span className="text-xs text-primary">({p.identified})</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No partner data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

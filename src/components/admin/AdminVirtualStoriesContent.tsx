import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3, Users, CheckCircle, TrendingUp, Play, RefreshCw, Lightbulb, AlertTriangle, Sparkles, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { generateSmartInsights, type StatsInput, type SmartInsightsResult, type InsightSeverity } from "@/lib/virtualStoryInsights";
import { VirtualFunnelDashboard } from "./attribution/VirtualFunnelDashboard";
import AdminVirtualEpisodesPanel from "./AdminVirtualEpisodesPanel";

const COLORS = ['#ff4da6', '#00e5ff', '#ffe600', '#7fffd4', '#9b30ff', '#00cc70'];

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  success: 'border-green-500/30 bg-green-500/10',
  info: 'border-primary/30 bg-primary/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  danger: 'border-destructive/30 bg-destructive/10',
};

const FLAG_VARIANT: Record<InsightSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  info: 'secondary',
  warning: 'outline',
  danger: 'destructive',
};

export default function AdminVirtualStoriesContent() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsInput>({
    totalStarts: 0, totalCompletions: 0, completionRate: 0,
    replayCount: 0, pathDistribution: [], resultDistribution: [],
    sceneDropoff: [], ctaClicks: [], monthlyTrend: [],
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Primary source: analytics_events (reliable, no RLS insert issues)
      const { data: analyticsEvents } = await supabase
        .from('analytics_events')
        .select('event_type, metadata, created_at, anonymous_id, session_id')
        .like('event_type', 'virtual_story_%')
        .order('created_at', { ascending: false })
        .limit(5000);

      // Secondary source: virtual_story_sessions (may have fewer due to RLS)
      const { data: sessions } = await supabase
        .from('virtual_story_sessions').select('*').order('created_at', { ascending: false });

      const events = analyticsEvents || [];
      const getMeta = (e: any, key: string) => {
        try {
          const m = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
          return m?.[key];
        } catch { return undefined; }
      };

      // Count from analytics_events (most reliable)
      const startEvents = events.filter((e: any) => e.event_type === 'virtual_story_started');
      const completeEvents = events.filter((e: any) => e.event_type === 'virtual_story_completed');
      const replayEvents = events.filter((e: any) => e.event_type === 'virtual_story_replayed');
      const sceneEvents = events.filter((e: any) => e.event_type === 'virtual_story_scene_viewed' || e.event_type === 'virtual_story_choice_selected');
      const ctaEvents = events.filter((e: any) => e.event_type === 'virtual_story_cta_clicked');
      const knowledgeEvents = events.filter((e: any) => e.event_type === 'virtual_story_knowledge_opened');

      const totalStarts = startEvents.length;
      const totalCompletions = completeEvents.length;
      const completionRate = totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0;
      const replayCount = replayEvents.length;

      // Path distribution from completed events metadata
      const pathCounts: Record<string, number> = {};
      completeEvents.forEach((e: any) => {
        const p = getMeta(e, 'path_selected') || getMeta(e, 'path') || 'unknown';
        pathCounts[p] = (pathCounts[p] || 0) + 1;
      });
      // Supplement from sessions if analytics has less data
      (sessions || []).filter((s: any) => s.completed).forEach((s: any) => {
        if (completeEvents.length === 0) {
          const p = s.path_selected || 'unknown';
          pathCounts[p] = (pathCounts[p] || 0) + 1;
        }
      });
      const pathDistribution = Object.entries(pathCounts).map(([name, value]) => ({ name, value }));

      // Result distribution
      const resultCounts: Record<string, number> = {};
      completeEvents.forEach((e: any) => {
        const r = getMeta(e, 'result_type') || 'unknown';
        resultCounts[r] = (resultCounts[r] || 0) + 1;
      });
      (sessions || []).filter((s: any) => s.completed && completeEvents.length === 0).forEach((s: any) => {
        const r = s.result_type || 'unknown';
        resultCounts[r] = (resultCounts[r] || 0) + 1;
      });
      const resultDistribution = Object.entries(resultCounts).map(([name, value]) => ({ name, value }));

      // Scene drop-off from analytics
      const sceneViews: Record<string, number> = {};
      sceneEvents.forEach((e: any) => {
        const scene = getMeta(e, 'scene_id') || 'unknown';
        sceneViews[scene] = (sceneViews[scene] || 0) + 1;
      });
      const sceneDropoff = Object.entries(sceneViews).map(([scene, count]) => ({ scene, count }))
        .sort((a, b) => {
          const numA = parseInt(a.scene); const numB = parseInt(b.scene);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.scene.localeCompare(b.scene);
        });

      // CTA clicks
      const ctaCounts: Record<string, number> = {};
      ctaEvents.forEach((e: any) => {
        const target = getMeta(e, 'cta_target') || getMeta(e, 'choice_text') || 'unknown';
        ctaCounts[target] = (ctaCounts[target] || 0) + 1;
      });
      const ctaClicks = Object.entries(ctaCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      // Knowledge opens
      const knowledgeCounts: Record<string, number> = {};
      knowledgeEvents.forEach((e: any) => {
        const scene = getMeta(e, 'scene_id') || getMeta(e, 'topic') || 'unknown';
        knowledgeCounts[scene] = (knowledgeCounts[scene] || 0) + 1;
      });
      const knowledgeOpens = Object.entries(knowledgeCounts).map(([scene, count]) => ({ scene, count })).sort((a, b) => b.count - a.count);

      // Monthly trend from analytics start events
      const monthlyMap: Record<string, { starts: number; completions: number }> = {};
      startEvents.forEach((e: any) => {
        const month = (e.created_at || '').substring(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { starts: 0, completions: 0 };
        monthlyMap[month].starts++;
      });
      completeEvents.forEach((e: any) => {
        const month = (e.created_at || '').substring(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { starts: 0, completions: 0 };
        monthlyMap[month].completions++;
      });
      const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

      setStats({ totalStarts, totalCompletions, completionRate, replayCount, pathDistribution, resultDistribution, sceneDropoff, ctaClicks, monthlyTrend, knowledgeOpens });
    } catch (err) {
      console.error('Virtual stories stats error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const smartInsights: SmartInsightsResult = generateSmartInsights(stats);

  const exportCSV = async () => {
    try {
      const { data: sessions } = await supabase.from('virtual_story_sessions').select('*').order('created_at', { ascending: false });
      if (!sessions?.length) return;
      const headers = Object.keys(sessions[0]);
      // Add insight summary row
      const insightHeaders = Object.keys(smartInsights.csvSummary);
      const allHeaders = [...new Set([...headers, ...insightHeaders])];
      const bom = '\uFEFF';
      const dataRows = sessions.map(r => allHeaders.map(h => `"${(r as any)[h] ?? ''}"`).join(','));
      const summaryRow = allHeaders.map(h => `"${smartInsights.csvSummary[h] ?? ''}"`).join(',');
      const csv = bom + [allHeaders.join(','), ...dataRows, '', '"--- INSIGHT SUMMARY ---"', summaryRow].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `virtual_stories_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const th = language === 'th';

  const [activeTab, setActiveTab] = useState('funnel');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Virtual Stories Analytics
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}><RefreshCw className="h-4 w-4 mr-1" />{th ? 'รีเฟรช' : 'Refresh'}</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="funnel" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            {th ? 'Funnel' : 'Funnel'}
          </TabsTrigger>
          <TabsTrigger value="episodes" className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {th ? 'รายตอน' : 'Episodes'}
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {th ? 'Engagement' : 'Engagement'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="mt-4">
          <VirtualFunnelDashboard />
        </TabsContent>

        <TabsContent value="episodes" className="mt-4">
          <AdminVirtualEpisodesPanel />
        </TabsContent>

        <TabsContent value="engagement" className="mt-4 space-y-6">

      {/* ═══ SMART INSIGHTS PANEL ═══ */}
      {!loading && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {th ? 'Smart Insights' : 'Smart Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Executive Summary */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">{th ? 'เกิดอะไรขึ้น:' : 'What happened:'}</span> {smartInsights.summary.whatHappened}</p>
                  <p><span className="font-semibold">{th ? 'นัยสำคัญ:' : 'What it means:'}</span> {smartInsights.summary.whatItMeans}</p>
                  <p><span className="font-semibold">{th ? 'ควรทำอะไรต่อ:' : 'Recommended:'}</span> {smartInsights.summary.recommendedAction}</p>
                </div>
              </div>
            </div>

            {/* Flags */}
            {smartInsights.flags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {smartInsights.flags.map((flag, i) => (
                  <Badge key={i} variant={FLAG_VARIANT[flag.severity]} className="text-xs">
                    {flag.severity === 'danger' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {flag.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Top Insights */}
            {smartInsights.insights.length > 0 && (
              <div className="grid gap-2">
                {smartInsights.insights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className={`rounded-lg border p-3 text-sm ${SEVERITY_STYLES[insight.severity]}`}>
                    <p className="font-medium">{insight.finding}</p>
                    <p className="text-muted-foreground mt-1">{insight.meaning}</p>
                    <p className="mt-1 flex items-center gap-1">
                      <Target className="h-3 w-3 shrink-0" />
                      <span className="font-medium">{insight.action}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Actions */}
            {smartInsights.actions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{th ? '📋 Action Items' : '📋 Action Items'}</p>
                <ul className="space-y-1">
                  {smartInsights.actions.slice(0, 3).map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold">{i + 1}.</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content Opportunities */}
            {smartInsights.contentOpportunities.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{th ? '🎯 Content Opportunities' : '🎯 Content Opportunities'}</p>
                <div className="grid gap-2">
                  {smartInsights.contentOpportunities.map((opp, i) => (
                    <div key={i} className="rounded-lg bg-muted/30 p-2 text-sm">
                      <p className="font-medium">{opp.label}</p>
                      <p className="text-muted-foreground text-xs">{opp.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: th ? 'เริ่มเล่นทั้งหมด' : 'Total Starts', value: stats.totalStarts, icon: Users, color: 'text-primary' },
          { label: th ? 'เล่นจบ' : 'Completions', value: stats.totalCompletions, icon: CheckCircle, color: 'text-green-500' },
          { label: th ? 'อัตราจบ' : 'Completion %', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-yellow-500' },
          { label: th ? 'เล่นซ้ำ' : 'Replays', value: stats.replayCount, icon: RefreshCw, color: 'text-purple-500' },
          { label: 'CTA Clicks', value: stats.ctaClicks.reduce((a, c) => a + c.value, 0), icon: BarChart3, color: 'text-cyan-500' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-2 ${kpi.color}`} />
              <div className="text-2xl font-bold">{loading ? '...' : kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{th ? 'Path ที่เลือก' : 'Path Distribution'}</CardTitle></CardHeader>
          <CardContent>
            {stats.pathDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.pathDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.pathDistribution.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{th ? 'ผลลัพธ์' : 'Result Types'}</CardTitle></CardHeader>
          <CardContent>
            {stats.resultDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.resultDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.resultDistribution.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Scene Activity */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{th ? 'กิจกรรมตาม Scene (Drop-off)' : 'Activity by Scene (Drop-off)'}</CardTitle></CardHeader>
        <CardContent>
          {stats.sceneDropoff.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.sceneDropoff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scene" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#00e5ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{th ? 'แนวโน้มรายเดือน' : 'Monthly Trend'}</CardTitle></CardHeader>
        <CardContent>
          {stats.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="starts" fill="#ff4da6" name={th ? 'เริ่มเล่น' : 'Starts'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completions" fill="#00cc70" name={th ? 'เล่นจบ' : 'Completions'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
        </CardContent>
      </Card>

      {/* CTA Clicks */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{th ? 'CTA ที่คลิกมากสุด' : 'Top CTA Clicks'}</CardTitle></CardHeader>
        <CardContent>
          {stats.ctaClicks.length > 0 ? (
            <div className="space-y-2">
              {stats.ctaClicks.slice(0, 10).map((cta, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm truncate flex-1">{cta.name}</span>
                  <span className="text-sm font-bold ml-2">{cta.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
        </CardContent>
      </Card>

      {/* Knowledge Opens */}
      {stats.knowledgeOpens && stats.knowledgeOpens.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{th ? '📖 Knowledge Overlay ที่ถูกเปิดบ่อย' : '📖 Knowledge Overlay Opens'}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.knowledgeOpens.map((k, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm">Scene {k.scene}</span>
                  <span className="text-sm font-bold">{k.count} {th ? 'ครั้ง' : 'opens'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

        </TabsContent>
      </Tabs>
    </div>
  );
}

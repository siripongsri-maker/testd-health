import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Users, CheckCircle, TrendingUp, Play, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#ff4da6', '#00e5ff', '#ffe600', '#7fffd4', '#9b30ff', '#00cc70'];

export default function AdminVirtualStoriesContent() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalStarts: 0, totalCompletions: 0, completionRate: 0,
    replayCount: 0, pathDistribution: [], resultDistribution: [],
    sceneDropoff: [], ctaClicks: [], monthlyTrend: [],
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch sessions
      const { data: sessions } = await supabase
        .from('virtual_story_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch events
      const { data: events } = await supabase
        .from('virtual_story_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sessions) { setLoading(false); return; }

      const totalStarts = sessions.length;
      const completed = sessions.filter((s: any) => s.completed);
      const totalCompletions = completed.length;
      const completionRate = totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0;

      // Replay count (same anonymous_id with multiple sessions)
      const idCounts: Record<string, number> = {};
      sessions.forEach((s: any) => {
        const key = s.user_id || s.anonymous_id || 'unknown';
        idCounts[key] = (idCounts[key] || 0) + 1;
      });
      const replayCount = Object.values(idCounts).filter(c => c > 1).reduce((a, b) => a + b - 1, 0);

      // Path distribution
      const pathCounts: Record<string, number> = {};
      completed.forEach((s: any) => {
        const p = s.path_selected || 'unknown';
        pathCounts[p] = (pathCounts[p] || 0) + 1;
      });
      const pathDistribution = Object.entries(pathCounts).map(([name, value]) => ({ name, value }));

      // Result distribution
      const resultCounts: Record<string, number> = {};
      completed.forEach((s: any) => {
        const r = s.result_type || 'unknown';
        resultCounts[r] = (resultCounts[r] || 0) + 1;
      });
      const resultDistribution = Object.entries(resultCounts).map(([name, value]) => ({ name, value }));

      // Scene dropoff from events
      const sceneViews: Record<string, number> = {};
      (events || []).filter((e: any) => e.event_name === 'virtual_story_scene_viewed' || e.event_name === 'virtual_story_choice_selected')
        .forEach((e: any) => {
          const scene = e.scene_id || 'unknown';
          sceneViews[scene] = (sceneViews[scene] || 0) + 1;
        });
      const sceneDropoff = Object.entries(sceneViews)
        .map(([scene, count]) => ({ scene, count }))
        .sort((a, b) => Number(a.scene) - Number(b.scene));

      // CTA clicks
      const ctaCounts: Record<string, number> = {};
      (events || []).filter((e: any) => e.event_name === 'virtual_story_cta_clicked')
        .forEach((e: any) => {
          const target = e.cta_target || e.choice_text || 'unknown';
          ctaCounts[target] = (ctaCounts[target] || 0) + 1;
        });
      const ctaClicks = Object.entries(ctaCounts).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Monthly trend
      const monthlyMap: Record<string, { starts: number; completions: number }> = {};
      sessions.forEach((s: any) => {
        const month = (s.created_at || '').substring(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { starts: 0, completions: 0 };
        monthlyMap[month].starts++;
        if (s.completed) monthlyMap[month].completions++;
      });
      const monthlyTrend = Object.entries(monthlyMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      setStats({
        totalStarts, totalCompletions, completionRate, replayCount,
        pathDistribution, resultDistribution, sceneDropoff, ctaClicks, monthlyTrend,
      });
    } catch (err) {
      console.error('Virtual stories stats error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const exportCSV = async () => {
    try {
      const { data: sessions } = await supabase.from('virtual_story_sessions').select('*').order('created_at', { ascending: false });
      if (!sessions?.length) return;
      const headers = Object.keys(sessions[0]);
      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...sessions.map(r => headers.map(h => `"${(r as any)[h] ?? ''}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `virtual_stories_${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const th = language === 'th';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          {th ? 'Virtual Stories Analytics' : 'Virtual Stories Analytics'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}><RefreshCw className="h-4 w-4 mr-1" />{th ? 'รีเฟรช' : 'Refresh'}</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: th ? 'เริ่มเล่นทั้งหมด' : 'Total Starts', value: stats.totalStarts, icon: Users, color: 'text-primary' },
          { label: th ? 'เล่นจบ' : 'Completions', value: stats.totalCompletions, icon: CheckCircle, color: 'text-green-500' },
          { label: th ? 'อัตราจบ' : 'Completion %', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-yellow-500' },
          { label: th ? 'เล่นซ้ำ' : 'Replays', value: stats.replayCount, icon: RefreshCw, color: 'text-purple-500' },
          { label: th ? 'CTA Clicks' : 'CTA Clicks', value: stats.ctaClicks.reduce((a: number, c: any) => a + c.value, 0), icon: BarChart3, color: 'text-cyan-500' },
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
        {/* Path Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{th ? 'Path ที่เลือก' : 'Path Distribution'}</CardTitle></CardHeader>
          <CardContent>
            {stats.pathDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.pathDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.pathDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
          </CardContent>
        </Card>

        {/* Result Type */}
        <Card>
          <CardHeader><CardTitle className="text-sm">{th ? 'ผลลัพธ์' : 'Result Types'}</CardTitle></CardHeader>
          <CardContent>
            {stats.resultDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.resultDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.resultDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
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
              {stats.ctaClicks.slice(0, 10).map((cta: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm truncate flex-1">{cta.name}</span>
                  <span className="text-sm font-bold ml-2">{cta.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-muted-foreground py-8">{th ? 'ยังไม่มีข้อมูล' : 'No data yet'}</p>}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader><CardTitle className="text-sm">💡 {th ? 'Insights' : 'Insights'}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            {stats.totalStarts > 0 && (
              <>
                <p>• {th ? `มีผู้เริ่มเล่นทั้งหมด ${stats.totalStarts} ครั้ง เล่นจบ ${stats.totalCompletions} ครั้ง (${stats.completionRate}%)` : `${stats.totalStarts} total starts, ${stats.totalCompletions} completions (${stats.completionRate}%)`}</p>
                {stats.pathDistribution.length > 0 && (
                  <p>• {th ? 'Path ที่นิยม:' : 'Popular paths:'} {stats.pathDistribution.map((p: any) => `${p.name} (${p.value})`).join(', ')}</p>
                )}
                {stats.replayCount > 0 && (
                  <p>• {th ? `มีผู้เล่นซ้ำ ${stats.replayCount} ครั้ง — แสดงว่าเนื้อหาน่าสนใจ` : `${stats.replayCount} replays — good engagement signal`}</p>
                )}
              </>
            )}
            {stats.totalStarts === 0 && (
              <p>{th ? 'ยังไม่มีข้อมูล — รอผู้เล่นเข้ามาใช้งาน' : 'No data yet — waiting for players'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

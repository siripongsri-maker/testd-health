import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Play, Gamepad2 } from "lucide-react";
import { getVirtualEpisodesSorted } from "@/config/virtualEpisodes";
import { useLanguage } from "@/lib/i18n";

type EvRow = {
  event_type: string;
  metadata: any;
  anonymous_id: string | null;
  session_id: string | null;
  created_at: string;
};

type EpisodeAgg = {
  slug: string;
  title: string;
  kind: string;
  publishedAt: string;
  views: number;
  starts: number;
  completes: number;
  ctaClicks: number;
  shareImpressions: number;
  shares: number;
  downloads: number;
  uniqueVisitors: number;
  completionRate: number;
  ctaRate: number;
  /** shares ÷ impressions (true share rate) */
  shareRate: number;
  topResults: Array<{ name: string; count: number }>;
  topSources: Array<{ name: string; count: number }>;
  lastActivity: string | null;
};

const EVENT_TYPES = [
  'virtual_episode_view',
  'virtual_episode_start',
  'virtual_episode_complete',
  'virtual_cta_click',
  'virtual_share_impression',
  'virtual_result_share',
  'virtual_result_download',
];

const getMeta = (e: EvRow, key: string) => {
  try {
    const m = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
    return m?.[key];
  } catch {
    return undefined;
  }
};

const topN = (counts: Record<string, number>, n = 5) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));

export default function AdminVirtualEpisodesPanel() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EvRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, metadata, anonymous_id, session_id, created_at')
        .in('event_type', EVENT_TYPES)
        .order('created_at', { ascending: false })
        .limit(10000);
      if (error) throw error;
      setRows((data as any) || []);
    } catch (err) {
      console.error('Failed to load episode analytics', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const episodes = useMemo(() => getVirtualEpisodesSorted(), []);

  const aggregates: EpisodeAgg[] = useMemo(() => {
    return episodes.map((ep) => {
      const epRows = rows.filter((r) => getMeta(r, 'slug') === ep.slug);
      const visitors = new Set<string>();
      let views = 0, starts = 0, completes = 0, ctaClicks = 0, shareImpressions = 0, shares = 0, downloads = 0;
      const resultCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};
      let lastActivity: string | null = null;

      for (const r of epRows) {
        if (!lastActivity || r.created_at > lastActivity) lastActivity = r.created_at;
        const id = r.anonymous_id || r.session_id;
        if (id) visitors.add(id);
        const src = getMeta(r, 'source') || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;

        switch (r.event_type) {
          case 'virtual_episode_view': views++; break;
          case 'virtual_episode_start': starts++; break;
          case 'virtual_episode_complete': {
            completes++;
            const rt = getMeta(r, 'result_type') || getMeta(r, 'result_label') || 'unknown';
            resultCounts[rt] = (resultCounts[rt] || 0) + 1;
            break;
          }
          case 'virtual_cta_click': ctaClicks++; break;
          case 'virtual_share_impression': shareImpressions++; break;
          case 'virtual_result_share': {
            const m = getMeta(r, 'method');
            // Count meaningful share attempts (web_share, clipboard) only
            if (m === 'web_share' || m === 'clipboard') shares++;
            break;
          }
          case 'virtual_result_download': downloads++; break;
        }
      }

      const completionRate = starts > 0 ? Math.round((completes / starts) * 100) : 0;
      const ctaRate = completes > 0 ? Math.round((ctaClicks / completes) * 100) : 0;
      // True share rate = shares ÷ impressions (denominator is users who *saw* the share UI)
      const shareRate = shareImpressions > 0 ? Math.round((shares / shareImpressions) * 100) : 0;

      return {
        slug: ep.slug,
        title: th ? ep.titleTh : ep.titleEn,
        kind: ep.kind,
        publishedAt: ep.publishedAt,
        views, starts, completes, ctaClicks, shareImpressions, shares, downloads,
        uniqueVisitors: visitors.size,
        completionRate, ctaRate, shareRate,
        topResults: topN(resultCounts, 3),
        topSources: topN(sourceCounts, 4),
        lastActivity,
      };
    });
  }, [rows, episodes, th]);

  const totals = useMemo(() => {
    return aggregates.reduce(
      (acc, a) => ({
        views: acc.views + a.views,
        starts: acc.starts + a.starts,
        completes: acc.completes + a.completes,
        ctaClicks: acc.ctaClicks + a.ctaClicks,
        shareImpressions: acc.shareImpressions + a.shareImpressions,
        shares: acc.shares + a.shares,
        downloads: acc.downloads + a.downloads,
      }),
      { views: 0, starts: 0, completes: 0, ctaClicks: 0, shareImpressions: 0, shares: 0, downloads: 0 },
    );
  }, [aggregates]);

  const exportCsv = () => {
    const header = [
      'slug', 'title', 'kind', 'published_at', 'views', 'starts', 'completes',
      'completion_rate_%', 'cta_clicks', 'cta_rate_%',
      'share_impressions', 'shares', 'share_rate_%',
      'downloads', 'unique_visitors', 'last_activity', 'top_result', 'top_source',
    ];
    const lines = aggregates.map((a) => [
      a.slug, JSON.stringify(a.title), a.kind, a.publishedAt,
      a.views, a.starts, a.completes, a.completionRate,
      a.ctaClicks, a.ctaRate,
      a.shareImpressions, a.shares, a.shareRate, a.downloads,
      a.uniqueVisitors, a.lastActivity || '',
      a.topResults[0]?.name || '', a.topSources[0]?.name || '',
    ].join(','));
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `virtual-episodes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const ranked = useMemo(
    () => [...aggregates].sort((a, b) => b.starts - a.starts).slice(0, 5),
    [aggregates],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">{th ? 'ภาพรวมรายตอน' : 'Per-Episode Performance'}</h3>
          <p className="text-xs text-muted-foreground">
            {th ? 'ติดตามผู้ชม / การเล่นจบ / CTA / การแชร์ ในแต่ละตอน' : 'Track views, completions, CTA & shares per episode'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {th ? 'รีเฟรช' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {[
          { label: th ? 'Views' : 'Views', value: totals.views },
          { label: th ? 'Starts' : 'Starts', value: totals.starts },
          { label: th ? 'Completes' : 'Completes', value: totals.completes },
          { label: 'CTA', value: totals.ctaClicks },
          { label: th ? 'Share Impr.' : 'Share Impr.', value: totals.shareImpressions },
          { label: th ? 'Shares' : 'Shares', value: totals.shares },
          { label: th ? 'Downloads' : 'Downloads', value: totals.downloads },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{loading ? '…' : k.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top by starts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{th ? '🏆 ตอนยอดนิยม (เล่นมากสุด)' : '🏆 Most-Played Episodes'}</CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 || ranked[0].starts === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-xs">
              {th ? 'ยังไม่มีข้อมูล' : 'No data yet'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {ranked.map((a, i) => (
                <div key={a.slug} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <span className="text-sm font-bold w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.starts} starts · {a.completes} completes · {a.completionRate}% done
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-episode table */}
      <div className="space-y-3">
        {aggregates.map((a) => (
          <Card key={a.slug}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {a.kind === 'game' ? <Gamepad2 className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary" />}
                  <span className="truncate">{a.title}</span>
                  <Badge variant="outline" className="text-[10px]">{a.slug}</Badge>
                </CardTitle>
                <span className="text-[10px] text-muted-foreground shrink-0">{a.publishedAt}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                {[
                  { l: 'Views', v: a.views },
                  { l: 'Starts', v: a.starts },
                  { l: 'Done', v: `${a.completes} (${a.completionRate}%)` },
                  { l: 'CTA', v: `${a.ctaClicks} (${a.ctaRate}%)` },
                  { l: th ? `Share (${a.shareImpressions} seen)` : `Share (${a.shareImpressions} seen)`, v: `${a.shares} (${a.shareRate}%)` },
                  { l: th ? 'Unique' : 'Unique', v: a.uniqueVisitors },
                ].map((k, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 p-2">
                    <div className="text-sm font-bold">{k.v}</div>
                    <div className="text-[10px] text-muted-foreground">{k.l}</div>
                  </div>
                ))}
              </div>
              {(a.topResults.length > 0 || a.topSources.length > 0) && (
                <div className="grid md:grid-cols-2 gap-2 text-xs">
                  {a.topResults.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                        {th ? 'ผลลัพธ์ยอดนิยม' : 'Top Results'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {a.topResults.map((r) => (
                          <Badge key={r.name} variant="secondary" className="text-[10px]">
                            {r.name} · {r.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.topSources.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                        {th ? 'มาจากแหล่ง' : 'Top Sources'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {a.topSources.map((s) => (
                          <Badge key={s.name} variant="outline" className="text-[10px]">
                            {s.name} · {s.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {a.lastActivity && (
                <p className="text-[10px] text-muted-foreground">
                  {th ? 'ใช้งานล่าสุด' : 'Last activity'}: {new Date(a.lastActivity).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

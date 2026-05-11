import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Play, Gamepad2 } from "lucide-react";
import { getVirtualEpisodesSorted } from "@/config/virtualEpisodes";
import { useLanguage } from "@/lib/i18n";
import type { VirtualAdminAnalytics, VirtualAdminEpisode } from "@/lib/virtualAdminAnalytics";

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
  shareRate: number;
  lastActivity: string | null;
};

interface Props {
  analyticsData: VirtualAdminAnalytics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function AdminVirtualEpisodesPanel({ analyticsData, loading, error, onRefresh }: Props) {
  const { language } = useLanguage();
  const th = language === 'th';

  const episodes = useMemo(() => getVirtualEpisodesSorted(), []);

  const aggregates: EpisodeAgg[] = useMemo(() => {
    const bySlug = new Map<string, VirtualAdminEpisode>();
    (analyticsData?.episodes || []).forEach((e) => bySlug.set(e.slug, e));
    return episodes.map((ep) => {
      const r = bySlug.get(ep.slug);
      const views = r?.views ?? 0;
      const starts = r?.starts ?? 0;
      const completes = r?.completes ?? 0;
      const ctaClicks = r?.cta_clicks ?? 0;
      const shareImpressions = r?.share_impressions ?? 0;
      const shares = r?.shares ?? 0;
      const downloads = r?.downloads ?? 0;
      const uniqueVisitors = r?.unique_visitors ?? 0;
      const completionRate = starts > 0 ? Math.round((completes / starts) * 100) : 0;
      const ctaRate = completes > 0 ? Math.round((ctaClicks / completes) * 100) : 0;
      const shareRate = shareImpressions > 0 ? Math.round((shares / shareImpressions) * 100) : 0;
      return {
        slug: ep.slug,
        title: th ? ep.titleTh : ep.titleEn,
        kind: ep.kind,
        publishedAt: ep.publishedAt,
        views, starts, completes, ctaClicks, shareImpressions, shares, downloads,
        uniqueVisitors, completionRate, ctaRate, shareRate,
        lastActivity: r?.last_activity ?? null,
      };
    });
  }, [analyticsData, episodes, th]);

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
      'downloads', 'unique_visitors', 'last_activity',
    ];
    const lines = aggregates.map((a) => [
      a.slug, JSON.stringify(a.title), a.kind, a.publishedAt,
      a.views, a.starts, a.completes, a.completionRate,
      a.ctaClicks, a.ctaRate,
      a.shareImpressions, a.shares, a.shareRate, a.downloads,
      a.uniqueVisitors, a.lastActivity || '',
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
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {th ? 'รีเฟรช' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {[
          { label: 'Views', value: totals.views },
          { label: 'Starts', value: totals.starts },
          { label: 'Completes', value: totals.completes },
          { label: 'CTA', value: totals.ctaClicks },
          { label: 'Share Impr.', value: totals.shareImpressions },
          { label: 'Shares', value: totals.shares },
          { label: 'Downloads', value: totals.downloads },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold">{loading ? '…' : k.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  { l: `Share (${a.shareImpressions} seen)`, v: `${a.shares} (${a.shareRate}%)` },
                  { l: 'Unique', v: a.uniqueVisitors },
                ].map((k, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 p-2">
                    <div className="text-sm font-bold">{k.v}</div>
                    <div className="text-[10px] text-muted-foreground">{k.l}</div>
                  </div>
                ))}
              </div>
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

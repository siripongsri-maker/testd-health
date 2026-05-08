import { supabase } from '@/integrations/supabase/client';

export type VirtualAdminEpisode = {
  slug: string;
  views: number;
  starts: number;
  completes: number;
  cta_clicks: number;
  share_impressions: number;
  shares: number;
  downloads: number;
  unique_visitors: number;
  last_activity: string | null;
};

export type VirtualAdminAnalytics = {
  debug: {
    status: string;
    querySource: string;
    recordCount: number;
    latestEventAt: string | null;
    eventTypes: Record<string, number>;
    sample: Array<Record<string, unknown>>;
    from?: string;
    to?: string;
  };
  totals: {
    views: number;
    starts: number;
    completes: number;
    ctaClicks: number;
    shareImpressions: number;
    shares: number;
    downloads: number;
    replays: number;
    uniqueVisitors: number;
  };
  eventCounts: Array<{ eventType: string; count: number; latest: string | null }>;
  episodes: VirtualAdminEpisode[];
  monthlyTrend: Array<{ month: string; starts: number; completions: number }>;
  ctaClicks: Array<{ name: string; value: number }>;
  pathDistribution: Array<{ name: string; value: number }>;
  resultDistribution: Array<{ name: string; value: number }>;
  sceneDropoff: Array<{ scene: string; count: number }>;
  topSources: Array<{ name: string; count: number }>;
};

export async function fetchVirtualAdminAnalytics(): Promise<VirtualAdminAnalytics> {
  const query = 'rpc:get_virtual_admin_analytics(default 90 days)';
  console.info('[Virtual Analytics] query start', { query });
  const started = performance.now();
  const { data, error } = await supabase.rpc('get_virtual_admin_analytics' as any);
  console.info('[Virtual Analytics] query response', {
    ok: !error,
    durationMs: Math.round(performance.now() - started),
    error,
    recordCount: (data as any)?.debug?.recordCount,
    latestEventAt: (data as any)?.debug?.latestEventAt,
    eventTypes: (data as any)?.debug?.eventTypes,
    sample: (data as any)?.debug?.sample,
  });
  if (error) throw error;
  return data as unknown as VirtualAdminAnalytics;
}
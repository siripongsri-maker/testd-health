// Centralized analytics helpers for the Virtual episode/game system.
// Persists to the existing `analytics_events` table via trackEvent — NO new tables.
// All payloads are anonymous-by-default (anonymous_id + session_id via trackEvent).

import { trackEvent } from '@/hooks/useAnalytics';
import { getEpisodeBySlug } from '@/config/virtualEpisodes';

export type EpisodeSource =
  | 'homepage'
  | 'hub'
  | 'share'
  | 'direct'
  | 'cta'
  | 'unknown';

export interface EpisodeContext {
  slug: string;
  title?: string;
  language?: 'th' | 'en' | string;
  source?: EpisodeSource;
}

const baseMeta = (ctx: EpisodeContext, extra?: Record<string, unknown>) => {
  const ep = getEpisodeBySlug(ctx.slug);
  return {
    slug: ctx.slug,
    episode_slug: ctx.slug,
    title: ctx.title || ep?.titleTh || ep?.titleEn || ctx.slug,
    episode_kind: ep?.kind,
    language: ctx.language,
    source: ctx.source || 'unknown',
    ...extra,
  };
};

export const trackEpisodeView = (ctx: EpisodeContext) =>
  trackEvent('virtual_episode_view', baseMeta(ctx));

export const trackEpisodeStart = (ctx: EpisodeContext) =>
  trackEvent('virtual_episode_start', baseMeta(ctx));

export const trackEpisodeComplete = (
  ctx: EpisodeContext,
  result?: { result_type?: string; result_label?: string; duration_ms?: number; score?: number }
) => trackEvent('virtual_episode_complete', baseMeta(ctx, result));

export const trackEpisodeCtaClick = (
  ctx: EpisodeContext,
  cta: { cta_type: string; cta_target?: string; cta_label?: string }
) => trackEvent('virtual_cta_click', baseMeta(ctx, cta));

export const trackEpisodeShare = (
  ctx: EpisodeContext,
  method: 'web_share' | 'clipboard' | 'cancelled' | 'failed' | 'click'
) => trackEvent('virtual_result_share', baseMeta(ctx, { method }));

export const trackEpisodeDownload = (
  ctx: EpisodeContext,
  format?: string
) => trackEvent('virtual_result_download', baseMeta(ctx, { format }));

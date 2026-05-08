CREATE OR REPLACE FUNCTION public.get_virtual_admin_analytics(
  p_from timestamp with time zone DEFAULT (now() - interval '90 days'),
  p_to timestamp with time zone DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'me_analyst'::app_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH base AS (
    SELECT
      event_type,
      metadata,
      created_at,
      anonymous_id,
      session_id,
      booking_id,
      COALESCE(
        NULLIF(metadata->>'slug', ''),
        NULLIF(metadata->>'episode_slug', ''),
        CASE NULLIF(metadata->>'story_id', '')
          WHEN 'ep1_date_story' THEN 'ep1'
          WHEN 'ep2_prep_lenacapavir' THEN 'ep2'
          ELSE NULLIF(metadata->>'story_id', '')
        END,
        CASE NULLIF(metadata->>'episode_number', '')
          WHEN '1' THEN 'ep1'
          WHEN '2' THEN 'ep2'
          ELSE NULL
        END,
        CASE
          WHEN event_type LIKE 'virtual_prep_fortune_%' THEN 'prep-fortune'
          WHEN event_type IN ('virtual_game_started','virtual_game_completed','virtual_game_lost','virtual_mission_start','virtual_pill_found','virtual_scene_started','virtual_scene_completed') THEN 'prep-hunt'
          ELSE 'unknown'
        END
      ) AS slug,
      CASE
        WHEN event_type IN ('virtual_episode_view','virtual_story_scene_viewed','virtual_scene_started') THEN 'view'
        WHEN event_type IN ('virtual_episode_start','virtual_story_started','virtual_game_started','virtual_mission_start','virtual_prep_fortune_open') THEN 'start'
        WHEN event_type IN ('virtual_episode_complete','virtual_story_completed','virtual_game_completed','virtual_scene_completed','virtual_prep_fortune_reveal') THEN 'complete'
        WHEN event_type IN ('virtual_cta_click','virtual_story_cta_clicked','virtual_cta_booking','virtual_cta_selftest','virtual_cta_support','virtual_cta_booking_click','virtual_prep_fortune_cta_booking') THEN 'cta'
        WHEN event_type IN ('virtual_share_impression') THEN 'share_impression'
        WHEN event_type IN ('virtual_result_share','virtual_share_click','virtual_share_native','virtual_share_copy','virtual_share_native_textonly','virtual_prep_fortune_share') THEN 'share'
        WHEN event_type IN ('virtual_result_download','virtual_share_download') THEN 'download'
        ELSE 'other'
      END AS metric
    FROM public.analytics_events
    WHERE created_at >= p_from
      AND created_at <= p_to
      AND (
        event_type = ANY (ARRAY[
          'virtual_episode_view','virtual_episode_start','virtual_episode_complete',
          'virtual_story_started','virtual_story_completed','virtual_story_scene_viewed','virtual_story_choice_selected','virtual_story_cta_clicked','virtual_story_knowledge_opened','virtual_story_replayed',
          'virtual_cta_click','virtual_cta_booking','virtual_cta_selftest','virtual_cta_support','virtual_cta_booking_click',
          'virtual_share_impression','virtual_result_share','virtual_result_download',
          'virtual_share_click','virtual_share_native','virtual_share_copy','virtual_share_download','virtual_share_native_textonly','virtual_share_cancelled','virtual_share_failed',
          'virtual_game_started','virtual_game_completed','virtual_game_lost','virtual_mission_start','virtual_pill_found','virtual_scene_started','virtual_scene_completed',
          'virtual_prep_fortune_open','virtual_prep_fortune_reveal','virtual_prep_fortune_share','virtual_prep_fortune_cta_booking'
        ])
      )
  ),
  debug AS (
    SELECT jsonb_build_object(
      'status', 'success',
      'querySource', 'public.analytics_events via public.get_virtual_admin_analytics RPC',
      'from', p_from,
      'to', p_to,
      'recordCount', COUNT(*),
      'latestEventAt', MAX(created_at),
      'eventTypes', COALESCE((SELECT jsonb_object_agg(event_type, rows ORDER BY event_type) FROM (SELECT event_type, COUNT(*) AS rows FROM base GROUP BY event_type) t), '{}'::jsonb),
      'sample', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC) FROM (SELECT event_type, slug, metric, metadata, anonymous_id, session_id, created_at FROM base ORDER BY created_at DESC LIMIT 5) s), '[]'::jsonb)
    ) AS value
    FROM base
  ),
  totals AS (
    SELECT jsonb_build_object(
      'views', COUNT(*) FILTER (WHERE metric = 'view'),
      'starts', COUNT(*) FILTER (WHERE metric = 'start'),
      'completes', COUNT(*) FILTER (WHERE metric = 'complete'),
      'ctaClicks', COUNT(*) FILTER (WHERE metric = 'cta'),
      'shareImpressions', COUNT(*) FILTER (WHERE metric = 'share_impression'),
      'shares', COUNT(*) FILTER (WHERE metric = 'share'),
      'downloads', COUNT(*) FILTER (WHERE metric = 'download'),
      'replays', COUNT(*) FILTER (WHERE event_type = 'virtual_story_replayed'),
      'uniqueVisitors', COUNT(DISTINCT COALESCE(anonymous_id, session_id))
    ) AS value
    FROM base
  ),
  event_counts AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('eventType', event_type, 'count', rows, 'latest', latest) ORDER BY rows DESC, event_type), '[]'::jsonb) AS value
    FROM (
      SELECT event_type, COUNT(*) AS rows, MAX(created_at) AS latest
      FROM base
      GROUP BY event_type
    ) t
  ),
  episodes AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY starts DESC, slug), '[]'::jsonb) AS value
    FROM (
      SELECT
        slug,
        COUNT(*) FILTER (WHERE metric = 'view') AS views,
        COUNT(*) FILTER (WHERE metric = 'start') AS starts,
        COUNT(*) FILTER (WHERE metric = 'complete') AS completes,
        COUNT(*) FILTER (WHERE metric = 'cta') AS cta_clicks,
        COUNT(*) FILTER (WHERE metric = 'share_impression') AS share_impressions,
        COUNT(*) FILTER (WHERE metric = 'share') AS shares,
        COUNT(*) FILTER (WHERE metric = 'download') AS downloads,
        COUNT(DISTINCT COALESCE(anonymous_id, session_id)) AS unique_visitors,
        MAX(created_at) AS last_activity
      FROM base
      WHERE slug <> 'unknown'
      GROUP BY slug
    ) t
  ),
  monthly AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY month), '[]'::jsonb) AS value
    FROM (
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COUNT(*) FILTER (WHERE metric = 'start') AS starts,
        COUNT(*) FILTER (WHERE metric = 'complete') AS completions
      FROM base
      GROUP BY 1
      ORDER BY 1
    ) t
  ),
  ctas AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY value DESC, name), '[]'::jsonb) AS value
    FROM (
      SELECT COALESCE(metadata->>'cta_target', metadata->>'target', metadata->>'target_route', metadata->>'choice_text', event_type) AS name, COUNT(*) AS value
      FROM base
      WHERE metric = 'cta'
      GROUP BY 1
    ) t
  ),
  path_dist AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY value DESC, name), '[]'::jsonb) AS value
    FROM (
      SELECT COALESCE(metadata->>'path_selected', metadata->>'path', metadata->>'result_type', slug, 'unknown') AS name, COUNT(*) AS value
      FROM base
      WHERE metric = 'complete'
      GROUP BY 1
    ) t
  ),
  result_dist AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY value DESC, name), '[]'::jsonb) AS value
    FROM (
      SELECT COALESCE(metadata->>'result_type', metadata->>'result_label', slug, 'unknown') AS name, COUNT(*) AS value
      FROM base
      WHERE metric = 'complete'
      GROUP BY 1
    ) t
  ),
  scene_dropoff AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY count DESC, scene), '[]'::jsonb) AS value
    FROM (
      SELECT COALESCE(metadata->>'scene_id', metadata->>'scene', event_type) AS scene, COUNT(*) AS count
      FROM base
      WHERE event_type IN ('virtual_story_scene_viewed','virtual_story_choice_selected','virtual_scene_started','virtual_scene_completed','virtual_pill_found')
      GROUP BY 1
    ) t
  ),
  top_sources AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY count DESC, name), '[]'::jsonb) AS value
    FROM (
      SELECT COALESCE(metadata->>'source', 'unknown') AS name, COUNT(*) AS count
      FROM base
      GROUP BY 1
    ) t
  )
  SELECT jsonb_build_object(
    'debug', debug.value,
    'totals', totals.value,
    'eventCounts', event_counts.value,
    'episodes', episodes.value,
    'monthlyTrend', monthly.value,
    'ctaClicks', ctas.value,
    'pathDistribution', path_dist.value,
    'resultDistribution', result_dist.value,
    'sceneDropoff', scene_dropoff.value,
    'topSources', top_sources.value
  ) INTO result
  FROM debug, totals, event_counts, episodes, monthly, ctas, path_dist, result_dist, scene_dropoff, top_sources;

  RETURN result;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_analytics_events_virtual_created_at
ON public.analytics_events (created_at DESC, event_type)
WHERE event_type = ANY (ARRAY[
  'virtual_episode_view','virtual_episode_start','virtual_episode_complete',
  'virtual_story_started','virtual_story_completed','virtual_story_scene_viewed','virtual_story_choice_selected','virtual_story_cta_clicked','virtual_story_knowledge_opened','virtual_story_replayed',
  'virtual_cta_click','virtual_cta_booking','virtual_cta_selftest','virtual_cta_support','virtual_cta_booking_click',
  'virtual_share_impression','virtual_result_share','virtual_result_download',
  'virtual_share_click','virtual_share_native','virtual_share_copy','virtual_share_download','virtual_share_native_textonly','virtual_share_cancelled','virtual_share_failed',
  'virtual_game_started','virtual_game_completed','virtual_game_lost','virtual_mission_start','virtual_pill_found','virtual_scene_started','virtual_scene_completed',
  'virtual_prep_fortune_open','virtual_prep_fortune_reveal','virtual_prep_fortune_share','virtual_prep_fortune_cta_booking'
]);
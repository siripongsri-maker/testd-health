CREATE OR REPLACE FUNCTION public.backfill_analytics_daily_rollup(p_from date, p_to date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d date := p_from;
  n integer := 0;
BEGIN
  WHILE d <= p_to LOOP
    WITH scoped AS (
      SELECT session_id, event_type, page_path, device_type, session_duration_seconds
      FROM public.analytics_events
      WHERE created_at >= (d::timestamp AT TIME ZONE 'Asia/Bangkok')
        AND created_at <  ((d + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')
    )
    INSERT INTO public.analytics_daily_rollup
      (day, visitors, pageviews, duration_sum, duration_count, pages, devices, event_counts, updated_at)
    SELECT
      d,
      (SELECT count(DISTINCT session_id) FROM scoped),
      (SELECT count(*) FROM scoped WHERE event_type = 'pageview'),
      (SELECT coalesce(sum(session_duration_seconds), 0) FROM scoped WHERE event_type = 'session_end' AND session_duration_seconds IS NOT NULL),
      (SELECT count(*) FROM scoped WHERE event_type = 'session_end' AND session_duration_seconds IS NOT NULL),
      coalesce((SELECT jsonb_object_agg(page_path, c) FROM (
        SELECT page_path, count(*) c FROM scoped WHERE event_type = 'pageview' AND page_path IS NOT NULL
        GROUP BY page_path ORDER BY 2 DESC LIMIT 50) t), '{}'::jsonb),
      coalesce((SELECT jsonb_object_agg(dev, c) FROM (
        SELECT coalesce(device_type, 'unknown') dev, count(*) c FROM scoped GROUP BY 1) t2), '{}'::jsonb),
      coalesce((SELECT jsonb_object_agg(event_type, c) FROM (
        SELECT event_type, count(*) c FROM scoped WHERE event_type IS NOT NULL GROUP BY 1) t3), '{}'::jsonb),
      now()
    ON CONFLICT (day) DO UPDATE SET
      visitors = EXCLUDED.visitors,
      pageviews = EXCLUDED.pageviews,
      duration_sum = EXCLUDED.duration_sum,
      duration_count = EXCLUDED.duration_count,
      pages = EXCLUDED.pages,
      devices = EXCLUDED.devices,
      event_counts = EXCLUDED.event_counts,
      updated_at = now();
    d := d + 1;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_analytics_daily_rollup(date, date) FROM public, anon, authenticated;
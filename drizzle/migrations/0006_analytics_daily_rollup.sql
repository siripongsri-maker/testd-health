CREATE TABLE IF NOT EXISTS public.analytics_daily_rollup (
  day date PRIMARY KEY,
  visitors integer NOT NULL DEFAULT 0,
  pageviews integer NOT NULL DEFAULT 0,
  duration_sum bigint NOT NULL DEFAULT 0,
  duration_count integer NOT NULL DEFAULT 0,
  pages jsonb NOT NULL DEFAULT '{}'::jsonb,
  devices jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.analytics_daily_rollup TO authenticated;
GRANT ALL ON public.analytics_daily_rollup TO service_role;
ALTER TABLE public.analytics_daily_rollup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read analytics rollup"
  ON public.analytics_daily_rollup FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.has_role(auth.uid(), 'me_analyst'::app_role)
  );

CREATE OR REPLACE FUNCTION public.refresh_analytics_daily_rollup(p_days integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d date;
  v_start date := (now() AT TIME ZONE 'Asia/Bangkok')::date - p_days;
  v_end date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
BEGIN
  d := v_start;
  WHILE d <= v_end LOOP
    WITH scoped AS (
      SELECT session_id, event_type, page_path, device_type, session_duration_seconds
      FROM public.analytics_events
      WHERE created_at >= (d::timestamp AT TIME ZONE 'Asia/Bangkok')
        AND created_at <  ((d + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')
    )
    INSERT INTO public.analytics_daily_rollup AS r
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
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_analytics_daily_rollup(integer) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_start timestamptz, p_end timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH scoped AS (
    SELECT * FROM public.analytics_daily_rollup
    WHERE day >= (p_start AT TIME ZONE 'Asia/Bangkok')::date
      AND day <= (p_end AT TIME ZONE 'Asia/Bangkok')::date
  ),
  pages AS (
    SELECT key AS page_path, sum(value::bigint) AS views
    FROM scoped, jsonb_each_text(scoped.pages)
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  devices AS (
    SELECT key AS device_type, sum(value::bigint) AS count
    FROM scoped, jsonb_each_text(scoped.devices)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'daily', coalesce((SELECT jsonb_agg(jsonb_build_object('date', day, 'visitors', visitors, 'pageviews', pageviews) ORDER BY day) FROM scoped), '[]'::jsonb),
    'pages', coalesce((SELECT jsonb_agg(jsonb_build_object('page_path', page_path, 'views', views)) FROM pages), '[]'::jsonb),
    'devices', coalesce((SELECT jsonb_agg(jsonb_build_object('device_type', device_type, 'count', count)) FROM devices), '[]'::jsonb),
    'totals', (SELECT jsonb_build_object(
        'visitors', coalesce(sum(visitors), 0),
        'pageviews', coalesce(sum(pageviews), 0),
        'uniqueSessions', coalesce(sum(visitors), 0),
        'avgSessionDuration', CASE WHEN coalesce(sum(duration_count), 0) > 0
          THEN round(sum(duration_sum)::numeric / sum(duration_count)) ELSE 0 END
      ) FROM scoped)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_event_type_counts(p_start timestamptz, p_event_types text[])
RETURNS TABLE(event_type text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT key AS event_type, sum(value::bigint) AS count
  FROM public.analytics_daily_rollup r, jsonb_each_text(r.event_counts)
  WHERE r.day >= (p_start AT TIME ZONE 'Asia/Bangkok')::date
    AND key = ANY(p_event_types)
  GROUP BY key;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_overview(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_type_counts(timestamptz, text[]) TO authenticated, service_role;

SELECT cron.schedule('refresh-analytics-daily-rollup', '35 * * * *', $$SELECT public.refresh_analytics_daily_rollup(2);$$);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_created_at
  ON public.analytics_events (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_start timestamptz, p_end timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH scoped AS (
    SELECT created_at, session_id, event_type, page_path, device_type, session_duration_seconds
    FROM public.analytics_events
    WHERE created_at >= p_start AND created_at <= p_end
  ),
  daily AS (
    SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
           count(DISTINCT session_id) AS visitors,
           count(*) FILTER (WHERE event_type = 'pageview') AS pageviews
    FROM scoped GROUP BY 1
  ),
  pages AS (
    SELECT page_path, count(*) AS views
    FROM scoped
    WHERE event_type = 'pageview' AND page_path IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  devices AS (
    SELECT coalesce(device_type, 'unknown') AS device_type, count(*) AS count
    FROM scoped GROUP BY 1
  ),
  totals AS (
    SELECT count(DISTINCT session_id) AS visitors,
           count(*) FILTER (WHERE event_type = 'pageview') AS pageviews,
           coalesce(round(avg(session_duration_seconds) FILTER (
             WHERE event_type = 'session_end' AND session_duration_seconds IS NOT NULL
           )), 0) AS avg_session_duration
    FROM scoped
  )
  SELECT jsonb_build_object(
    'daily', coalesce((SELECT jsonb_agg(jsonb_build_object('date', day, 'visitors', visitors, 'pageviews', pageviews) ORDER BY day) FROM daily), '[]'::jsonb),
    'pages', coalesce((SELECT jsonb_agg(jsonb_build_object('page_path', page_path, 'views', views)) FROM pages), '[]'::jsonb),
    'devices', coalesce((SELECT jsonb_agg(jsonb_build_object('device_type', device_type, 'count', count)) FROM devices), '[]'::jsonb),
    'totals', (SELECT jsonb_build_object('visitors', visitors, 'pageviews', pageviews, 'uniqueSessions', visitors, 'avgSessionDuration', avg_session_duration) FROM totals)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_event_type_counts(p_start timestamptz, p_event_types text[])
RETURNS TABLE(event_type text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ae.event_type, count(*)::bigint
  FROM public.analytics_events ae
  WHERE ae.created_at >= p_start
    AND ae.event_type = ANY(p_event_types)
  GROUP BY ae.event_type;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_overview(timestamptz, timestamptz) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_event_type_counts(timestamptz, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_analytics_overview(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_type_counts(timestamptz, text[]) TO authenticated, service_role;
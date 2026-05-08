CREATE OR REPLACE FUNCTION public.get_virtual_share_stats(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now()
)
RETURNS TABLE (
  slug text,
  title text,
  share_clicks bigint,
  native_shares bigint,
  copies bigint,
  cancelled bigint,
  failed bigint,
  total_success bigint,
  last_shared_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (metadata->>'slug')::text AS slug,
    MAX((metadata->>'title')::text) AS title,
    COUNT(*) FILTER (WHERE event_type = 'virtual_share_click') AS share_clicks,
    COUNT(*) FILTER (WHERE event_type = 'virtual_share_native') AS native_shares,
    COUNT(*) FILTER (WHERE event_type = 'virtual_share_copy') AS copies,
    COUNT(*) FILTER (WHERE event_type = 'virtual_share_cancelled') AS cancelled,
    COUNT(*) FILTER (WHERE event_type = 'virtual_share_failed') AS failed,
    COUNT(*) FILTER (WHERE event_type IN ('virtual_share_native','virtual_share_copy')) AS total_success,
    MAX(created_at) AS last_shared_at
  FROM public.analytics_events
  WHERE event_type IN (
    'virtual_share_click','virtual_share_native','virtual_share_copy',
    'virtual_share_cancelled','virtual_share_failed'
  )
    AND metadata ? 'slug'
    AND created_at >= p_from
    AND created_at <= p_to
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'me_analyst'::app_role)
    )
  GROUP BY (metadata->>'slug')::text
  ORDER BY total_success DESC;
$$;

REVOKE ALL ON FUNCTION public.get_virtual_share_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_virtual_share_stats(timestamptz, timestamptz) TO authenticated;
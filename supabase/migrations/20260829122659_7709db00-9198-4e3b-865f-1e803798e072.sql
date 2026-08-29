CREATE OR REPLACE FUNCTION public.get_chemsex_card_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  v_result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'me_analyst')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH base AS (
    SELECT
      e.event_type,
      e.created_at,
      coalesce(e.metadata->>'card_slug', 'unknown') AS card_slug,
      coalesce(e.metadata->>'card_title', '') AS card_title,
      coalesce((e.metadata->>'card_number')::int, 0) AS card_number,
      coalesce(e.metadata->>'card_group', '') AS card_group,
      coalesce(e.metadata->>'entry_source', 'direct') AS entry_source,
      coalesce(nullif(e.metadata->>'campaign', ''), nullif(e.campaign, ''), '(none)') AS campaign,
      nullif(e.metadata->>'service', '') AS service,
      nullif(e.metadata->>'service_label', '') AS service_label,
      nullif(e.metadata->>'target_path', '') AS target_path,
      coalesce(e.metadata->>'placement', 'card_back') AS placement
    FROM public.analytics_events e
    WHERE e.created_at >= v_since
      AND e.event_type IN ('chemsex_card_view','chemsex_card_qr_scan','chemsex_card_service_open','chemsex_card_artwork_zoom')
  )
  SELECT jsonb_build_object(
    'since', v_since,
    'totals', (
      SELECT jsonb_build_object(
        'views', count(*) FILTER (WHERE event_type = 'chemsex_card_view'),
        'qr_scans', count(*) FILTER (WHERE event_type = 'chemsex_card_qr_scan'),
        'service_opens', count(*) FILTER (WHERE event_type = 'chemsex_card_service_open'),
        'zooms', count(*) FILTER (WHERE event_type = 'chemsex_card_artwork_zoom')
      ) FROM base
    ),
    'by_card', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'service_opens')::int DESC, (x->>'views')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'card_slug', card_slug,
          'card_title', max(card_title),
          'card_number', max(card_number),
          'card_group', max(card_group),
          'views', count(*) FILTER (WHERE event_type = 'chemsex_card_view'),
          'qr_scans', count(*) FILTER (WHERE event_type = 'chemsex_card_qr_scan'),
          'service_opens', count(*) FILTER (WHERE event_type = 'chemsex_card_service_open'),
          'zooms', count(*) FILTER (WHERE event_type = 'chemsex_card_artwork_zoom')
        ) AS x
        FROM base GROUP BY card_slug
      ) s
    ), '[]'::jsonb),
    'by_entry_source', coalesce((
      SELECT jsonb_agg(x)
      FROM (
        SELECT jsonb_build_object(
          'entry_source', entry_source,
          'views', count(*) FILTER (WHERE event_type = 'chemsex_card_view'),
          'qr_scans', count(*) FILTER (WHERE event_type = 'chemsex_card_qr_scan'),
          'service_opens', count(*) FILTER (WHERE event_type = 'chemsex_card_service_open')
        ) AS x
        FROM base GROUP BY entry_source
      ) s
    ), '[]'::jsonb),
    'by_campaign', coalesce((
      SELECT jsonb_agg(x)
      FROM (
        SELECT jsonb_build_object(
          'campaign', campaign,
          'views', count(*) FILTER (WHERE event_type = 'chemsex_card_view'),
          'qr_scans', count(*) FILTER (WHERE event_type = 'chemsex_card_qr_scan'),
          'service_opens', count(*) FILTER (WHERE event_type = 'chemsex_card_service_open')
        ) AS x
        FROM base GROUP BY campaign
      ) s
    ), '[]'::jsonb),
    'by_service', coalesce((
      SELECT jsonb_agg(x)
      FROM (
        SELECT jsonb_build_object(
          'service', service,
          'service_label', max(service_label),
          'target_path', max(target_path),
          'opens', count(*)
        ) AS x
        FROM base WHERE event_type = 'chemsex_card_service_open' AND service IS NOT NULL
        GROUP BY service
      ) s
    ), '[]'::jsonb),
    'card_service_matrix', coalesce((
      SELECT jsonb_agg(x)
      FROM (
        SELECT jsonb_build_object(
          'card_slug', card_slug,
          'card_title', max(card_title),
          'card_number', max(card_number),
          'service', service,
          'service_label', max(service_label),
          'entry_source', entry_source,
          'campaign', campaign,
          'placement', placement,
          'opens', count(*)
        ) AS x
        FROM base WHERE event_type = 'chemsex_card_service_open' AND service IS NOT NULL
        GROUP BY card_slug, service, entry_source, campaign, placement
      ) s
    ), '[]'::jsonb),
    'daily', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'day')
      FROM (
        SELECT jsonb_build_object(
          'day', to_char((created_at AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM-DD'),
          'views', count(*) FILTER (WHERE event_type = 'chemsex_card_view'),
          'qr_scans', count(*) FILTER (WHERE event_type = 'chemsex_card_qr_scan'),
          'service_opens', count(*) FILTER (WHERE event_type = 'chemsex_card_service_open')
        ) AS x
        FROM base GROUP BY (created_at AT TIME ZONE 'Asia/Bangkok')::date
      ) s
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chemsex_card_analytics(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_chemsex_card_analytics(integer) TO authenticated;
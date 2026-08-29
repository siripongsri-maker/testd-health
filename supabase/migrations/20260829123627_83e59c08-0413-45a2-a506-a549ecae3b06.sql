CREATE OR REPLACE FUNCTION public.get_chemsex_card_events_export(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'me_analyst')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(x ORDER BY x->>'day', (x->>'events')::int DESC)
    FROM (
      SELECT jsonb_build_object(
        'day', to_char(e.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD'),
        'event_type', e.event_type,
        'card_number', coalesce((e.metadata->>'card_number')::int, 0),
        'card_slug', coalesce(e.metadata->>'card_slug', 'unknown'),
        'card_title', coalesce(e.metadata->>'card_title', ''),
        'card_group', coalesce(e.metadata->>'card_group', ''),
        'service', coalesce(nullif(e.metadata->>'service', ''), ''),
        'service_label', coalesce(nullif(e.metadata->>'service_label', ''), ''),
        'target_path', coalesce(nullif(e.metadata->>'target_path', ''), ''),
        'entry_source', coalesce(e.metadata->>'entry_source', 'direct'),
        'utm_campaign', coalesce(nullif(e.metadata->>'campaign', ''), nullif(e.campaign, ''), '(none)'),
        'placement', coalesce(e.metadata->>'placement', ''),
        'events', count(*)
      ) AS x
      FROM public.analytics_events e
      WHERE e.created_at >= v_since
        AND e.event_type IN ('chemsex_card_view','chemsex_card_qr_scan','chemsex_card_service_open','chemsex_card_artwork_zoom')
      GROUP BY
        to_char(e.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD'),
        e.event_type,
        coalesce((e.metadata->>'card_number')::int, 0),
        coalesce(e.metadata->>'card_slug', 'unknown'),
        coalesce(e.metadata->>'card_title', ''),
        coalesce(e.metadata->>'card_group', ''),
        coalesce(nullif(e.metadata->>'service', ''), ''),
        coalesce(nullif(e.metadata->>'service_label', ''), ''),
        coalesce(nullif(e.metadata->>'target_path', ''), ''),
        coalesce(e.metadata->>'entry_source', 'direct'),
        coalesce(nullif(e.metadata->>'campaign', ''), nullif(e.campaign, ''), '(none)'),
        coalesce(e.metadata->>'placement', '')
    ) s
  ), '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_chemsex_card_events_export(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_chemsex_card_events_export(integer) FROM anon, public;
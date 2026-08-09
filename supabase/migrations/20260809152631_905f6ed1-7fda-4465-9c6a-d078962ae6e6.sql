CREATE OR REPLACE FUNCTION public.get_language_analytics(p_start date DEFAULT (now() - interval '90 days')::date, p_end date DEFAULT now()::date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_online jsonb;
  v_clinic jsonb;
  v_total_online bigint;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'me_analyst'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH ev AS (
    SELECT
      coalesce(nullif(anonymous_id,''), session_id, id::text) AS visitor,
      event_type,
      nullif(coalesce(nullif(metadata->>'language',''), substring(page_path from '^/([a-z]{2})(?:/|$)')), 'go') AS lang
    FROM analytics_events
    WHERE created_at >= p_start::timestamptz
      AND created_at < (p_end + 1)::timestamptz
  ), visitor_lang AS (
    SELECT visitor, coalesce(max(lang), 'th') AS lang
    FROM ev GROUP BY visitor
  ), joined AS (
    SELECT vl.lang, ev.visitor, ev.event_type
    FROM ev JOIN visitor_lang vl USING (visitor)
  ), agg AS (
    SELECT
      lang,
      count(*) AS events,
      count(DISTINCT visitor) AS reach,
      count(DISTINCT visitor) FILTER (WHERE event_type NOT IN ('pageview','session_end')) AS engaged,
      count(DISTINCT visitor) FILTER (WHERE event_type IN ('booking_started','selftest_started','lean_flow_entered','prevention_match_started')) AS intent,
      count(DISTINCT visitor) FILTER (WHERE event_type IN ('booking_submitted','selftest_submitted','lean_result_submitted')) AS converted
    FROM joined GROUP BY lang
  )
  SELECT coalesce(jsonb_agg(to_jsonb(agg) ORDER BY agg.reach DESC), '[]'::jsonb), coalesce(sum(agg.reach),0)
  INTO v_online, v_total_online FROM agg;

  WITH src AS (
    SELECT lower(coalesce(nullif(language,''),'th')) AS lang, 'pre_service_survey' AS source
      FROM appointment_pre_service_surveys
     WHERE created_at >= p_start::timestamptz AND created_at < (p_end + 1)::timestamptz
    UNION ALL
    SELECT lower(coalesce(nullif(preferred_language,''),'th')), 'walkin'
      FROM clinic_walkins
     WHERE created_at >= p_start::timestamptz AND created_at < (p_end + 1)::timestamptz
    UNION ALL
    SELECT lower(coalesce(nullif(language,''),'th')), 'feedback'
      FROM client_feedback_responses
     WHERE created_at >= p_start::timestamptz AND created_at < (p_end + 1)::timestamptz
    UNION ALL
    SELECT lower(coalesce(nullif(language,''),'th')), 'profile'
      FROM profiles
     WHERE created_at >= p_start::timestamptz AND created_at < (p_end + 1)::timestamptz
  ), cagg AS (
    SELECT lang, source, count(*) AS total FROM src GROUP BY lang, source
  )
  SELECT coalesce(jsonb_agg(to_jsonb(cagg) ORDER BY cagg.total DESC), '[]'::jsonb) INTO v_clinic FROM cagg;

  RETURN jsonb_build_object(
    'start', p_start,
    'end', p_end,
    'total_online_visitors', v_total_online,
    'online', v_online,
    'clinic', v_clinic
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_language_analytics(date, date) TO authenticated;
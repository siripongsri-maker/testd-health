CREATE OR REPLACE FUNCTION public.get_pre_service_question_stats(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_branch_ids uuid[] DEFAULT NULL::uuid[], p_channels text[] DEFAULT NULL::text[], p_risk text DEFAULT 'all'::text, p_anon text DEFAULT 'all'::text, p_visit text DEFAULT 'all'::text)
 RETURNS TABLE(question_key text, label_th text, label_en text, answer_type text, group_key text, display_order integer, collected_from timestamp with time zone, collected_to timestamp with time zone, total_responses bigint, answered bigint, skipped bigint, skip_rate numeric, distribution jsonb, mean_value numeric, median_value numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.pre_service_can_analyze() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM public.pre_service_survey_base b
    WHERE (p_from IS NULL OR b.created_at >= p_from)
      AND (p_to IS NULL OR b.created_at < p_to)
      AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND (p_channels IS NULL OR b.channel = ANY(p_channels))
      AND (p_risk = 'all' OR b.risk_level = p_risk)
      AND (p_anon = 'all' OR (p_anon = 'anon' AND b.is_anonymous) OR (p_anon = 'user' AND NOT b.is_anonymous))
      AND (p_visit = 'all' OR (p_visit = 'first' AND b.visit_sequence <= 1) OR (p_visit = 'repeat' AND b.visit_sequence > 1))
  ),
  total AS (SELECT count(*)::bigint AS n FROM filtered),
  long AS (
    SELECT r.question_key,
           CASE
             WHEN r.json_column = 'knowledge' THEN f.knowledge ->> r.question_key
             WHEN r.json_column = 'behavior'  THEN f.behavior  ->> r.question_key
             WHEN r.question_key = 'confidence' THEN f.confidence::text
             WHEN r.question_key = 'safety' THEN f.safety::text
             WHEN r.question_key = 'recommend' THEN f.recommend
             WHEN r.question_key = 'mental_health_interest' THEN f.mental_health_interest
             WHEN r.question_key = 'suggestions' THEN nullif(btrim(coalesce(f.suggestions,'')), '')
           END AS answer_value,
           CASE
             WHEN r.answer_type = 'scale' AND r.question_key = 'confidence' THEN f.confidence::numeric
             WHEN r.answer_type = 'scale' AND r.question_key = 'safety' THEN f.safety::numeric
           END AS num_value
    FROM public.survey_question_registry r
    CROSS JOIN filtered f
    WHERE r.source_table = 'appointment_pre_service_surveys'
  ),
  agg AS (
    SELECT l.question_key,
           count(*) FILTER (WHERE l.answer_value IS NOT NULL)::bigint AS answered,
           count(*) FILTER (WHERE l.answer_value IS NULL)::bigint AS skipped,
           avg(l.num_value) AS mean_value,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY l.num_value))::numeric AS median_value
    FROM long l GROUP BY l.question_key
  ),
  dist AS (
    SELECT d.question_key, jsonb_object_agg(d.answer_value, d.c) AS distribution
    FROM (
      SELECT l.question_key, l.answer_value, count(*)::int AS c
      FROM long l
      JOIN public.survey_question_registry r
        ON r.question_key = l.question_key AND r.answer_type <> 'text'
      WHERE l.answer_value IS NOT NULL
      GROUP BY 1, 2
    ) d
    GROUP BY d.question_key
  )
  SELECT r.question_key, r.label_th, r.label_en, r.answer_type, r.group_key, r.display_order,
         r.collected_from, r.collected_to,
         (SELECT n FROM total),
         coalesce(a.answered, 0),
         coalesce(a.skipped, 0),
         CASE WHEN coalesce(a.answered,0) + coalesce(a.skipped,0) = 0 THEN 0
              ELSE round(100.0 * a.skipped / (a.answered + a.skipped), 1) END,
         coalesce(dd.distribution, '{}'::jsonb),
         round(a.mean_value, 2),
         round(a.median_value, 2)
  FROM public.survey_question_registry r
  LEFT JOIN agg a ON a.question_key = r.question_key
  LEFT JOIN dist dd ON dd.question_key = r.question_key
  WHERE r.source_table = 'appointment_pre_service_surveys'
  ORDER BY r.display_order;
END;
$function$;
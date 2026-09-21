CREATE OR REPLACE FUNCTION public.get_client_service_history_stats(
  _branch uuid DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL
)
RETURNS TABLE (
  clients bigint,
  visits bigint,
  returning_clients bigint,
  awaiting_evaluation bigint,
  evaluated bigint,
  in_counseling bigint,
  survey_only bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_client_history() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH full_rows AS (
    SELECT ps.uic_hash AS h,
           MAX(CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END) AS has_eval,
           MAX(CASE WHEN n.counseling_completed_at IS NOT NULL
                      OR n.status IN ('counseling_completed','case_closed') THEN 1 ELSE 0 END) AS counseled,
           MAX(CASE WHEN n.id IS NOT NULL AND n.status <> 'not_reviewed' THEN 1 ELSE 0 END) AS reviewed,
           COUNT(*) AS v
    FROM appointment_pre_service_surveys ps
    LEFT JOIN appointments a ON a.id = ps.booking_id
    LEFT JOIN pre_service_counseling_notes n ON n.survey_id = ps.id
    LEFT JOIN post_counseling_evaluations e ON e.survey_id = ps.id
    WHERE ps.uic_hash IS NOT NULL
      AND (_from IS NULL OR ps.created_at >= _from::timestamptz)
      AND (_to IS NULL OR ps.created_at < (_to + 1)::timestamptz)
      AND (_branch IS NULL OR a.branch_id = _branch)
    GROUP BY ps.uic_hash
  )
  SELECT COUNT(*),
         COALESCE(SUM(v), 0),
         COUNT(*) FILTER (WHERE v > 1),
         COUNT(*) FILTER (WHERE counseled = 1 AND has_eval = 0),
         COUNT(*) FILTER (WHERE has_eval = 1),
         COUNT(*) FILTER (WHERE counseled = 0 AND reviewed = 1),
         COUNT(*) FILTER (WHERE counseled = 0 AND reviewed = 0)
  FROM full_rows;
END;
$$;
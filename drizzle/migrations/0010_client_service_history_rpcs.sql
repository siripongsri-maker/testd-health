-- Client service history (all clients since service start) for the Daily Ops workspace.

CREATE OR REPLACE FUNCTION public.can_view_client_history()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'counselor')
    OR public.has_role(auth.uid(), 'me_analyst')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_client_service_history(
  _search text DEFAULT NULL,
  _branch uuid DEFAULT NULL,
  _stage text DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  uic_hash text,
  uic_display text,
  visits int,
  first_visit timestamptz,
  last_visit timestamptz,
  last_branch_id uuid,
  last_branch_name_th text,
  last_branch_name_en text,
  appointments_count int,
  completed_visits int,
  note_status text,
  counseling_completed_at timestamptz,
  evaluations int,
  last_evaluation_at timestamptz,
  mel_events int,
  claim_status text,
  stage text,
  total_count bigint
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
  WITH s AS (
    SELECT ps.id AS survey_id,
           ps.uic_hash AS h,
           ps.uic_display,
           ps.created_at,
           ps.booking_id,
           a.branch_id,
           a.status AS appt_status
    FROM appointment_pre_service_surveys ps
    LEFT JOIN appointments a ON a.id = ps.booking_id
    WHERE ps.uic_hash IS NOT NULL
      AND (_from IS NULL OR ps.created_at >= _from::timestamptz)
      AND (_to IS NULL OR ps.created_at < (_to + 1)::timestamptz)
  ),
  agg AS (
    SELECT s.h,
           (ARRAY_AGG(s.uic_display ORDER BY s.created_at DESC))[1] AS uic_display,
           COUNT(*)::int AS visits,
           MIN(s.created_at) AS first_visit,
           MAX(s.created_at) AS last_visit,
           (ARRAY_AGG(s.branch_id ORDER BY s.created_at DESC))[1] AS last_branch_id,
           COUNT(s.booking_id)::int AS appointments_count,
           COUNT(*) FILTER (WHERE s.appt_status IN ('completed','checked_out'))::int AS completed_visits,
           (ARRAY_AGG(n.status ORDER BY s.created_at DESC))[1] AS note_status,
           MAX(n.counseling_completed_at) AS counseling_completed_at,
           COUNT(e.id)::int AS evaluations,
           MAX(e.evaluation_submitted_at) AS last_evaluation_at,
           COUNT(DISTINCT se.id)::int AS mel_events,
           (ARRAY_AGG(c.status ORDER BY c.created_at DESC NULLS LAST))[1] AS claim_status,
           BOOL_OR(_branch IS NULL OR s.branch_id = _branch) AS branch_match
    FROM s
    LEFT JOIN pre_service_counseling_notes n ON n.survey_id = s.survey_id
    LEFT JOIN post_counseling_evaluations e ON e.survey_id = s.survey_id
    LEFT JOIN service_events se ON se.appointment_id = s.booking_id
    LEFT JOIN counseling_payout_claims c ON c.note_id = n.id
    GROUP BY s.h
  ),
  staged AS (
    SELECT agg.*,
      CASE
        WHEN agg.claim_status = 'paid' THEN 'paid'
        WHEN agg.evaluations > 0 THEN 'evaluated'
        WHEN agg.counseling_completed_at IS NOT NULL
          OR agg.note_status IN ('counseling_completed','case_closed') THEN 'awaiting_evaluation'
        WHEN agg.note_status IS NOT NULL AND agg.note_status <> 'not_reviewed' THEN 'in_counseling'
        ELSE 'survey_only'
      END AS stage
    FROM agg
  ),
  filtered AS (
    SELECT * FROM staged
    WHERE branch_match
      AND (_stage IS NULL OR _stage = 'all' OR stage = _stage)
      AND (
        _search IS NULL OR _search = ''
        OR uic_display ILIKE '%' || _search || '%'
        OR h ILIKE _search || '%'
      )
  )
  SELECT f.h, f.uic_display, f.visits, f.first_visit, f.last_visit,
         f.last_branch_id, b.name_th, b.name_en,
         f.appointments_count, f.completed_visits, f.note_status,
         f.counseling_completed_at, f.evaluations, f.last_evaluation_at,
         f.mel_events, f.claim_status, f.stage,
         (SELECT COUNT(*) FROM filtered) AS total_count
  FROM filtered f
  LEFT JOIN booking_branches b ON b.id = f.last_branch_id
  ORDER BY f.last_visit DESC
  LIMIT GREATEST(1, LEAST(_limit, 200)) OFFSET GREATEST(0, _offset);
END;
$$;

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
  WITH rows AS (
    SELECT * FROM public.get_client_service_history(NULL, _branch, NULL, _from, _to, 200, 0)
  ),
  full_rows AS (
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

CREATE OR REPLACE FUNCTION public.get_client_visit_timeline(_uic_hash text)
RETURNS TABLE (
  survey_id uuid,
  survey_at timestamptz,
  uic_display text,
  branch_id uuid,
  branch_name_th text,
  branch_name_en text,
  appointment_id uuid,
  appointment_date date,
  appointment_status text,
  note_id uuid,
  note_status text,
  counseling_completed_at timestamptz,
  post_eval_token uuid,
  evaluation_submitted_at timestamptz,
  satisfaction_score smallint,
  mel_event_count int,
  claim_status text
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
  SELECT ps.id, ps.created_at, ps.uic_display,
         a.branch_id, b.name_th, b.name_en,
         a.id, a.appointment_date, a.status,
         n.id, n.status, n.counseling_completed_at, n.post_eval_token,
         e.evaluation_submitted_at, e.satisfaction_score,
         (SELECT COUNT(*)::int FROM service_events se WHERE se.appointment_id = a.id),
         c.status
  FROM appointment_pre_service_surveys ps
  LEFT JOIN appointments a ON a.id = ps.booking_id
  LEFT JOIN booking_branches b ON b.id = a.branch_id
  LEFT JOIN pre_service_counseling_notes n ON n.survey_id = ps.id
  LEFT JOIN post_counseling_evaluations e ON e.survey_id = ps.id
  LEFT JOIN counseling_payout_claims c ON c.note_id = n.id
  WHERE ps.uic_hash = _uic_hash
  ORDER BY ps.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_client_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_service_history(text, uuid, text, date, date, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_service_history_stats(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_visit_timeline(text) TO authenticated;
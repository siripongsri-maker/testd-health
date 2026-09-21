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
#variable_conflict use_column
BEGIN
  IF NOT public.can_view_client_history() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT ps.id AS survey_id,
           ps.uic_hash AS h,
           ps.uic_display AS disp,
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
           (ARRAY_AGG(s.disp ORDER BY s.created_at DESC))[1] AS disp,
           COUNT(*)::int AS v_count,
           MIN(s.created_at) AS v_first,
           MAX(s.created_at) AS v_last,
           (ARRAY_AGG(s.branch_id ORDER BY s.created_at DESC))[1] AS b_id,
           COUNT(s.booking_id)::int AS appt_count,
           COUNT(*) FILTER (WHERE s.appt_status IN ('completed','checked_out'))::int AS done_count,
           (ARRAY_AGG(n.status ORDER BY s.created_at DESC))[1] AS n_status,
           MAX(n.counseling_completed_at) AS cc_at,
           COUNT(e.id)::int AS eval_count,
           MAX(e.evaluation_submitted_at) AS eval_at,
           COUNT(DISTINCT se.id)::int AS mel_count,
           (ARRAY_AGG(c.status ORDER BY c.created_at DESC NULLS LAST))[1] AS c_status,
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
        WHEN agg.c_status = 'paid' THEN 'paid'
        WHEN agg.eval_count > 0 THEN 'evaluated'
        WHEN agg.cc_at IS NOT NULL
          OR agg.n_status IN ('counseling_completed','case_closed') THEN 'awaiting_evaluation'
        WHEN agg.n_status IS NOT NULL AND agg.n_status <> 'not_reviewed' THEN 'in_counseling'
        ELSE 'survey_only'
      END AS stage_key
    FROM agg
  ),
  filtered AS (
    SELECT staged.* FROM staged
    WHERE staged.branch_match
      AND (_stage IS NULL OR _stage = 'all' OR staged.stage_key = _stage)
      AND (
        _search IS NULL OR _search = ''
        OR staged.disp ILIKE '%' || _search || '%'
        OR staged.h ILIKE _search || '%'
      )
  )
  SELECT f.h, f.disp, f.v_count, f.v_first, f.v_last,
         f.b_id, b.name_th, b.name_en,
         f.appt_count, f.done_count, f.n_status,
         f.cc_at, f.eval_count, f.eval_at,
         f.mel_count, f.c_status, f.stage_key,
         (SELECT COUNT(*) FROM filtered) AS total_count
  FROM filtered f
  LEFT JOIN booking_branches b ON b.id = f.b_id
  ORDER BY f.v_last DESC
  LIMIT GREATEST(1, LEAST(_limit, 200)) OFFSET GREATEST(0, _offset);
END;
$$;
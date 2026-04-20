CREATE OR REPLACE FUNCTION public.get_booking_analytics(p_days integer DEFAULT 30, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_since timestamptz := now() - make_interval(days => p_days);
BEGIN
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'moderator') OR has_role(v_user_id, 'outreach_staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH base AS (
    SELECT
      a.id, a.source, a.branch_id, a.appointment_date, a.start_time, a.created_at,
      (a.created_at AT TIME ZONE 'Asia/Bangkok') AS created_bkk,
      a.appointment_date - (a.created_at AT TIME ZONE 'Asia/Bangkok')::date AS lead_days
    FROM appointments a
    WHERE a.created_at >= v_since
      AND a.status NOT IN ('cancelled')
      AND (p_branch_id IS NULL OR a.branch_id = p_branch_id)
  ),
  by_hour AS (SELECT EXTRACT(HOUR FROM created_bkk)::int AS hour, count(*) AS n FROM base GROUP BY 1),
  by_weekday AS (SELECT EXTRACT(ISODOW FROM created_bkk)::int AS dow, count(*) AS n FROM base GROUP BY 1),
  by_appt_hour AS (SELECT EXTRACT(HOUR FROM start_time)::int AS hour, count(*) AS n FROM base GROUP BY 1),
  by_appt_weekday AS (SELECT EXTRACT(ISODOW FROM appointment_date)::int AS dow, count(*) AS n FROM base GROUP BY 1),
  by_appt_date AS (SELECT appointment_date AS d, count(*) AS n FROM base GROUP BY 1),
  lead_stats AS (
    SELECT
      ROUND(AVG(lead_days)::numeric, 1) AS avg_lead,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY lead_days) AS median_lead,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY lead_days) AS p90_lead,
      MIN(lead_days) AS min_lead, MAX(lead_days) AS max_lead
    FROM base WHERE source = 'appointment' AND lead_days >= 0
  ),
  by_source AS (SELECT source, count(*) AS n FROM base GROUP BY source),
  by_branch AS (
    SELECT b.branch_id, bb.name_th, bb.name_en, count(*) AS total,
      ROUND(AVG(b.lead_days) FILTER (WHERE b.source='appointment' AND b.lead_days>=0)::numeric, 1) AS avg_lead
    FROM base b LEFT JOIN booking_branches bb ON bb.id = b.branch_id
    GROUP BY b.branch_id, bb.name_th, bb.name_en ORDER BY total DESC
  ),
  checkout_breakdown AS (
    SELECT COALESCE(checkout_method, 'pending') AS method, count(*) AS n
    FROM appointments
    WHERE created_at >= v_since AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_bookings', (SELECT count(*) FROM base),
    'by_booking_hour', COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'n', n) ORDER BY hour) FROM by_hour), '[]'::jsonb),
    'by_booking_weekday', COALESCE((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'n', n) ORDER BY dow) FROM by_weekday), '[]'::jsonb),
    'by_appointment_hour', COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'n', n) ORDER BY hour) FROM by_appt_hour), '[]'::jsonb),
    'by_appointment_weekday', COALESCE((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'n', n) ORDER BY dow) FROM by_appt_weekday), '[]'::jsonb),
    'by_appointment_date', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d, 'n', n) ORDER BY d) FROM by_appt_date), '[]'::jsonb),
    'lead_time', (SELECT row_to_json(ls) FROM lead_stats ls),
    'by_source', COALESCE((SELECT jsonb_agg(jsonb_build_object('source', source, 'n', n)) FROM by_source), '[]'::jsonb),
    'by_branch', COALESCE((SELECT jsonb_agg(jsonb_build_object('branch_id', branch_id, 'name_th', name_th, 'name_en', name_en, 'total', total, 'avg_lead', avg_lead)) FROM by_branch), '[]'::jsonb),
    'checkout_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method, 'n', n)) FROM checkout_breakdown), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
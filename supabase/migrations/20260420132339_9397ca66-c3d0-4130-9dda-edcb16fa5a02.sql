-- ============================================================================
-- 1. Add checkout_method column to appointments
-- ============================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checkout_method text;

-- Constraint: only allow known values
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_checkout_method_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_checkout_method_check
  CHECK (checkout_method IS NULL OR checkout_method IN ('staff','self','auto','no_show'));

CREATE INDEX IF NOT EXISTS idx_appointments_checkout_method
  ON public.appointments(checkout_method)
  WHERE checkout_method IS NOT NULL;

-- ============================================================================
-- 2. Backfill existing data
-- ============================================================================
UPDATE public.appointments
SET checkout_method = CASE
  WHEN auto_checked_out_at IS NOT NULL THEN 'auto'
  WHEN status = 'no_show' THEN 'no_show'
  WHEN status = 'checked_out' THEN 'staff'
  ELSE NULL
END
WHERE checkout_method IS NULL
  AND (auto_checked_out_at IS NOT NULL OR status IN ('no_show','checked_out'));

-- ============================================================================
-- 3. Rewrite auto_checkout_stale_appointments — idempotent, sets method
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_checkout_stale_appointments(
  p_threshold_hours integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_batch integer;
  v_threshold interval;
  v_processed_ids uuid[];
BEGIN
  v_threshold := make_interval(hours => p_threshold_hours);

  -- Single combined update for all stale states (arrived/waiting/in_progress/completed)
  -- Idempotent: only touches rows without checked_out_at
  WITH stale AS (
    SELECT id,
           COALESCE(arrived_at, started_at, created_at) AS anchor_ts
    FROM appointments
    WHERE status IN ('arrived','waiting','in_progress','completed')
      AND checked_out_at IS NULL
      AND auto_checked_out_at IS NULL  -- prevent duplicate processing
      AND COALESCE(arrived_at, started_at, created_at) < now() - v_threshold
    FOR UPDATE SKIP LOCKED
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      checkout_method = 'auto',
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (now() - stale.anchor_ts))::integer / 60),
      updated_at = now()
  FROM stale
  WHERE a.id = stale.id
  RETURNING a.id INTO v_processed_ids;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_batch;

  -- Audit log: one row per appointment, deduped
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  SELECT a.id,
         'auto_checkout',
         NULL,
         format('Auto checked out by system (threshold=%sh, anchor=%s)',
                p_threshold_hours,
                to_char(COALESCE(a.arrived_at, a.started_at, a.created_at) AT TIME ZONE 'Asia/Bangkok',
                        'YYYY-MM-DD HH24:MI'))
  FROM appointments a
  WHERE a.auto_checked_out_at >= now() - interval '2 minutes'
    AND a.checkout_method = 'auto'
    AND NOT EXISTS (
      SELECT 1 FROM appointment_logs l
      WHERE l.appointment_id = a.id
        AND l.action = 'auto_checkout'
        AND l.created_at >= now() - interval '5 minutes'
    );

  RETURN v_count;
END;
$$;

-- ============================================================================
-- 4. Update self_checkout_appointment to set checkout_method='self'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.self_checkout_appointment(
  p_appointment_id uuid,
  p_confirm_code text,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_appt record;
BEGIN
  SELECT * INTO v_appt FROM appointments WHERE id = p_appointment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appt.checked_out_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already checked out';
  END IF;

  IF v_appt.status IN ('cancelled','no_show') THEN
    RAISE EXCEPTION 'Cannot check out: status is %', v_appt.status;
  END IF;

  -- Validate code (preserve existing behavior)
  IF NOT EXISTS (
    SELECT 1 FROM appointment_action_codes
    WHERE appointment_id = p_appointment_id
      AND code = p_confirm_code
      AND used_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired code';
  END IF;

  UPDATE appointment_action_codes
  SET used_at = now(), used_action = 'self_checkout'
  WHERE appointment_id = p_appointment_id AND code = p_confirm_code;

  UPDATE appointments
  SET status = 'checked_out',
      checked_out_at = now(),
      checkout_method = 'self',
      duration_minutes = GREATEST(1, EXTRACT(EPOCH FROM (now() - COALESCE(arrived_at, started_at, created_at)))::integer / 60),
      rating = p_rating,
      feedback = p_feedback,
      updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'self_checkout', v_user_id,
          'Client self check-out' || COALESCE(' (rating='||p_rating||')', ''));
END;
$$;

-- ============================================================================
-- 5. Update update_appointment_status to set checkout_method on staff actions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_old_status text;
  v_method text := NULL;
BEGIN
  -- Permission check: must be staff or admin
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT status INTO v_old_status FROM appointments WHERE id = p_appointment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  -- Determine checkout_method
  IF p_new_status = 'checked_out' THEN
    v_method := 'staff';
  ELSIF p_new_status = 'no_show' THEN
    v_method := 'no_show';
  END IF;

  UPDATE appointments
  SET status = p_new_status,
      cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
      cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN COALESCE(p_reason, cancellation_reason) ELSE cancellation_reason END,
      completed_at = CASE WHEN p_new_status = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
      checked_out_at = CASE WHEN p_new_status = 'checked_out' AND checked_out_at IS NULL THEN now() ELSE checked_out_at END,
      checkout_method = COALESCE(v_method, checkout_method),
      arrived_at = CASE WHEN p_new_status IN ('arrived','in_progress') AND arrived_at IS NULL THEN now() ELSE arrived_at END,
      started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
      duration_minutes = CASE
        WHEN p_new_status = 'checked_out'
          THEN GREATEST(1, EXTRACT(EPOCH FROM (now() - COALESCE(arrived_at, started_at, created_at)))::integer / 60)
        ELSE duration_minutes
      END,
      updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id,
          'status_change',
          v_user_id,
          format('%s → %s%s', v_old_status, p_new_status,
                 COALESCE(' ('||p_reason||')', '')));
END;
$$;

-- ============================================================================
-- 6. New analytics function: get_booking_analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_booking_analytics(
  p_days integer DEFAULT 30,
  p_branch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_since timestamptz := now() - make_interval(days => p_days);
BEGIN
  -- Permission: admin or staff only
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH base AS (
    SELECT
      a.id,
      a.source,
      a.branch_id,
      a.appointment_date,
      a.start_time,
      a.created_at,
      (a.created_at AT TIME ZONE 'Asia/Bangkok') AS created_bkk,
      ((a.appointment_date::timestamp + a.start_time) AT TIME ZONE 'Asia/Bangkok') AS appt_ts,
      a.appointment_date - (a.created_at AT TIME ZONE 'Asia/Bangkok')::date AS lead_days
    FROM appointments a
    WHERE a.created_at >= v_since
      AND a.status NOT IN ('cancelled')
      AND (p_branch_id IS NULL OR a.branch_id = p_branch_id)
  ),
  by_hour AS (
    SELECT EXTRACT(HOUR FROM created_bkk)::int AS hour, count(*) AS n
    FROM base GROUP BY 1 ORDER BY 1
  ),
  by_weekday AS (
    SELECT EXTRACT(ISODOW FROM created_bkk)::int AS dow, count(*) AS n
    FROM base GROUP BY 1 ORDER BY 1
  ),
  by_appt_hour AS (
    SELECT EXTRACT(HOUR FROM start_time)::int AS hour, count(*) AS n
    FROM base GROUP BY 1 ORDER BY 1
  ),
  by_appt_weekday AS (
    SELECT EXTRACT(ISODOW FROM appointment_date)::int AS dow, count(*) AS n
    FROM base GROUP BY 1 ORDER BY 1
  ),
  lead_stats AS (
    SELECT
      ROUND(AVG(lead_days)::numeric, 1) AS avg_lead,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY lead_days) AS median_lead,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY lead_days) AS p90_lead,
      MIN(lead_days) AS min_lead,
      MAX(lead_days) AS max_lead
    FROM base WHERE source = 'appointment' AND lead_days >= 0
  ),
  by_source AS (
    SELECT source, count(*) AS n FROM base GROUP BY source
  ),
  by_branch AS (
    SELECT
      b.branch_id,
      bb.name_th,
      bb.name_en,
      count(*) AS total,
      ROUND(AVG(b.lead_days) FILTER (WHERE b.source='appointment' AND b.lead_days>=0)::numeric, 1) AS avg_lead
    FROM base b
    LEFT JOIN booking_branches bb ON bb.id = b.branch_id
    GROUP BY b.branch_id, bb.name_th, bb.name_en
    ORDER BY total DESC
  ),
  checkout_breakdown AS (
    SELECT
      COALESCE(checkout_method, 'pending') AS method,
      count(*) AS n
    FROM appointments
    WHERE created_at >= v_since
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_bookings', (SELECT count(*) FROM base),
    'by_booking_hour', COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'n', n) ORDER BY hour) FROM by_hour), '[]'::jsonb),
    'by_booking_weekday', COALESCE((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'n', n) ORDER BY dow) FROM by_weekday), '[]'::jsonb),
    'by_appointment_hour', COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'n', n) ORDER BY hour) FROM by_appt_hour), '[]'::jsonb),
    'by_appointment_weekday', COALESCE((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'n', n) ORDER BY dow) FROM by_appt_weekday), '[]'::jsonb),
    'lead_time', (SELECT row_to_json(ls) FROM lead_stats ls),
    'by_source', COALESCE((SELECT jsonb_agg(jsonb_build_object('source', source, 'n', n)) FROM by_source), '[]'::jsonb),
    'by_branch', COALESCE((SELECT jsonb_agg(jsonb_build_object('branch_id', branch_id, 'name_th', name_th, 'name_en', name_en, 'total', total, 'avg_lead', avg_lead)) FROM by_branch), '[]'::jsonb),
    'checkout_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method, 'n', n)) FROM checkout_breakdown), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_analytics(integer, uuid) TO authenticated;
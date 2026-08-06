-- 1. Canonical status normalizer
CREATE OR REPLACE FUNCTION public.normalize_appointment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := CASE lower(coalesce(NEW.status, 'booked'))
    WHEN 'confirmed' THEN 'booked'
    WHEN 'pending' THEN 'booked'
    WHEN 'waiting' THEN 'arrived'
    WHEN 'checked_in' THEN 'arrived'
    WHEN 'in_progress' THEN 'arrived'
    WHEN 'completed' THEN 'arrived'
    WHEN 'cancelled_replaced' THEN 'cancelled'
    ELSE lower(NEW.status)
  END;

  -- a row that already has a checkout timestamp is always checked_out
  IF NEW.checked_out_at IS NOT NULL AND NEW.status = 'arrived' THEN
    NEW.status := 'checked_out';
  END IF;

  IF NEW.status = 'arrived' AND NEW.arrived_at IS NULL THEN
    NEW.arrived_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_appointment_status ON public.appointments;
CREATE TRIGGER trg_normalize_appointment_status
BEFORE INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.normalize_appointment_status();

-- 2. Backfill existing rows to the canonical set
UPDATE public.appointments
SET status = CASE
      WHEN checked_out_at IS NOT NULL THEN 'checked_out'
      WHEN status IN ('confirmed','pending') THEN 'booked'
      WHEN status IN ('waiting','checked_in','in_progress','completed') THEN 'arrived'
      WHEN status = 'cancelled_replaced' THEN 'cancelled'
      ELSE status
    END
WHERE status IN ('confirmed','pending','waiting','checked_in','in_progress','completed','cancelled_replaced')
   OR (checked_out_at IS NOT NULL AND status <> 'checked_out');

-- 3. Auto checkout 1h after check-in (canonical statuses only)
CREATE OR REPLACE FUNCTION public.auto_checkout_stale_appointments(p_threshold_hours integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_threshold interval;
BEGIN
  v_threshold := make_interval(hours => greatest(1, least(coalesce(p_threshold_hours, 1), 24)));

  WITH stale AS (
    SELECT id, COALESCE(arrived_at, started_at, created_at) AS anchor_ts
    FROM appointments
    WHERE status IN ('arrived','waiting','in_progress','completed')
      AND checked_out_at IS NULL
      AND auto_checked_out_at IS NULL
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
  WHERE a.id = stale.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  SELECT a.id, 'auto_checkout', NULL,
         format('Auto checked out by system (threshold=%sh)', p_threshold_hours)
  FROM appointments a
  WHERE a.auto_checked_out_at >= now() - interval '2 minutes'
    AND a.checkout_method = 'auto'
    AND NOT EXISTS (
      SELECT 1 FROM appointment_logs l
      WHERE l.appointment_id = a.id AND l.action = 'auto_checkout'
        AND l.created_at >= now() - interval '5 minutes'
    );

  RETURN v_count;
END;
$$;

-- 4. Suggested reschedule slots after a cancellation
CREATE OR REPLACE FUNCTION public.suggest_reschedule_slots(
  _branch_id uuid,
  _from_date date DEFAULT NULL,
  _limit integer DEFAULT 6
)
RETURNS TABLE(suggested_date date, start_time time, load_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT (coalesce(_from_date, (now() AT TIME ZONE 'Asia/Bangkok')::date) + i)::date AS d
    FROM generate_series(1, 14) i
  ),
  wh AS (
    SELECT w.branch_id, w.day_of_week, w.open_time, w.close_time, w.is_open
    FROM public.branch_working_hours w
    WHERE w.branch_id = _branch_id
  ),
  slots AS (
    SELECT d.d AS suggested_date,
           (wh.open_time + (n * interval '30 minutes'))::time AS start_time
    FROM days d
    JOIN wh ON wh.day_of_week = EXTRACT(dow FROM d.d)::int AND coalesce(wh.is_open, true)
    CROSS JOIN generate_series(0, 23) n
    WHERE (wh.open_time + (n * interval '30 minutes'))::time < wh.close_time
      AND NOT EXISTS (
        SELECT 1 FROM public.booking_blackouts b
        WHERE coalesce(b.is_all_day, true)
          AND (b.applies_to_branch_ids IS NULL
               OR array_length(b.applies_to_branch_ids, 1) IS NULL
               OR _branch_id = ANY (b.applies_to_branch_ids))
          AND d.d BETWEEN (b.start_at AT TIME ZONE 'Asia/Bangkok')::date
                      AND (coalesce(b.end_at, b.start_at) AT TIME ZONE 'Asia/Bangkok')::date
      )
  )
  SELECT s.suggested_date,
         s.start_time,
         coalesce(count(a.id), 0)::int AS load_count
  FROM slots s
  LEFT JOIN public.appointments a
    ON a.branch_id = _branch_id
   AND a.appointment_date = s.suggested_date
   AND a.start_time = s.start_time
   AND a.status IN ('booked','arrived','checked_out')
  GROUP BY s.suggested_date, s.start_time
  ORDER BY coalesce(count(a.id), 0) ASC, s.suggested_date ASC, s.start_time ASC
  LIMIT greatest(1, least(coalesce(_limit, 6), 20));
$$;
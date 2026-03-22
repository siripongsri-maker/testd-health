
CREATE OR REPLACE FUNCTION public.auto_checkout_stale_appointments(p_threshold_hours integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_batch integer;
  v_threshold interval;
BEGIN
  v_threshold := make_interval(hours => p_threshold_hours);

  -- Auto checkout: arrived/waiting after threshold (use started_at or arrived_at)
  WITH stale AS (
    SELECT id FROM appointments
    WHERE status IN ('arrived', 'waiting')
      AND checked_out_at IS NULL
      AND COALESCE(arrived_at, started_at, created_at) < now() - v_threshold
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - COALESCE(a.arrived_at, a.started_at, a.created_at)))::integer / 60,
      updated_at = now()
  FROM stale
  WHERE a.id = stale.id;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- Auto checkout: completed after 1 hour from completed_at
  WITH stale_completed AS (
    SELECT id FROM appointments
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND checked_out_at IS NULL
      AND completed_at < now() - interval '1 hour'
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - COALESCE(a.arrived_at, a.started_at, a.created_at)))::integer / 60,
      updated_at = now()
  FROM stale_completed
  WHERE a.id = stale_completed.id;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- Auto checkout: in_progress after threshold (use started_at or arrived_at)
  WITH stale_in_progress AS (
    SELECT id FROM appointments
    WHERE status = 'in_progress'
      AND checked_out_at IS NULL
      AND COALESCE(started_at, arrived_at, created_at) < now() - v_threshold
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - COALESCE(a.arrived_at, a.started_at, a.created_at)))::integer / 60,
      updated_at = now()
  FROM stale_in_progress
  WHERE a.id = stale_in_progress.id;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- Log auto-checkouts
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  SELECT id, 'auto_checkout', NULL, 
    'Auto checked out after inactivity (system)'
  FROM appointments
  WHERE auto_checked_out_at IS NOT NULL
    AND auto_checked_out_at > now() - interval '1 minute'
    AND id NOT IN (
      SELECT appointment_id FROM appointment_logs
      WHERE action = 'auto_checkout'
        AND created_at > now() - interval '2 minutes'
    );

  RETURN v_count;
END;
$function$;

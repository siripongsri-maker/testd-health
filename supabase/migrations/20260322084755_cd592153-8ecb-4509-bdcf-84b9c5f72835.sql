-- 1) Update auto_checkout_stale_appointments to also handle 'completed' and 'in_progress'
CREATE OR REPLACE FUNCTION public.auto_checkout_stale_appointments(p_threshold_hours integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_batch integer;
BEGIN
  -- Auto checkout: arrived/waiting after p_threshold_hours
  WITH stale AS (
    SELECT id FROM appointments
    WHERE status IN ('arrived', 'waiting')
      AND arrived_at IS NOT NULL
      AND checked_out_at IS NULL
      AND arrived_at < now() - make_interval(hours => p_threshold_hours)
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - a.arrived_at))::integer / 60,
      updated_at = now()
  FROM stale
  WHERE a.id = stale.id;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- Auto checkout: completed after 1 hour, in_progress after p_threshold_hours
  WITH stale_completed AS (
    SELECT id FROM appointments
    WHERE status IN ('completed', 'in_progress')
      AND arrived_at IS NOT NULL
      AND checked_out_at IS NULL
      AND (
        (status = 'completed' AND completed_at IS NOT NULL AND completed_at < now() - interval '1 hour')
        OR (status = 'in_progress' AND started_at IS NOT NULL AND started_at < now() - make_interval(hours => p_threshold_hours))
      )
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - a.arrived_at))::integer / 60,
      updated_at = now()
  FROM stale_completed
  WHERE a.id = stale_completed.id;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- Log auto-checkouts (only new ones)
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

-- 2) Update update_appointment_status to track started_at and allow checked_out status
CREATE OR REPLACE FUNCTION public.update_appointment_status(p_appointment_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment RECORD;
  v_old_status text;
  v_actor_id uuid;
  v_is_admin boolean;
  v_is_branch_staff boolean;
  v_is_owner boolean;
  v_actor_role text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  v_old_status := v_appointment.status;

  v_is_admin := has_role(v_actor_id, 'admin');
  v_is_owner := (v_appointment.user_id = v_actor_id);
  v_is_branch_staff := EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = v_actor_id AND bb.id = v_appointment.branch_id
  );

  IF NOT (v_is_admin OR v_is_branch_staff OR v_is_owner) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_is_owner AND NOT v_is_admin AND NOT v_is_branch_staff THEN
    IF p_new_status != 'cancelled' THEN
      RAISE EXCEPTION 'Users can only cancel appointments';
    END IF;
  END IF;

  IF p_new_status NOT IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'checked_out') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  IF v_is_admin THEN v_actor_role := 'admin';
  ELSIF v_is_branch_staff THEN v_actor_role := 'staff';
  ELSE v_actor_role := 'user';
  END IF;

  UPDATE appointments SET
    status = p_new_status,
    updated_at = now(),
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
    checked_out_at = CASE WHEN p_new_status = 'checked_out' AND checked_out_at IS NULL THEN now() ELSE checked_out_at END,
    duration_minutes = CASE 
      WHEN p_new_status = 'checked_out' AND arrived_at IS NOT NULL AND duration_minutes IS NULL
      THEN EXTRACT(EPOCH FROM (now() - arrived_at))::integer / 60 
      ELSE duration_minutes 
    END,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN COALESCE(p_reason, cancellation_reason) ELSE cancellation_reason END
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    p_appointment_id,
    'status_changed_to_' || p_new_status,
    v_actor_id,
    format('Status changed from %s to %s by %s. %s', v_old_status, p_new_status, v_actor_role, COALESCE(p_reason, ''))
  );
END;
$function$;
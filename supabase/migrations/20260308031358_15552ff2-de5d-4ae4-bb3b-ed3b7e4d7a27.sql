
DROP FUNCTION IF EXISTS public.get_branch_today_board(uuid, date);

CREATE FUNCTION public.get_branch_today_board(p_branch_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booked integer;
  v_arrived_waiting integer;
  v_checked_out integer;
  v_no_show integer;
  v_avg_duration numeric;
  v_auto_checkout integer;
  v_auto_noshow integer;
  v_completed integer;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    has_role(v_actor_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      WHERE sba.user_id = v_actor_id AND bb.id = p_branch_id
    ) OR
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE user_id = v_actor_id AND is_active = true
        AND (branch_id = p_branch_id OR staff_role = 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COUNT(*) INTO v_booked
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND status NOT IN ('cancelled');

  SELECT COUNT(*) INTO v_arrived_waiting
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND arrived_at IS NOT NULL AND checked_out_at IS NULL
    AND status NOT IN ('cancelled', 'no_show');

  SELECT COUNT(*) INTO v_checked_out
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND checked_out_at IS NOT NULL;

  SELECT COUNT(*) INTO v_no_show
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND status = 'no_show';

  SELECT COUNT(*) INTO v_completed
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND (checked_out_at IS NOT NULL OR status = 'completed');

  SELECT COUNT(*) INTO v_auto_checkout
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND auto_checked_out_at IS NOT NULL;

  SELECT COUNT(*) INTO v_auto_noshow
  FROM appointments a
  WHERE a.branch_id = p_branch_id AND a.appointment_date = p_date
    AND a.status = 'no_show'
    AND EXISTS (
      SELECT 1 FROM appointment_logs al
      WHERE al.appointment_id = a.id
        AND al.action = 'no_show'
        AND al.performed_by IS NULL
    );

  SELECT COALESCE(AVG(duration_minutes), 0) INTO v_avg_duration
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND checked_out_at IS NOT NULL AND duration_minutes IS NOT NULL;

  RETURN jsonb_build_object(
    'booked_today', v_booked,
    'arrived_waiting', v_arrived_waiting,
    'checked_out_today', v_checked_out,
    'no_show_today', v_no_show,
    'avg_duration_minutes', round(v_avg_duration, 1),
    'completed_total', v_completed,
    'auto_checkout', v_auto_checkout,
    'auto_noshow', v_auto_noshow,
    'auto_total', v_auto_checkout + v_auto_noshow
  );
END;
$function$;

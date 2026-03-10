
CREATE OR REPLACE FUNCTION public.self_checkin_appointment(p_appointment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment record;
  v_appointment_dt timestamptz;
  v_actor uuid;
  v_existing_visit_id uuid;
  v_visit_id uuid;
  v_number integer;
  v_prefix text;
  v_code text;
  v_today date;
BEGIN
  v_actor := auth.uid();

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND user_id = v_actor;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not yours';
  END IF;

  IF v_appointment.status NOT IN ('booked', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot check in: current status is %', v_appointment.status;
  END IF;

  v_appointment_dt := (v_appointment.appointment_date || ' ' || v_appointment.start_time)::timestamp AT TIME ZONE 'Asia/Bangkok';

  IF now() < (v_appointment_dt - interval '60 minutes') THEN
    RAISE EXCEPTION 'Too early to check in. Window opens 1 hour before appointment.';
  END IF;

  IF now() > (v_appointment_dt + interval '30 minutes') THEN
    RAISE EXCEPTION 'Check-in window has expired for this appointment.';
  END IF;

  -- Update appointment status
  UPDATE public.appointments
  SET status = 'arrived',
      arrived_at = now(),
      updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'self_checkin', v_actor, 'Client self check-in');

  -- === QUEUE INTEGRATION: create visit flow if not exists ===
  v_today := (now() AT TIME ZONE 'Asia/Bangkok')::date;

  -- Check for existing active visit for this appointment today
  SELECT id INTO v_existing_visit_id
  FROM client_visit_flows
  WHERE appointment_id = p_appointment_id
    AND branch_id = v_appointment.branch_id
    AND visit_date = v_today
    AND is_completed = false
    AND is_cancelled = false
  LIMIT 1;

  -- Only create queue records if none exist yet
  IF v_existing_visit_id IS NULL THEN
    SELECT COALESCE(queue_prefix, 'Q') INTO v_prefix
    FROM branch_queue_settings WHERE branch_id = v_appointment.branch_id;
    IF NOT FOUND THEN v_prefix := 'Q'; END IF;

    v_number := generate_visit_queue_number(v_appointment.branch_id, v_today);
    v_code := v_prefix || LPAD(v_number::text, 3, '0');

    INSERT INTO client_visit_flows (
      branch_id, appointment_id, visit_date, visit_number, visit_code,
      current_step, current_status, created_by
    ) VALUES (
      v_appointment.branch_id, p_appointment_id, v_today, v_number, v_code,
      'counselor', 'waiting', v_actor
    ) RETURNING id INTO v_visit_id;

    -- Register step (auto-completed)
    INSERT INTO client_visit_flow_steps (
      visit_id, branch_id, step_code, queue_number, queue_code,
      step_status, entered_at, completed_at, created_by
    ) VALUES (
      v_visit_id, v_appointment.branch_id, 'register', v_number, v_code,
      'completed', now(), now(), v_actor
    );

    -- Counselor step (waiting)
    INSERT INTO client_visit_flow_steps (
      visit_id, branch_id, step_code, queue_number, queue_code,
      step_status, created_by
    ) VALUES (
      v_visit_id, v_appointment.branch_id, 'counselor', v_number, v_code,
      'waiting', v_actor
    );
  END IF;
END;
$function$;

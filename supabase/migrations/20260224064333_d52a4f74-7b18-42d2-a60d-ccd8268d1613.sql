
-- RPC for anonymous booking that bypasses RLS
CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid,
  p_service_ids uuid[],
  p_appointment_date date,
  p_start_time time,
  p_contact_email text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
  v_referral_code text;
  v_sid uuid;
BEGIN
  -- Validate email
  IF p_contact_email IS NULL OR p_contact_email = '' THEN
    RAISE EXCEPTION 'contact_email is required for anonymous booking';
  END IF;

  -- Validate at least one service
  IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  -- Insert appointment
  INSERT INTO public.appointments (
    branch_id, service_id, appointment_date, start_time,
    status, notes, user_id, contact_email
  ) VALUES (
    p_branch_id, p_service_ids[1], p_appointment_date, p_start_time,
    'booked', p_notes, NULL, p_contact_email
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  -- Insert appointment_services
  FOREACH v_sid IN ARRAY p_service_ids LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  -- Log to notification_logs with status 'skipped' (email disabled)
  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (v_appointment_id, left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2), 'booking_created', 'skipped');

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$$;

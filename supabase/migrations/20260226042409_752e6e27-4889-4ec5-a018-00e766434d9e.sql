
-- 1) Update self_checkin_appointment to use Bangkok time for window check (-60min / +30min)
CREATE OR REPLACE FUNCTION public.self_checkin_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment record;
  v_bangkok_now timestamptz;
  v_appointment_dt timestamptz;
BEGIN
  v_bangkok_now := now() AT TIME ZONE 'Asia/Bangkok';

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not yours';
  END IF;

  IF v_appointment.status NOT IN ('booked', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot check in: current status is %', v_appointment.status;
  END IF;

  -- Build appointment datetime in Bangkok
  v_appointment_dt := (v_appointment.appointment_date || ' ' || v_appointment.start_time)::timestamp AT TIME ZONE 'Asia/Bangkok';

  -- Window: 60 min before to 30 min after
  IF now() < (v_appointment_dt - interval '60 minutes') THEN
    RAISE EXCEPTION 'Too early to check in. Window opens 1 hour before appointment.';
  END IF;

  IF now() > (v_appointment_dt + interval '30 minutes') THEN
    RAISE EXCEPTION 'Check-in window has expired for this appointment.';
  END IF;

  UPDATE public.appointments
  SET status = 'arrived',
      arrived_at = now(),
      updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'self_checkin', auth.uid()::text, 'Client self check-in');
END;
$function$;

-- 2) Guest self check-in (verifies via referral_code, no auth required)
CREATE OR REPLACE FUNCTION public.guest_self_checkin(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment record;
  v_appointment_dt timestamptz;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE upper(trim(referral_code)) = upper(trim(p_referral_code))
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
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

  UPDATE public.appointments
  SET status = 'arrived',
      arrived_at = now(),
      updated_at = now()
  WHERE id = v_appointment.id;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_appointment.id, 'self_checkin', 'guest:' || p_referral_code, 'Guest self check-in');

  RETURN jsonb_build_object('id', v_appointment.id, 'status', 'arrived');
END;
$function$;

-- 3) Guest self check-out (verifies via referral_code)
CREATE OR REPLACE FUNCTION public.guest_self_checkout(
  p_referral_code text,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment record;
  v_duration integer;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE upper(trim(referral_code)) = upper(trim(p_referral_code))
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appointment.status != 'arrived' THEN
    RAISE EXCEPTION 'Cannot check out: must be checked in first (current status: %)', v_appointment.status;
  END IF;

  IF v_appointment.arrived_at IS NULL THEN
    RAISE EXCEPTION 'Cannot check out: no check-in record found';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  v_duration := EXTRACT(EPOCH FROM (now() - v_appointment.arrived_at))::integer / 60;

  UPDATE public.appointments
  SET status = 'checked_out',
      checked_out_at = now(),
      duration_minutes = v_duration,
      rating = p_rating,
      feedback = p_feedback,
      updated_at = now()
  WHERE id = v_appointment.id;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    v_appointment.id,
    'self_checkout',
    'guest:' || p_referral_code,
    'Guest self check-out' || CASE WHEN p_rating IS NOT NULL THEN ' (rating: ' || p_rating || '/5)' ELSE '' END
  );

  RETURN jsonb_build_object('id', v_appointment.id, 'status', 'checked_out');
END;
$function$;

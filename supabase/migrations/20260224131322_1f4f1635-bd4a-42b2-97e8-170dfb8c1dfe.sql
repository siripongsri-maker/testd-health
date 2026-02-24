
-- Add new columns to appointments (arrived_at already exists)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS feedback text;

-- Create self_checkin_appointment RPC
CREATE OR REPLACE FUNCTION public.self_checkin_appointment(
  p_appointment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment record;
  v_appointment_datetime timestamptz;
BEGIN
  -- Fetch appointment and verify ownership
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not yours';
  END IF;

  -- Validate status
  IF v_appointment.status NOT IN ('booked', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot check in: current status is %', v_appointment.status;
  END IF;

  -- Validate time window: 2 hours before to 6 hours after appointment time
  v_appointment_datetime := (v_appointment.appointment_date || ' ' || v_appointment.start_time)::timestamptz;

  IF now() < (v_appointment_datetime - interval '2 hours') THEN
    RAISE EXCEPTION 'Too early to check in. Please come back closer to your appointment time.';
  END IF;

  IF now() > (v_appointment_datetime + interval '6 hours') THEN
    RAISE EXCEPTION 'Check-in window has expired for this appointment.';
  END IF;

  -- Update appointment
  UPDATE public.appointments
  SET status = 'arrived',
      arrived_at = now(),
      updated_at = now()
  WHERE id = p_appointment_id;

  -- Log the action
  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'self_checkin', auth.uid()::text, 'Client self check-in');
END;
$$;

-- Create self_checkout_appointment RPC
CREATE OR REPLACE FUNCTION public.self_checkout_appointment(
  p_appointment_id uuid,
  p_confirm_code text,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment record;
  v_duration integer;
BEGIN
  -- Fetch appointment and verify ownership
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or not yours';
  END IF;

  -- Validate status
  IF v_appointment.status != 'arrived' THEN
    RAISE EXCEPTION 'Cannot check out: must be checked in first (current status: %)', v_appointment.status;
  END IF;

  -- Validate arrived_at exists
  IF v_appointment.arrived_at IS NULL THEN
    RAISE EXCEPTION 'Cannot check out: no check-in record found';
  END IF;

  -- Validate referral code
  IF v_appointment.referral_code IS NULL OR upper(trim(p_confirm_code)) != upper(trim(v_appointment.referral_code)) THEN
    RAISE EXCEPTION 'Referral code does not match';
  END IF;

  -- Validate rating if provided
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Calculate duration
  v_duration := EXTRACT(EPOCH FROM (now() - v_appointment.arrived_at))::integer / 60;

  -- Update appointment
  UPDATE public.appointments
  SET status = 'checked_out',
      checked_out_at = now(),
      duration_minutes = v_duration,
      rating = p_rating,
      feedback = p_feedback,
      updated_at = now()
  WHERE id = p_appointment_id;

  -- Log the action
  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    p_appointment_id,
    'self_checkout',
    auth.uid()::text,
    'Client self check-out' || CASE WHEN p_rating IS NOT NULL THEN ' (rating: ' || p_rating || '/5)' ELSE '' END
  );
END;
$$;

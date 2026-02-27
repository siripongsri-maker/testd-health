
-- Fix: Allow checkout from arrived, in_progress, or completed status
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

  -- Validate status: allow checkout from arrived, in_progress, or completed
  IF v_appointment.status NOT IN ('arrived', 'in_progress', 'completed') THEN
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
    'client_checkout',
    auth.uid(),
    format('Self check-out after %s min | rating: %s', v_duration, COALESCE(p_rating::text, 'none'))
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.guest_cancel_appointment(
  p_referral_code text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt RECORD;
  v_reason text;
BEGIN
  IF p_referral_code IS NULL OR length(trim(p_referral_code)) = 0 THEN
    RAISE EXCEPTION 'missing_referral_code' USING ERRCODE = '22023';
  END IF;

  SELECT id, status, appointment_date, start_time, branch_id, user_id
    INTO v_apt
    FROM public.appointments
   WHERE upper(referral_code) = upper(trim(p_referral_code))
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_apt.status NOT IN ('booked', 'confirmed') THEN
    RAISE EXCEPTION 'not_cancellable' USING ERRCODE = '22023';
  END IF;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');

  UPDATE public.appointments
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = coalesce(v_reason, 'Cancelled by guest via booking code'),
         updated_at = now()
   WHERE id = v_apt.id;

  BEGIN
    INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
    VALUES (
      v_apt.id,
      'cancelled',
      NULL,
      jsonb_build_object(
        'source', 'guest_self_service',
        'reason', v_reason
      )::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block cancellation on logging issues
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_apt.id,
    'status', 'cancelled'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guest_cancel_appointment(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_cancel_appointment(text, text) TO anon, authenticated;


-- Add replaced_by_id to track replacement chain
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS replaced_by_id UUID REFERENCES public.appointments(id) DEFAULT NULL;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_appointments_replaced_by ON public.appointments(replaced_by_id) WHERE replaced_by_id IS NOT NULL;

-- Atomic replace appointment RPC
CREATE OR REPLACE FUNCTION public.replace_appointment(
  p_old_appointment_id UUID,
  p_branch_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_services UUID[],
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_line TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old RECORD;
  v_new_id UUID;
  v_referral TEXT;
  v_slot_count INT;
  v_counselor_count INT;
  v_sid UUID;
BEGIN
  -- Lock and fetch old appointment
  SELECT * INTO v_old
  FROM appointments
  WHERE id = p_old_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  -- Verify ownership
  IF p_user_id IS NOT NULL THEN
    IF v_old.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'not_owner';
    END IF;
  ELSE
    -- Anonymous: match by phone
    IF p_contact_phone IS NULL OR v_old.contact_phone IS NULL
       OR v_old.contact_phone != p_contact_phone THEN
      RAISE EXCEPTION 'not_owner';
    END IF;
  END IF;

  -- Only active bookings can be replaced
  IF v_old.status NOT IN ('booked', 'confirmed') THEN
    RAISE EXCEPTION 'cannot_replace_status_%', v_old.status;
  END IF;

  -- Check new slot availability (same logic as create_appointment_atomic)
  SELECT counselor_count INTO v_counselor_count
  FROM booking_branches WHERE id = p_branch_id;

  SELECT count(*) INTO v_slot_count
  FROM appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_appointment_date
    AND start_time = p_start_time
    AND status IN ('booked', 'confirmed', 'arrived', 'waiting', 'in_progress')
    AND id != p_old_appointment_id;  -- exclude old one being replaced

  IF v_slot_count >= v_counselor_count THEN
    RAISE EXCEPTION 'slot_full';
  END IF;

  -- Check blackouts
  IF EXISTS (
    SELECT 1 FROM booking_blackouts
    WHERE (p_appointment_date::timestamp + p_start_time) >= start_at
      AND (p_appointment_date::timestamp + p_start_time) < end_at
      AND (scope = 'global' OR p_branch_id = ANY(applies_to_branch_ids))
  ) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  -- Generate referral code
  v_referral := 'SWG-' || upper(substring(md5(random()::text) from 1 for 6));

  -- Create new appointment
  v_new_id := gen_random_uuid();

  INSERT INTO appointments (
    id, user_id, branch_id, appointment_date, start_time,
    status, contact_email, contact_phone, contact_line, notes,
    referral_code, source, created_at, updated_at
  ) VALUES (
    v_new_id,
    p_user_id,
    p_branch_id,
    p_appointment_date,
    p_start_time,
    'booked',
    p_contact_email,
    p_contact_phone,
    p_contact_line,
    p_notes,
    v_referral,
    'app',
    now(),
    now()
  );

  -- Insert services for new appointment
  FOREACH v_sid IN ARRAY p_services LOOP
    INSERT INTO appointment_services (appointment_id, service_id)
    VALUES (v_new_id, v_sid);
  END LOOP;

  -- Cancel old appointment and link to new
  UPDATE appointments
  SET status = 'cancelled_replaced',
      cancelled_at = now(),
      cancellation_reason = 'Replaced by new booking ' || v_referral,
      replaced_by_id = v_new_id,
      updated_at = now()
  WHERE id = p_old_appointment_id;

  -- Log the replacement
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_old_appointment_id, 'cancelled_replaced', p_user_id,
          'Replaced by appointment ' || v_new_id::text);

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_new_id, 'created_as_replacement', p_user_id,
          'Replaces appointment ' || p_old_appointment_id::text);

  RETURN json_build_object(
    'id', v_new_id,
    'referral_code', v_referral,
    'old_appointment_id', p_old_appointment_id,
    'replaced', true
  );
END;
$$;

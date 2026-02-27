
-- 1. Add contact_line column
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS contact_line text;

-- 2. Drop old overloads and recreate with contact_line support

-- Drop old create_anonymous_appointment overloads
DROP FUNCTION IF EXISTS public.create_anonymous_appointment(uuid, uuid[], date, time, text, text);
DROP FUNCTION IF EXISTS public.create_anonymous_appointment(uuid, uuid[], date, time, text, text, text);

CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid,
  p_service_ids uuid[],
  p_appointment_date date,
  p_start_time time,
  p_contact_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_contact_line text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment_id uuid;
  v_referral_code text;
  v_sid uuid;
  v_capacity integer;
  v_current_count integer;
BEGIN
  -- Phone is now the primary contact; email is optional
  IF (p_contact_phone IS NULL OR p_contact_phone = '') AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'At least phone or email is required for anonymous booking';
  END IF;

  IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  SELECT counselor_count INTO v_capacity
  FROM public.booking_branches
  WHERE id = p_branch_id AND is_active = true;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Branch not found or inactive';
  END IF;

  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_appointment_date
    AND start_time = p_start_time
    AND status NOT IN ('cancelled', 'no_show');

  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'slot_full';
  END IF;

  INSERT INTO public.appointments (
    branch_id, service_id, appointment_date, start_time,
    status, notes, user_id, contact_email, contact_phone, contact_line
  ) VALUES (
    p_branch_id, p_service_ids[1], p_appointment_date, p_start_time,
    'booked', p_notes, NULL,
    NULLIF(p_contact_email, ''), p_contact_phone, p_contact_line
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  FOREACH v_sid IN ARRAY p_service_ids LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_appointment_id, 'booked', NULL, 'Booked by guest');

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (
    v_appointment_id,
    CASE WHEN p_contact_email IS NOT NULL AND p_contact_email != '' 
      THEN left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2)
      ELSE '***'
    END,
    'booking_created',
    'skipped'
  );

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$$;

-- Drop old create_appointment_atomic overloads
DROP FUNCTION IF EXISTS public.create_appointment_atomic(uuid, date, time, uuid[], text, uuid, text);
DROP FUNCTION IF EXISTS public.create_appointment_atomic(uuid, date, time, uuid[], text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_branch_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_services uuid[],
  p_contact_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_contact_line text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity integer;
  v_current_count integer;
  v_appointment_id uuid;
  v_referral_code text;
  v_sid uuid;
  v_actual_user_id uuid;
  v_source text;
BEGIN
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  v_source := 'appointment';

  IF array_length(p_services, 1) IS NULL OR array_length(p_services, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  IF v_actual_user_id IS NULL AND (p_contact_phone IS NULL OR p_contact_phone = '') AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'At least phone or email is required for anonymous booking';
  END IF;

  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  SELECT counselor_count INTO v_capacity
  FROM public.booking_branches
  WHERE id = p_branch_id AND is_active = true;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Branch not found or inactive';
  END IF;

  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_appointment_date
    AND start_time = p_start_time
    AND status NOT IN ('cancelled', 'no_show');

  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'slot_full';
  END IF;

  IF v_actual_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.appointments
      WHERE user_id = v_actual_user_id
        AND branch_id = p_branch_id
        AND appointment_date = p_appointment_date
        AND start_time = p_start_time
        AND status NOT IN ('cancelled', 'no_show')
    ) THEN
      RAISE EXCEPTION 'duplicate_booking';
    END IF;
  END IF;

  INSERT INTO public.appointments (
    branch_id, service_id, appointment_date, start_time,
    status, notes, user_id, contact_email, contact_phone, contact_line, source
  ) VALUES (
    p_branch_id, p_services[1], p_appointment_date, p_start_time,
    'booked', p_notes, v_actual_user_id,
    COALESCE(NULLIF(p_contact_email, ''), (SELECT email FROM auth.users WHERE id = v_actual_user_id)),
    p_contact_phone, p_contact_line,
    v_source
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  FOREACH v_sid IN ARRAY p_services LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    v_appointment_id, 'booked', v_actual_user_id,
    CASE WHEN v_actual_user_id IS NOT NULL THEN 'Booked by authenticated user' ELSE 'Booked by guest' END
  );

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (
    v_appointment_id,
    left(COALESCE(p_contact_email, '***'), 3) || '***',
    'booking_created',
    'skipped'
  );

  IF v_actual_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 1000, updated_at = now()
    WHERE id = v_actual_user_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$$;

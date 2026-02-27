-- Add contact_phone column to appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT NULL;

-- Update create_appointment_atomic to accept phone
CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_branch_id uuid,
  p_appointment_date date,
  p_start_time time without time zone,
  p_services uuid[],
  p_contact_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF v_actual_user_id IS NULL AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'contact_email is required for anonymous booking';
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
    status, notes, user_id, contact_email, contact_phone, source
  ) VALUES (
    p_branch_id, p_services[1], p_appointment_date, p_start_time,
    'booked', p_notes, v_actual_user_id,
    COALESCE(p_contact_email, (SELECT email FROM auth.users WHERE id = v_actual_user_id)),
    p_contact_phone,
    v_source
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  FOREACH v_sid IN ARRAY p_services LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    v_appointment_id,
    'booked',
    v_actual_user_id,
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
    SET xp = COALESCE(xp, 0) + 1000,
        updated_at = now()
    WHERE id = v_actual_user_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$function$;

-- Also update create_anonymous_appointment if it exists
CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid,
  p_service_ids uuid[],
  p_appointment_date date,
  p_start_time time without time zone,
  p_contact_email text,
  p_notes text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.create_appointment_atomic(
    p_branch_id,
    p_appointment_date,
    p_start_time,
    p_service_ids,
    p_contact_email,
    NULL,
    p_notes,
    p_contact_phone
  );
END;
$function$;

-- Update guest_universal_lookup to also search by phone
CREATE OR REPLACE FUNCTION public.guest_universal_lookup(p_identifier text)
RETURNS TABLE(
  appointment_id uuid,
  appointment_date date,
  start_time time without time zone,
  status text,
  referral_code text,
  branch_name_th text,
  branch_name_en text,
  branch_slug text,
  services_summary text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_input text;
  v_is_email boolean;
  v_is_referral boolean;
  v_is_phone boolean;
  v_hash text;
  v_recent_count integer;
BEGIN
  v_input := trim(p_identifier);
  IF v_input IS NULL OR v_input = '' THEN
    RAISE EXCEPTION 'empty_identifier';
  END IF;

  v_is_email := v_input ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  v_is_referral := v_input ~* '^SWG-[A-Z0-9]+$';
  -- Detect phone: starts with 0 and 9-10 digits, or starts with + and 10-13 digits
  v_is_phone := v_input ~ '^0[0-9]{8,9}$' OR v_input ~ '^\+[0-9]{10,13}$';

  IF v_is_referral THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts gla
    WHERE gla.referral_code = upper(v_input)
      AND gla.created_at > now() - interval '15 minutes';
    INSERT INTO guest_lookup_attempts (referral_code) VALUES (upper(v_input));
    IF v_recent_count >= 15 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

    RETURN QUERY
    SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
      a.created_at
    FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE upper(a.referral_code) = upper(v_input) AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  IF v_is_phone THEN
    -- Rate limit by phone (reuse email column for simplicity)
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts gla
    WHERE gla.email = v_input
      AND gla.created_at > now() - interval '15 minutes';
    INSERT INTO guest_lookup_attempts (email) VALUES (v_input);
    IF v_recent_count >= 10 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

    RETURN QUERY
    SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
      a.created_at
    FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE a.contact_phone = v_input AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  IF v_is_email THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts gla
    WHERE gla.email = lower(v_input)
      AND gla.created_at > now() - interval '15 minutes';
    INSERT INTO guest_lookup_attempts (email) VALUES (lower(v_input));
    IF v_recent_count >= 10 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

    RETURN QUERY
    SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
      a.created_at
    FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE lower(a.contact_email) = lower(v_input) AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  -- Token lookup
  v_hash := encode(extensions.digest(v_input::bytea, 'sha256'), 'hex');
  RETURN QUERY
  SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
    bb.name_th, bb.name_en, bb.slug,
    COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
    a.created_at
  FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
  WHERE a.guest_access_hash = v_hash AND a.guest_access_expires_at > now() AND a.status != 'cancelled'
  ORDER BY a.appointment_date DESC, a.start_time DESC;
END;
$function$;
-- P0 blackout enforcement hardening
-- 1) get_available_slots becomes canonical availability source with day closure metadata + Bangkok-time overlap logic
-- 2) check_slot_available uses same Bangkok-time overlap logic
-- 3) booking RPCs call check_slot_available before INSERT and raise slot_blocked

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_branch_id UUID,
  p_date DATE,
  p_debug BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT,
  day_is_closed BOOLEAN,
  closure_title TEXT,
  closure_reason TEXT,
  slot_start_ts TIMESTAMPTZ,
  slot_end_ts TIMESTAMPTZ,
  matched_blackout_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_of_week INTEGER;
  v_open_time TIME;
  v_close_time TIME;
  v_slot_minutes INTEGER;
  v_capacity INTEGER;
  v_is_open BOOLEAN;

  v_day_start_ts TIMESTAMPTZ;
  v_day_end_ts TIMESTAMPTZ;
  v_working_start_ts TIMESTAMPTZ;
  v_working_end_ts TIMESTAMPTZ;

  v_current_local_ts TIMESTAMP;
  v_end_local_ts TIMESTAMP;
  v_next_local_ts TIMESTAMP;

  v_slot_start_ts TIMESTAMPTZ;
  v_slot_end_ts TIMESTAMPTZ;

  v_booked INTEGER;
  v_blackout_title TEXT;
  v_blackout_id UUID;

  v_closure_title TEXT;
  v_closure_reason TEXT;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- 1) Working hours first
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM public.branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id
    AND bwh.day_of_week = v_day_of_week;

  IF NOT FOUND THEN
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes, bb.counselor_count
    INTO v_open_time, v_close_time, v_slot_minutes, v_capacity
    FROM public.booking_branches bb
    WHERE bb.id = p_branch_id
      AND bb.is_active = true;

    IF NOT FOUND THEN
      RETURN;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.booking_branches bb
      WHERE bb.id = p_branch_id
        AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN QUERY SELECT
        NULL::TIME,
        0,
        COALESCE(v_capacity, 0),
        FALSE,
        NULL::TEXT,
        TRUE,
        'Closed day',
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::UUID;
      RETURN;
    END IF;

    v_is_open := TRUE;
  ELSIF NOT v_is_open THEN
    SELECT bb.counselor_count INTO v_capacity
    FROM public.booking_branches bb
    WHERE bb.id = p_branch_id;

    RETURN QUERY SELECT
      NULL::TIME,
      0,
      COALESCE(v_capacity, 0),
      FALSE,
      NULL::TEXT,
      TRUE,
      'Closed day',
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::UUID;
    RETURN;
  END IF;

  SELECT bb.counselor_count INTO v_capacity
  FROM public.booking_branches bb
  WHERE bb.id = p_branch_id;

  IF v_capacity IS NULL THEN
    RETURN;
  END IF;

  v_day_start_ts := ((p_date::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_day_end_ts := v_day_start_ts + INTERVAL '1 day';

  v_working_start_ts := ((p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_working_end_ts := ((p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');

  IF v_working_end_ts <= v_working_start_ts THEN
    v_working_end_ts := v_working_end_ts + INTERVAL '1 day';
  END IF;

  -- 2) Full-day closure check before slot generation
  SELECT bo.title, bo.reason
  INTO v_closure_title, v_closure_reason
  FROM public.booking_blackouts bo
  WHERE (
      bo.scope = 'global'
      OR (
        bo.scope = 'branch'
        AND bo.applies_to_branch_ids IS NOT NULL
        AND p_branch_id = ANY(bo.applies_to_branch_ids)
      )
    )
    AND (
      -- explicit all-day blackout on this date
      (bo.is_all_day = TRUE AND bo.start_at < v_day_end_ts AND bo.end_at > v_day_start_ts)
      -- blackout fully covers working window
      OR (bo.start_at <= v_working_start_ts AND bo.end_at >= v_working_end_ts)
    )
  ORDER BY bo.start_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      NULL::TIME,
      0,
      v_capacity,
      FALSE,
      v_closure_title,
      TRUE,
      v_closure_title,
      v_closure_reason,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::UUID;
    RETURN;
  END IF;

  -- 3) Generate working slots and apply blackout overlap, then capacity
  v_current_local_ts := (p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP;
  v_end_local_ts := (p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP;

  IF v_end_local_ts <= v_current_local_ts THEN
    v_end_local_ts := v_end_local_ts + INTERVAL '1 day';
  END IF;

  WHILE v_current_local_ts < v_end_local_ts LOOP
    v_next_local_ts := v_current_local_ts + make_interval(mins => COALESCE(v_slot_minutes, 60));

    -- required canonical conversion
    v_slot_start_ts := (v_current_local_ts AT TIME ZONE 'Asia/Bangkok');
    v_slot_end_ts := v_slot_start_ts + make_interval(mins => COALESCE(v_slot_minutes, 60));

    v_blackout_title := NULL;
    v_blackout_id := NULL;

    SELECT bo.id, bo.title
    INTO v_blackout_id, v_blackout_title
    FROM public.booking_blackouts bo
    WHERE (
        bo.scope = 'global'
        OR (
          bo.scope = 'branch'
          AND bo.applies_to_branch_ids IS NOT NULL
          AND p_branch_id = ANY(bo.applies_to_branch_ids)
        )
      )
      AND bo.start_at < v_slot_end_ts
      AND bo.end_at > v_slot_start_ts
    ORDER BY bo.start_at ASC
    LIMIT 1;

    SELECT COUNT(*)::INTEGER
    INTO v_booked
    FROM public.appointments a
    WHERE a.branch_id = p_branch_id
      AND a.appointment_date = p_date
      AND a.start_time = v_current_local_ts::TIME
      AND a.status NOT IN ('cancelled', 'no_show');

    RETURN QUERY SELECT
      v_current_local_ts::TIME,
      v_booked,
      v_capacity,
      (v_blackout_title IS NULL AND v_booked < v_capacity),
      v_blackout_title,
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      CASE WHEN p_debug THEN v_slot_start_ts ELSE NULL::TIMESTAMPTZ END,
      CASE WHEN p_debug THEN v_slot_end_ts ELSE NULL::TIMESTAMPTZ END,
      CASE WHEN p_debug THEN v_blackout_id ELSE NULL::UUID END;

    v_current_local_ts := v_next_local_ts;
  END LOOP;
END;
$function$;


CREATE OR REPLACE FUNCTION public.check_slot_available(
  p_branch_id UUID,
  p_date DATE,
  p_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_of_week INTEGER;
  v_is_open BOOLEAN;
  v_open_time TIME;
  v_close_time TIME;
  v_slot_minutes INTEGER;

  v_slot_start_ts TIMESTAMPTZ;
  v_slot_end_ts TIMESTAMPTZ;

  v_has_blackout BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- 1) Working hours first
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM public.branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id
    AND bwh.day_of_week = v_day_of_week;

  IF FOUND THEN
    IF NOT v_is_open THEN
      RETURN FALSE;
    END IF;
    IF p_time < v_open_time OR p_time >= v_close_time THEN
      RETURN FALSE;
    END IF;
  ELSE
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes
    INTO v_open_time, v_close_time, v_slot_minutes
    FROM public.booking_branches bb
    WHERE bb.id = p_branch_id
      AND bb.is_active = TRUE;

    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.booking_branches bb
      WHERE bb.id = p_branch_id
        AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN FALSE;
    END IF;

    IF p_time < v_open_time OR p_time >= v_close_time THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- required canonical conversion
  v_slot_start_ts := ((p_date::TEXT || ' ' || p_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_slot_end_ts := v_slot_start_ts + make_interval(mins => COALESCE(v_slot_minutes, 60));

  -- 2) Blackout overlap second
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_blackouts bo
    WHERE (
        bo.scope = 'global'
        OR (
          bo.scope = 'branch'
          AND bo.applies_to_branch_ids IS NOT NULL
          AND p_branch_id = ANY(bo.applies_to_branch_ids)
        )
      )
      AND bo.start_at < v_slot_end_ts
      AND bo.end_at > v_slot_start_ts
  ) INTO v_has_blackout;

  IF v_has_blackout THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_branch_id uuid,
  p_appointment_date date,
  p_start_time time without time zone,
  p_services uuid[],
  p_contact_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
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

  -- MUST validate before INSERT
  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  -- Re-check after lock to avoid edge race during concurrent edits
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
    status, notes, user_id, contact_email, source
  ) VALUES (
    p_branch_id, p_services[1], p_appointment_date, p_start_time,
    'booked', p_notes, v_actual_user_id,
    COALESCE(p_contact_email, (SELECT email FROM auth.users WHERE id = v_actual_user_id)),
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


CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid,
  p_service_ids uuid[],
  p_appointment_date date,
  p_start_time time without time zone,
  p_contact_email text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment_id uuid;
  v_referral_code text;
  v_sid uuid;
  v_capacity integer;
  v_current_count integer;
BEGIN
  IF p_contact_email IS NULL OR p_contact_email = '' THEN
    RAISE EXCEPTION 'contact_email is required for anonymous booking';
  END IF;

  IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  -- MUST validate before INSERT
  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  -- Re-check after lock to avoid edge race during concurrent edits
  IF NOT public.check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  SELECT counselor_count INTO v_capacity
  FROM public.booking_branches
  WHERE id = p_branch_id
    AND is_active = true;

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
    branch_id,
    service_id,
    appointment_date,
    start_time,
    status,
    notes,
    user_id,
    contact_email
  ) VALUES (
    p_branch_id,
    p_service_ids[1],
    p_appointment_date,
    p_start_time,
    'booked',
    p_notes,
    NULL,
    p_contact_email
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
    left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2),
    'booking_created',
    'skipped'
  );

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$function$;
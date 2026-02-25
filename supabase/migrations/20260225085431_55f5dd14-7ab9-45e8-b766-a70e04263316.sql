
-- ============================================
-- 1. branch_working_hours table
-- ============================================
CREATE TABLE public.branch_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.booking_branches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '10:00',
  close_time TIME NOT NULL DEFAULT '18:00',
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, day_of_week)
);

ALTER TABLE public.branch_working_hours ENABLE ROW LEVEL SECURITY;

-- Admins/staff can read
CREATE POLICY "Staff can read working hours"
  ON public.branch_working_hours FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

-- Public can read (for booking flow availability)
CREATE POLICY "Public can read working hours"
  ON public.branch_working_hours FOR SELECT
  TO anon
  USING (true);

-- Authenticated public users can also read
CREATE POLICY "Authenticated users can read working hours"
  ON public.branch_working_hours FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert working hours"
  ON public.branch_working_hours FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update working hours"
  ON public.branch_working_hours FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete working hours"
  ON public.branch_working_hours FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_branch_working_hours_updated_at
  BEFORE UPDATE ON public.branch_working_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. booking_blackouts table
-- ============================================
CREATE TABLE public.booking_blackouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'branch')),
  title TEXT NOT NULL,
  reason TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  applies_to_branch_ids UUID[] DEFAULT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_blackouts ENABLE ROW LEVEL SECURITY;

-- Public can read blackouts (needed for booking flow)
CREATE POLICY "Anyone can read blackouts"
  ON public.booking_blackouts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert blackouts"
  ON public.booking_blackouts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blackouts"
  ON public.booking_blackouts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blackouts"
  ON public.booking_blackouts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_booking_blackouts_updated_at
  BEFORE UPDATE ON public.booking_blackouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. RPC: get_available_slots
-- Returns available time slots for a branch on a date,
-- respecting working hours, blackouts, and existing bookings.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_branch_id UUID,
  p_date DATE
)
RETURNS TABLE(
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT
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
  v_current_slot TIME;
  v_slot_end TIME;
  v_booked INTEGER;
  v_blackout_title TEXT;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Get working hours for this branch + day
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_day_of_week;

  -- If no working hours configured, fall back to branch defaults
  IF NOT FOUND THEN
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes, bb.counselor_count
    INTO v_open_time, v_close_time, v_slot_minutes, v_capacity
    FROM booking_branches bb
    WHERE bb.id = p_branch_id AND bb.is_active = true;

    IF NOT FOUND THEN RETURN; END IF;

    -- Check if day is in open_days
    IF NOT EXISTS (
      SELECT 1 FROM booking_branches bb
      WHERE bb.id = p_branch_id AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN; -- closed day
    END IF;

    v_is_open := true;
  ELSE
    IF NOT v_is_open THEN RETURN; END IF;
  END IF;

  -- Get capacity
  SELECT bb.counselor_count INTO v_capacity
  FROM booking_branches bb WHERE bb.id = p_branch_id;

  IF v_capacity IS NULL THEN RETURN; END IF;

  -- Generate slots
  v_current_slot := v_open_time;
  WHILE v_current_slot < v_close_time LOOP
    v_slot_end := v_current_slot + (v_slot_minutes || ' minutes')::INTERVAL;

    -- Check blackout overlap
    v_blackout_title := NULL;
    SELECT bo.title INTO v_blackout_title
    FROM booking_blackouts bo
    WHERE bo.start_at < (p_date + v_slot_end)::TIMESTAMPTZ
      AND bo.end_at > (p_date + v_current_slot)::TIMESTAMPTZ
      AND (
        bo.scope = 'global'
        OR (bo.scope = 'branch' AND p_branch_id = ANY(bo.applies_to_branch_ids))
      )
    LIMIT 1;

    -- Count booked
    SELECT COUNT(*)::INTEGER INTO v_booked
    FROM appointments a
    WHERE a.branch_id = p_branch_id
      AND a.appointment_date = p_date
      AND a.start_time = v_current_slot
      AND a.status NOT IN ('cancelled', 'no_show');

    RETURN QUERY SELECT
      v_current_slot,
      v_booked,
      v_capacity,
      (v_blackout_title IS NULL AND v_booked < v_capacity),
      v_blackout_title;

    v_current_slot := v_current_slot + (v_slot_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;

-- ============================================
-- 4. RPC: check_slot_available (for booking validation)
-- ============================================
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
  v_slot_end TIME;
  v_has_blackout BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Check working hours
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_day_of_week;

  IF FOUND THEN
    IF NOT v_is_open THEN RETURN FALSE; END IF;
    IF p_time < v_open_time OR p_time >= v_close_time THEN RETURN FALSE; END IF;
  ELSE
    -- Fall back to branch defaults
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes
    INTO v_open_time, v_close_time, v_slot_minutes
    FROM booking_branches bb WHERE bb.id = p_branch_id AND bb.is_active = true;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM booking_branches bb
      WHERE bb.id = p_branch_id AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN FALSE;
    END IF;

    IF p_time < v_open_time OR p_time >= v_close_time THEN RETURN FALSE; END IF;
  END IF;

  v_slot_end := p_time + (COALESCE(v_slot_minutes, 60) || ' minutes')::INTERVAL;

  -- Check blackout
  SELECT EXISTS (
    SELECT 1 FROM booking_blackouts bo
    WHERE bo.start_at < (p_date + v_slot_end)::TIMESTAMPTZ
      AND bo.end_at > (p_date + p_time)::TIMESTAMPTZ
      AND (
        bo.scope = 'global'
        OR (bo.scope = 'branch' AND p_branch_id = ANY(bo.applies_to_branch_ids))
      )
  ) INTO v_has_blackout;

  IF v_has_blackout THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$function$;

-- ============================================
-- 5. Update create_appointment_atomic to validate against blackouts
-- ============================================
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

  -- Validate inputs
  IF array_length(p_services, 1) IS NULL OR array_length(p_services, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  IF v_actual_user_id IS NULL AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'contact_email is required for anonymous booking';
  END IF;

  -- *** NEW: Validate slot is available (working hours + blackouts) ***
  IF NOT check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  -- Acquire advisory lock for this slot
  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  -- Get branch capacity
  SELECT counselor_count INTO v_capacity
  FROM public.booking_branches
  WHERE id = p_branch_id AND is_active = true;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'Branch not found or inactive';
  END IF;

  -- Count existing non-cancelled appointments for this slot
  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_appointment_date
    AND start_time = p_start_time
    AND status NOT IN ('cancelled', 'no_show');

  IF v_current_count >= v_capacity THEN
    RAISE EXCEPTION 'slot_full';
  END IF;

  -- Check duplicate booking for authenticated users
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

  -- Insert appointment
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
    v_appointment_id, 'booked',
    v_actual_user_id,
    CASE WHEN v_actual_user_id IS NOT NULL THEN 'Booked by authenticated user' ELSE 'Booked by guest' END
  );

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (
    v_appointment_id,
    left(COALESCE(p_contact_email, '***'), 3) || '***',
    'booking_created', 'skipped'
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

-- ============================================
-- 6. Update create_anonymous_appointment to validate against blackouts
-- ============================================
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

  -- *** NEW: Validate slot is available (working hours + blackouts) ***
  IF NOT check_slot_available(p_branch_id, p_appointment_date, p_start_time) THEN
    RAISE EXCEPTION 'slot_blocked';
  END IF;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext(p_branch_id::text || p_appointment_date::text || p_start_time::text)
  );

  -- Capacity check
  SELECT counselor_count INTO v_capacity
  FROM public.booking_branches WHERE id = p_branch_id AND is_active = true;

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
    status, notes, user_id, contact_email
  ) VALUES (
    p_branch_id, p_service_ids[1], p_appointment_date, p_start_time,
    'booked', p_notes, NULL, p_contact_email
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  FOREACH v_sid IN ARRAY p_service_ids LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_appointment_id, 'booked', NULL, 'Booked by guest');

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (v_appointment_id, left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2), 'booking_created', 'skipped');

  RETURN jsonb_build_object(
    'id', v_appointment_id,
    'referral_code', v_referral_code
  );
END;
$function$;

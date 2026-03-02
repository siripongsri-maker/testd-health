
-- ============================================================
-- A) ANTI-SPAM: booking_rate_logs table
-- ============================================================
CREATE TABLE public.booking_rate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL DEFAULT 'anonymous',
  user_id uuid,
  session_id text,
  contact_phone_hash text,
  branch_id uuid REFERENCES public.booking_branches(id),
  action text NOT NULL CHECK (action IN ('allow', 'blocked')),
  reason_code text,
  meta jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.booking_rate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read rate logs" ON public.booking_rate_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System insert rate logs" ON public.booking_rate_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_booking_rate_logs_created ON public.booking_rate_logs (created_at DESC);
CREATE INDEX idx_booking_rate_logs_branch ON public.booking_rate_logs (branch_id, created_at DESC);

-- ============================================================
-- B) AUTO-CHECKOUT: add column to appointments
-- ============================================================
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS auto_checked_out_at timestamptz;

-- ============================================================
-- C) Rate limit check function
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit(
  p_user_id uuid,
  p_contact_phone text,
  p_branch_id uuid,
  p_session_id text DEFAULT NULL,
  p_is_staff boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone_hash text;
  v_phone_count int;
  v_user_count int;
  v_duplicate_exists boolean;
BEGIN
  -- Staff bypass
  IF p_is_staff THEN
    INSERT INTO booking_rate_logs (actor_type, user_id, branch_id, action, reason_code, meta)
    VALUES ('admin', p_user_id, p_branch_id, 'allow', 'staff_bypass', '{}'::jsonb);
    RETURN jsonb_build_object('allowed', true, 'reason', 'staff_bypass');
  END IF;

  v_phone_hash := CASE WHEN p_contact_phone IS NOT NULL AND p_contact_phone != ''
    THEN encode(extensions.digest(p_contact_phone::bytea, 'sha256'), 'hex')
    ELSE NULL END;

  -- 1. Phone rate limit: max 2 per 30 min per branch
  IF p_contact_phone IS NOT NULL AND p_contact_phone != '' THEN
    SELECT COUNT(*) INTO v_phone_count
    FROM appointments
    WHERE branch_id = p_branch_id
      AND contact_phone = p_contact_phone
      AND created_at > now() - interval '30 minutes'
      AND status NOT IN ('cancelled');

    IF v_phone_count >= 2 THEN
      INSERT INTO booking_rate_logs (actor_type, user_id, contact_phone_hash, branch_id, action, reason_code)
      VALUES (
        CASE WHEN p_user_id IS NOT NULL THEN 'user' ELSE 'anonymous' END,
        p_user_id, v_phone_hash, p_branch_id, 'blocked', 'rate_limited_phone'
      );
      RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited_phone', 'wait_minutes', 30);
    END IF;
  END IF;

  -- 2. User rate limit: max 3 per 30 min all branches
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_count
    FROM appointments
    WHERE user_id = p_user_id
      AND created_at > now() - interval '30 minutes'
      AND status NOT IN ('cancelled');

    IF v_user_count >= 3 THEN
      INSERT INTO booking_rate_logs (actor_type, user_id, branch_id, action, reason_code)
      VALUES ('user', p_user_id, p_branch_id, 'blocked', 'rate_limited_user');
      RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited_user', 'wait_minutes', 30);
    END IF;
  END IF;

  -- 3. Duplicate active check: same phone + branch with active booking today or future
  IF p_contact_phone IS NOT NULL AND p_contact_phone != '' THEN
    SELECT EXISTS(
      SELECT 1 FROM appointments
      WHERE branch_id = p_branch_id
        AND contact_phone = p_contact_phone
        AND status NOT IN ('cancelled', 'no_show', 'checked_out', 'completed')
        AND appointment_date >= CURRENT_DATE
    ) INTO v_duplicate_exists;

    IF v_duplicate_exists THEN
      INSERT INTO booking_rate_logs (actor_type, user_id, contact_phone_hash, branch_id, action, reason_code)
      VALUES (
        CASE WHEN p_user_id IS NOT NULL THEN 'user' ELSE 'anonymous' END,
        p_user_id, v_phone_hash, p_branch_id, 'blocked', 'duplicate_active'
      );
      RETURN jsonb_build_object('allowed', false, 'reason', 'duplicate_active');
    END IF;
  END IF;

  -- All checks passed
  INSERT INTO booking_rate_logs (actor_type, user_id, contact_phone_hash, branch_id, action, reason_code)
  VALUES (
    CASE WHEN p_user_id IS NOT NULL THEN 'user' ELSE 'anonymous' END,
    p_user_id, v_phone_hash, p_branch_id, 'allow', 'passed'
  );
  RETURN jsonb_build_object('allowed', true, 'reason', 'passed');
END;
$$;

-- ============================================================
-- D) Update create_appointment_atomic to include rate limit check
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_branch_id uuid, p_appointment_date date, p_start_time time without time zone,
  p_services uuid[], p_contact_email text DEFAULT NULL, p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL, p_contact_phone text DEFAULT NULL, p_contact_line text DEFAULT NULL
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
  v_is_staff boolean;
  v_rate_check jsonb;
BEGIN
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  v_source := 'appointment';

  IF array_length(p_services, 1) IS NULL OR array_length(p_services, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  IF v_actual_user_id IS NULL AND (p_contact_phone IS NULL OR p_contact_phone = '') AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'At least phone or email is required for anonymous booking';
  END IF;

  -- Rate limit check
  v_is_staff := CASE WHEN v_actual_user_id IS NOT NULL THEN
    (has_role(v_actual_user_id, 'admin') OR EXISTS(SELECT 1 FROM staff_profiles WHERE user_id = v_actual_user_id AND is_active = true))
    ELSE false END;

  v_rate_check := check_booking_rate_limit(v_actual_user_id, p_contact_phone, p_branch_id, NULL, v_is_staff);
  IF NOT (v_rate_check->>'allowed')::boolean THEN
    RAISE EXCEPTION '%', v_rate_check->>'reason';
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
  FROM public.booking_branches WHERE id = p_branch_id AND is_active = true;
  IF v_capacity IS NULL THEN RAISE EXCEPTION 'Branch not found or inactive'; END IF;

  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_appointment_date
    AND start_time = p_start_time AND status NOT IN ('cancelled', 'no_show');

  IF v_current_count >= v_capacity THEN RAISE EXCEPTION 'slot_full'; END IF;

  INSERT INTO public.appointments (
    branch_id, service_id, appointment_date, start_time,
    status, notes, user_id, contact_email, contact_phone, contact_line, source
  ) VALUES (
    p_branch_id, p_services[1], p_appointment_date, p_start_time,
    'booked', p_notes, v_actual_user_id,
    NULLIF(p_contact_email, ''), p_contact_phone, p_contact_line, v_source
  )
  RETURNING id, referral_code INTO v_appointment_id, v_referral_code;

  FOREACH v_sid IN ARRAY p_services LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id) VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_appointment_id, 'booked', v_actual_user_id, 'Booked via app');

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (v_appointment_id,
    CASE WHEN p_contact_email IS NOT NULL AND p_contact_email != ''
      THEN left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2)
      ELSE '***' END,
    'booking_created', 'skipped');

  RETURN jsonb_build_object('id', v_appointment_id, 'referral_code', v_referral_code);
END;
$$;

-- ============================================================
-- E) Update create_anonymous_appointment to include rate limit check
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid, p_service_ids uuid[], p_appointment_date date,
  p_start_time time without time zone, p_contact_email text DEFAULT NULL,
  p_notes text DEFAULT NULL, p_contact_phone text DEFAULT NULL, p_contact_line text DEFAULT NULL
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
  v_rate_check jsonb;
BEGIN
  IF (p_contact_phone IS NULL OR p_contact_phone = '') AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'At least phone or email is required for anonymous booking';
  END IF;

  IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  -- Rate limit check (anonymous - no staff bypass)
  v_rate_check := check_booking_rate_limit(NULL, p_contact_phone, p_branch_id, NULL, false);
  IF NOT (v_rate_check->>'allowed')::boolean THEN
    RAISE EXCEPTION '%', v_rate_check->>'reason';
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
  FROM public.booking_branches WHERE id = p_branch_id AND is_active = true;
  IF v_capacity IS NULL THEN RAISE EXCEPTION 'Branch not found or inactive'; END IF;

  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_appointment_date
    AND start_time = p_start_time AND status NOT IN ('cancelled', 'no_show');

  IF v_current_count >= v_capacity THEN RAISE EXCEPTION 'slot_full'; END IF;

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
    INSERT INTO public.appointment_services (appointment_id, service_id) VALUES (v_appointment_id, v_sid);
  END LOOP;

  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_appointment_id, 'booked', NULL, 'Booked by guest');

  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (v_appointment_id,
    CASE WHEN p_contact_email IS NOT NULL AND p_contact_email != ''
      THEN left(p_contact_email, 3) || '***@' || split_part(p_contact_email, '@', 2)
      ELSE '***' END,
    'booking_created', 'skipped');

  RETURN jsonb_build_object('id', v_appointment_id, 'referral_code', v_referral_code);
END;
$$;

-- ============================================================
-- F) Auto-checkout function (called by edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_checkout_stale_appointments(p_threshold_hours int DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH stale AS (
    SELECT id FROM appointments
    WHERE status IN ('arrived', 'waiting')
      AND arrived_at IS NOT NULL
      AND checked_out_at IS NULL
      AND arrived_at < now() - make_interval(hours => p_threshold_hours)
  )
  UPDATE appointments a
  SET status = 'checked_out',
      checked_out_at = now(),
      auto_checked_out_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - a.arrived_at))::integer / 60,
      updated_at = now()
  FROM stale
  WHERE a.id = stale.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log each auto-checkout
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  SELECT id, 'auto_checkout', NULL, 'Auto checked out after ' || p_threshold_hours || ' hours (system)'
  FROM appointments
  WHERE auto_checked_out_at IS NOT NULL
    AND auto_checked_out_at > now() - interval '1 minute';

  RETURN v_count;
END;
$$;

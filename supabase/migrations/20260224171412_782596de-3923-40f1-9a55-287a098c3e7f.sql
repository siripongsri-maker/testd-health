
-- =============================================
-- OPS BUNDLE MIGRATION
-- =============================================

-- A) Staff Profiles: Add staff_role column
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS staff_role text NOT NULL DEFAULT 'branch_staff';

-- Validation trigger for staff_role
CREATE OR REPLACE FUNCTION public.validate_staff_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.staff_role NOT IN ('branch_staff', 'branch_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid staff_role: %. Must be branch_staff, branch_admin, or super_admin', NEW.staff_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_staff_role ON public.staff_profiles;
CREATE TRIGGER trg_validate_staff_role
BEFORE INSERT OR UPDATE ON public.staff_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_staff_role();

-- A) Helper functions
CREATE OR REPLACE FUNCTION public.current_staff_profile()
RETURNS SETOF public.staff_profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.staff_profiles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_booking_staff(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND branch_id = p_branch_id
      AND staff_role IN ('branch_staff', 'branch_admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_booking_branch_admin(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND (
        (staff_role = 'branch_admin' AND branch_id = p_branch_id)
        OR staff_role = 'super_admin'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_booking_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND staff_role = 'super_admin'
  );
$$;

-- C) Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_branch_date_time 
  ON appointments (branch_id, appointment_date, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_branch_status 
  ON appointments (branch_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id 
  ON appointments (user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_branch_arrived 
  ON appointments (branch_id, arrived_at) WHERE arrived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_branch_checked_out 
  ON appointments (branch_id, checked_out_at) WHERE checked_out_at IS NOT NULL;

-- D) Fix award_xp_to_user: raise cap to 1500, allow self-award
CREATE OR REPLACE FUNCTION public.award_xp_to_user(target_user_id uuid, xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow positive XP amounts up to 1500
  IF xp_amount <= 0 OR xp_amount > 1500 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;
  
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles 
  SET xp = COALESCE(xp, 0) + xp_amount,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- D) Atomic booking RPC with capacity lock
CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_branch_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_services uuid[],
  p_contact_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Determine user
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Determine source
  IF v_actual_user_id IS NOT NULL THEN
    v_source := 'appointment';
  ELSE
    v_source := 'appointment';
  END IF;

  -- Validate inputs
  IF array_length(p_services, 1) IS NULL OR array_length(p_services, 1) = 0 THEN
    RAISE EXCEPTION 'At least one service is required';
  END IF;

  IF v_actual_user_id IS NULL AND (p_contact_email IS NULL OR p_contact_email = '') THEN
    RAISE EXCEPTION 'contact_email is required for anonymous booking';
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

  -- Insert appointment (referral_code generated by trigger)
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

  -- Insert appointment_services
  FOREACH v_sid IN ARRAY p_services LOOP
    INSERT INTO public.appointment_services (appointment_id, service_id)
    VALUES (v_appointment_id, v_sid);
  END LOOP;

  -- Log the booking
  INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    v_appointment_id, 'booked',
    v_actual_user_id,
    CASE WHEN v_actual_user_id IS NOT NULL THEN 'Booked by authenticated user' ELSE 'Booked by guest' END
  );

  -- Log notification as skipped
  INSERT INTO public.notification_logs (appointment_id, email_masked, notification_type, status)
  VALUES (
    v_appointment_id,
    left(COALESCE(p_contact_email, '***'), 3) || '***',
    'booking_created', 'skipped'
  );

  -- Award XP for authenticated users (directly update, bypass RPC restrictions)
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
$$;

-- Also update create_anonymous_appointment with advisory lock
CREATE OR REPLACE FUNCTION public.create_anonymous_appointment(
  p_branch_id uuid, p_service_ids uuid[], p_appointment_date date,
  p_start_time time, p_contact_email text, p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- E) Auto no-show RPC
CREATE OR REPLACE FUNCTION public.mark_no_show_expired(p_branch_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_apt RECORD;
BEGIN
  v_count := 0;

  FOR v_apt IN
    SELECT id FROM public.appointments
    WHERE status IN ('booked', 'confirmed')
      AND (appointment_date + start_time) < (now() AT TIME ZONE 'Asia/Bangkok' - interval '6 hours')
      AND arrived_at IS NULL
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
  LOOP
    UPDATE public.appointments
    SET status = 'no_show', updated_at = now()
    WHERE id = v_apt.id;

    INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
    VALUES (v_apt.id, 'no_show_auto', NULL, 'System auto no-show after 6 hours');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- F) Today board RPC
CREATE OR REPLACE FUNCTION public.get_branch_today_board(
  p_branch_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booked integer;
  v_arrived_waiting integer;
  v_checked_out integer;
  v_no_show integer;
  v_avg_duration numeric;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify access: must be admin or staff for this branch
  IF NOT (
    has_role(v_actor_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      WHERE sba.user_id = v_actor_id AND bb.id = p_branch_id
    ) OR
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE user_id = v_actor_id AND is_active = true
        AND (branch_id = p_branch_id OR staff_role = 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COUNT(*) INTO v_booked
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND status NOT IN ('cancelled');

  SELECT COUNT(*) INTO v_arrived_waiting
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND arrived_at IS NOT NULL AND checked_out_at IS NULL
    AND status NOT IN ('cancelled', 'no_show');

  SELECT COUNT(*) INTO v_checked_out
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND checked_out_at IS NOT NULL;

  SELECT COUNT(*) INTO v_no_show
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND status = 'no_show';

  SELECT COALESCE(AVG(duration_minutes), 0) INTO v_avg_duration
  FROM appointments
  WHERE branch_id = p_branch_id AND appointment_date = p_date
    AND checked_out_at IS NOT NULL AND duration_minutes IS NOT NULL;

  RETURN jsonb_build_object(
    'booked_today', v_booked,
    'arrived_waiting', v_arrived_waiting,
    'checked_out_today', v_checked_out,
    'no_show_today', v_no_show,
    'avg_duration_minutes', round(v_avg_duration, 1)
  );
END;
$$;

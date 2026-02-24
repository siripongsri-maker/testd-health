
-- Add walk-in support columns to appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'appointment',
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Note: completed_at already exists on the table

-- Create RPC for staff to create walk-in appointments
CREATE OR REPLACE FUNCTION public.create_walkin_appointment(
  p_branch_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text;
  v_staff_id uuid;
BEGIN
  -- Verify caller is admin or branch staff
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      WHERE sba.user_id = auth.uid() AND bb.id = p_branch_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Generate referral code
  v_code := 'SWG-W-' || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO appointments (
    branch_id, appointment_date, start_time, status, source,
    arrived_at, notes, referral_code
  ) VALUES (
    p_branch_id,
    CURRENT_DATE,
    to_char(now() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')::time,
    'waiting',
    'walkin',
    now(),
    p_notes
  )
  RETURNING id INTO v_id;

  SELECT referral_code INTO v_code FROM appointments WHERE id = v_id;

  -- Log
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_id, 'walkin_created', auth.uid(), 'Walk-in registered at reception');

  RETURN jsonb_build_object('id', v_id, 'referral_code', v_code);
END;
$$;

-- RPC for staff to mark walk-in as started
CREATE OR REPLACE FUNCTION public.start_walkin_service(
  p_appointment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin or branch staff
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      JOIN appointments a ON a.branch_id = bb.id
      WHERE sba.user_id = auth.uid() AND a.id = p_appointment_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE appointments
  SET started_at = now(), status = 'in_progress', updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'service_started', auth.uid(), 'Service started');
END;
$$;

-- RPC for staff to mark walk-in as done
CREATE OR REPLACE FUNCTION public.complete_walkin_service(
  p_appointment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      JOIN appointments a ON a.branch_id = bb.id
      WHERE sba.user_id = auth.uid() AND a.id = p_appointment_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE appointments
  SET completed_at = now(), status = 'completed', updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'service_completed', auth.uid(), 'Service completed');
END;
$$;

-- RPC to get active walk-in count for a branch on a given date (for client-side wait estimation)
CREATE OR REPLACE FUNCTION public.get_walkin_pressure(
  p_branch_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active int;
  v_recent int;
BEGIN
  -- Active walk-ins (waiting or in_service right now)
  SELECT count(*) INTO v_active
  FROM appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_date
    AND source = 'walkin'
    AND status IN ('waiting', 'in_progress');

  -- Walk-ins arrived in last 90 minutes
  SELECT count(*) INTO v_recent
  FROM appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_date
    AND source = 'walkin'
    AND arrived_at >= (now() - interval '90 minutes');

  RETURN jsonb_build_object(
    'active_walkins', v_active,
    'recent_walkins_90min', v_recent
  );
END;
$$;

-- Add 'waiting' to status options (appointments use text status so no enum needed)

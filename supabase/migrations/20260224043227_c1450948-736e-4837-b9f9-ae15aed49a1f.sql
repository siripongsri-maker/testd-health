
-- Enable realtime for appointments and appointment_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_logs;

-- Add attended_by column reference for staff assignment (already exists based on schema)
-- Create secure RPCs for staff operations

-- 1. Update appointment status (staff/admin/user with proper checks)
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_old_status text;
  v_actor_id uuid;
  v_is_admin boolean;
  v_is_branch_staff boolean;
  v_is_owner boolean;
  v_actor_role text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get current appointment
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  v_old_status := v_appointment.status;

  -- Check permissions
  v_is_admin := has_role(v_actor_id, 'admin');
  v_is_owner := (v_appointment.user_id = v_actor_id);
  v_is_branch_staff := EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = v_actor_id AND bb.id = v_appointment.branch_id
  );

  IF NOT (v_is_admin OR v_is_branch_staff OR v_is_owner) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Users can only cancel their own appointments
  IF v_is_owner AND NOT v_is_admin AND NOT v_is_branch_staff THEN
    IF p_new_status != 'cancelled' THEN
      RAISE EXCEPTION 'Users can only cancel appointments';
    END IF;
  END IF;

  -- Validate status transition
  IF p_new_status NOT IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Determine actor role for logging
  IF v_is_admin THEN v_actor_role := 'admin';
  ELSIF v_is_branch_staff THEN v_actor_role := 'staff';
  ELSE v_actor_role := 'user';
  END IF;

  -- Update
  UPDATE appointments SET
    status = p_new_status,
    updated_at = now(),
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN COALESCE(p_reason, cancellation_reason) ELSE cancellation_reason END
  WHERE id = p_appointment_id;

  -- Log the change
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (
    p_appointment_id,
    'status_changed_to_' || p_new_status,
    v_actor_id,
    format('Status changed from %s to %s by %s. %s', v_old_status, p_new_status, v_actor_role, COALESCE(p_reason, ''))
  );
END;
$$;

-- 2. Assign staff to appointment
CREATE OR REPLACE FUNCTION public.assign_staff_to_appointment(
  p_appointment_id uuid,
  p_staff_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_staff RECORD;
  v_actor_id uuid;
  v_is_admin boolean;
  v_is_branch_staff boolean;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;

  SELECT * INTO v_staff FROM staff_profiles WHERE id = p_staff_profile_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff profile not found'; END IF;

  -- Verify staff belongs to same branch
  IF v_staff.branch_id IS NOT NULL AND v_staff.branch_id != v_appointment.branch_id THEN
    RAISE EXCEPTION 'Staff must belong to the same branch as the appointment';
  END IF;

  v_is_admin := has_role(v_actor_id, 'admin');
  v_is_branch_staff := EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = v_actor_id AND bb.id = v_appointment.branch_id
  );

  IF NOT (v_is_admin OR v_is_branch_staff) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE appointments SET attended_by = p_staff_profile_id, updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'staff_assigned', v_actor_id, 
    format('Assigned staff %s %s', v_staff.name_en, v_staff.name_th));
END;
$$;

-- 3. Add staff note
CREATE OR REPLACE FUNCTION public.add_staff_note(
  p_appointment_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_actor_id uuid;
  v_is_admin boolean;
  v_is_branch_staff boolean;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_note IS NULL OR trim(p_note) = '' THEN RAISE EXCEPTION 'Note cannot be empty'; END IF;
  IF length(p_note) > 2000 THEN RAISE EXCEPTION 'Note too long (max 2000 chars)'; END IF;

  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;

  v_is_admin := has_role(v_actor_id, 'admin');
  v_is_branch_staff := EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = v_actor_id AND bb.id = v_appointment.branch_id
  );

  IF NOT (v_is_admin OR v_is_branch_staff) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE appointments SET
    staff_notes = CASE 
      WHEN staff_notes IS NULL OR staff_notes = '' THEN p_note
      ELSE staff_notes || E'\n---\n' || p_note
    END,
    updated_at = now()
  WHERE id = p_appointment_id;

  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (p_appointment_id, 'staff_note_added', v_actor_id, left(p_note, 200));
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_appointment_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_staff_to_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_staff_note TO authenticated;

-- Allow staff to INSERT into appointment_logs (needed for existing client-side inserts)
CREATE POLICY "Staff can insert branch appointment logs"
ON public.appointment_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN staff_branch_assignments sba ON sba.user_id = auth.uid()
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE a.id = appointment_logs.appointment_id AND bb.id = a.branch_id
  )
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_logs.appointment_id AND a.user_id = auth.uid()
  )
);

-- Allow staff to SELECT appointment logs for their branch
CREATE POLICY "Staff can view branch appointment logs"
ON public.appointment_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN staff_branch_assignments sba ON sba.user_id = auth.uid()
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE a.id = appointment_logs.appointment_id AND bb.id = a.branch_id
  )
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_logs.appointment_id AND a.user_id = auth.uid()
  )
);

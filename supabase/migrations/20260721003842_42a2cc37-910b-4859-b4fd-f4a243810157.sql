
-- 1) appointment_services: strengthen staff SELECT with explicit ownership check
CREATE OR REPLACE FUNCTION public.staff_can_access_appointment(_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN booking_branches bb ON bb.id = a.branch_id
    JOIN staff_branch_assignments sba
      ON sba.user_id = auth.uid() AND sba.branch = bb.slug
    WHERE a.id = _appointment_id
  );
$$;

DROP POLICY IF EXISTS "Staff can view branch appointment services" ON public.appointment_services;
CREATE POLICY "Staff can view branch appointment services"
ON public.appointment_services
FOR SELECT
TO authenticated
USING (
  public.staff_can_access_appointment(appointment_id)
  AND EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_services.appointment_id
      AND a.branch_id IS NOT NULL
  )
);

-- 2) guest_lookup_attempts: tighten INSERT WITH CHECK to reduce PII abuse
DROP POLICY IF EXISTS "Anyone can insert lookup attempts" ON public.guest_lookup_attempts;
CREATE POLICY "Anyone can insert lookup attempts"
ON public.guest_lookup_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (email IS NULL OR (length(email) BETWEEN 3 AND 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
  AND (referral_code IS NULL OR length(referral_code) BETWEEN 3 AND 64)
);

-- 3) survey_responses: prevent tampering with anonymous rows once completed
DROP POLICY IF EXISTS "Anyone can complete anonymous responses" ON public.survey_responses;
CREATE POLICY "Anyone can complete anonymous responses"
ON public.survey_responses
FOR UPDATE
TO anon, authenticated
USING (user_id IS NULL AND completed_at IS NULL)
WITH CHECK (user_id IS NULL AND completed_at IS NOT NULL);

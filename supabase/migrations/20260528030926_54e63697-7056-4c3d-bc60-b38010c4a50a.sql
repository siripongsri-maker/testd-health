
-- 1. appointment_pre_service_surveys: add ownership check
DROP POLICY IF EXISTS "Anyone can submit pre-service survey for a real booking" ON public.appointment_pre_service_surveys;

CREATE POLICY "Submit pre-service survey for own booking"
ON public.appointment_pre_service_surveys
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_pre_service_surveys.booking_id
      AND (
        a.user_id = auth.uid()
        OR (a.user_id IS NULL AND a.contact_email IS NOT NULL)
        OR (a.user_id IS NULL AND a.contact_phone IS NOT NULL)
      )
  )
);

-- 2. hr_dose_logs: scope insert to current user (or null for anon)
DROP POLICY IF EXISTS "Users can insert own dose logs" ON public.hr_dose_logs;

CREATE POLICY "Anon can insert anonymous dose logs"
ON public.hr_dose_logs
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can insert own dose logs"
ON public.hr_dose_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3. hr_nudge_events: scope insert to current user
DROP POLICY IF EXISTS "Anyone can insert nudge events" ON public.hr_nudge_events;

CREATE POLICY "Anon can insert anonymous nudge events"
ON public.hr_nudge_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can insert own nudge events"
ON public.hr_nudge_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4. pdpa_audit_logs: enforce actor_id matches auth.uid
DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.pdpa_audit_logs;

CREATE POLICY "Users insert own audit logs"
ON public.pdpa_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

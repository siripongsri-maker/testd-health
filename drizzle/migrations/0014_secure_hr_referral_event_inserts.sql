DROP POLICY IF EXISTS "Anyone can insert referral events" ON public.hr_referral_events;

CREATE POLICY "Users can insert own or anonymous referral events"
ON public.hr_referral_events
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
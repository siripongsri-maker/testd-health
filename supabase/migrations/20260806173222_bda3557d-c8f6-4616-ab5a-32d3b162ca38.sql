-- 1. Distress alerts: no spoofing another user's id
DROP POLICY IF EXISTS "Anyone can insert distress alerts" ON public.hr_distress_alerts;
CREATE POLICY "Anyone can insert distress alerts"
ON public.hr_distress_alerts
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. Safety alert events: same ownership binding
DROP POLICY IF EXISTS "Anyone can insert alerts" ON public.hr_safety_alert_events;
CREATE POLICY "Anyone can insert alerts"
ON public.hr_safety_alert_events
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3. Check-ins: anonymous rows must carry a device token (unique per day) and a sane date
DROP POLICY IF EXISTS "Users insert own checkins" ON public.hr_checkins;
CREATE POLICY "Users insert own checkins"
ON public.hr_checkins
FOR INSERT
TO anon, authenticated
WITH CHECK (
  checkin_date BETWEEN (CURRENT_DATE - 1) AND (CURRENT_DATE + 1)
  AND (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (
      user_id IS NULL
      AND anonymous_token IS NOT NULL
      AND length(anonymous_token) BETWEEN 8 AND 128
    )
  )
);

-- 4. Anonymous survey completion limited to a short window after creation
DROP POLICY IF EXISTS "Anyone can complete anonymous responses" ON public.survey_responses;
CREATE POLICY "Anyone can complete anonymous responses"
ON public.survey_responses
FOR UPDATE
TO anon, authenticated
USING (
  user_id IS NULL
  AND completed_at IS NULL
  AND created_at > (now() - interval '12 hours')
)
WITH CHECK (
  user_id IS NULL
  AND completed_at IS NOT NULL
);
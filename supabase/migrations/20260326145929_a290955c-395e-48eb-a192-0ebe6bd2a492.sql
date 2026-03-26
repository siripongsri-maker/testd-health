
-- ============================================================
-- SECURITY AUDIT FIX MIGRATION
-- ============================================================

-- 1. FIX: feedback_summary view missing security_invoker (ERROR)
DROP VIEW IF EXISTS public.feedback_summary;
CREATE OR REPLACE VIEW public.feedback_summary
WITH (security_invoker = on) AS
SELECT
  (date_trunc('month', service_date::timestamptz))::date AS month,
  channel,
  branch_id,
  count(*) AS total_responses,
  round(avg(counselling_quality_percent), 1) AS avg_quality_pct,
  round(avg(satisfaction_score), 2) AS avg_satisfaction,
  round(avg(self_efficacy_score), 2) AS avg_self_efficacy,
  count(*) FILTER (WHERE received_sti) AS sti_count,
  count(*) FILTER (WHERE received_prep) AS prep_count,
  count(*) FILTER (WHERE received_pep) AS pep_count,
  count(*) FILTER (WHERE received_art) AS art_count,
  count(*) FILTER (WHERE received_harm_reduction) AS hr_count,
  count(*) FILTER (WHERE received_mental_health) AS mh_count,
  round(avg(sti_knowledge_score) FILTER (WHERE received_sti), 2) AS avg_sti_knowledge,
  round(avg(prep_knowledge_score) FILTER (WHERE received_prep), 2) AS avg_prep_knowledge,
  round(avg(pep_knowledge_score) FILTER (WHERE received_pep), 2) AS avg_pep_knowledge,
  round(avg(art_knowledge_score) FILTER (WHERE received_art), 2) AS avg_art_knowledge,
  round(avg(hr_knowledge_score) FILTER (WHERE received_harm_reduction), 2) AS avg_hr_knowledge,
  count(*) FILTER (WHERE mh_outcome IN ('much_better', 'slightly_better')) AS mh_improved,
  count(*) FILTER (WHERE received_mental_health) AS mh_total
FROM client_feedback_responses
WHERE status = 'submitted'
GROUP BY (date_trunc('month', service_date::timestamptz))::date, channel, branch_id;

-- 2. FIX: profiles table publicly exposing health data (ERROR)
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view leaderboard profiles" ON public.profiles;

CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator') OR
  public.has_role(auth.uid(), 'me_analyst')
);

GRANT SELECT ON public.leaderboard_profiles TO anon, authenticated;

-- 3. FIX: appointment_action_codes publicly readable (ERROR)
DROP POLICY IF EXISTS "Public read appointment_action_codes" ON public.appointment_action_codes;

CREATE POLICY "Admin can read appointment_action_codes"
ON public.appointment_action_codes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator')
);

-- 4. FIX: hr_checkins anon can read ALL records (ERROR)
DROP POLICY IF EXISTS "Anon can read own checkins by token" ON public.hr_checkins;

CREATE POLICY "Anon cannot read others checkins"
ON public.hr_checkins FOR SELECT TO anon
USING (false);

-- 5. FIX: visitor_attribution UPDATE with USING(true) (ERROR)
DROP POLICY IF EXISTS "Anyone can update own visitor_attribution" ON public.visitor_attribution;

CREATE POLICY "Users can update own visitor_attribution"
ON public.visitor_attribution FOR UPDATE TO anon, authenticated
USING (
  anonymous_id = current_setting('request.headers', true)::json->>'x-anonymous-id'
  OR (user_id IS NOT NULL AND user_id = auth.uid())
)
WITH CHECK (
  anonymous_id = current_setting('request.headers', true)::json->>'x-anonymous-id'
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

-- 6. FIX: partner_invite_responses UPDATE with USING(true) (ERROR)
-- Table has: id, invite_id, visitor_session_id, response_state, created_at, updated_at
DROP POLICY IF EXISTS "Anyone can update own responses" ON public.partner_invite_responses;

CREATE POLICY "Users can update own invite responses"
ON public.partner_invite_responses FOR UPDATE TO anon, authenticated
USING (
  visitor_session_id = current_setting('request.headers', true)::json->>'x-visitor-session'
)
WITH CHECK (
  visitor_session_id = current_setting('request.headers', true)::json->>'x-visitor-session'
);

DROP POLICY IF EXISTS "Anyone can read own responses" ON public.partner_invite_responses;

CREATE POLICY "Users can read own invite responses"
ON public.partner_invite_responses FOR SELECT TO anon, authenticated
USING (
  visitor_session_id = current_setting('request.headers', true)::json->>'x-visitor-session'
  OR public.has_role(auth.uid(), 'admin')
);

-- 7. FIX: partner_test_sessions UPDATE with USING(true) (ERROR)
-- Table has: id, host_invite_id, session_code, status, max_participants, started_at, completed_at, created_at, pair_booking_count, is_test_mode
DROP POLICY IF EXISTS "Anyone can update session status" ON public.partner_test_sessions;

CREATE POLICY "Participants can update own session"
ON public.partner_test_sessions FOR UPDATE TO anon, authenticated
USING (
  session_code = current_setting('request.headers', true)::json->>'x-session-code'
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  session_code = current_setting('request.headers', true)::json->>'x-session-code'
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Public can read sessions by code" ON public.partner_test_sessions;

CREATE POLICY "Users can read sessions by code"
ON public.partner_test_sessions FOR SELECT TO anon, authenticated
USING (
  session_code = current_setting('request.headers', true)::json->>'x-session-code'
  OR public.has_role(auth.uid(), 'admin')
);

-- 8. FIX: hall_of_fame exposes user_id (WARN)
DROP POLICY IF EXISTS "Anyone can view hall of fame" ON public.hall_of_fame;

CREATE POLICY "Admin can view hall of fame"
ON public.hall_of_fame FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.hall_of_fame_public TO anon, authenticated;

-- 9. FIX: hr_voice_integration_settings publicly readable (WARN)
DROP POLICY IF EXISTS "Anyone can read voice settings" ON public.hr_voice_integration_settings;

CREATE POLICY "Authenticated can read voice settings"
ON public.hr_voice_integration_settings FOR SELECT TO authenticated
USING (true);

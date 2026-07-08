
-- Fix hr_checkins INSERT: require user_id IS NULL or matches auth.uid()
DROP POLICY IF EXISTS "Anyone can insert checkins" ON public.hr_checkins;
CREATE POLICY "Users insert own checkins"
  ON public.hr_checkins
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Fix partner_test_sessions INSERT: host_invite_id must belong to auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert sessions" ON public.partner_test_sessions;
CREATE POLICY "Host can insert own sessions"
  ON public.partner_test_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR host_invite_id IN (
      SELECT partner_invites.id
      FROM partner_invites
      WHERE partner_invites.created_by = auth.uid()
    )
  );

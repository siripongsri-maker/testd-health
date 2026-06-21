
DROP POLICY IF EXISTS "Authenticated can read sessions" ON public.partner_test_sessions;

CREATE POLICY "Host admin or participant can read sessions"
ON public.partner_test_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR host_invite_id IN (
    SELECT id FROM public.partner_invites WHERE created_by = auth.uid()
  )
  OR id IN (
    SELECT session_id FROM public.partner_test_session_participants
    WHERE participant_session_id = (auth.jwt() ->> 'sub')
  )
);


-- 1) Restrict anon column access on queue TV tables
REVOKE SELECT ON public.client_visit_flows FROM anon;
GRANT SELECT (id, branch_id, visit_date, visit_number, visit_code, current_step, current_status, is_completed, is_cancelled, completed_at, cancelled_at, created_at, updated_at)
  ON public.client_visit_flows TO anon;

REVOKE SELECT ON public.client_visit_flow_steps FROM anon;
GRANT SELECT (id, visit_id, branch_id, step_code, queue_number, queue_code, room_number, step_status, entered_at, called_at, started_at, completed_at, created_at, updated_at)
  ON public.client_visit_flow_steps TO anon;

-- 2) Admin SELECT policies for email log tables
CREATE POLICY "Admins can read send log"
  ON public.email_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read suppressed emails"
  ON public.suppressed_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Lock down partner_test_sessions / participants anon SELECT enumeration
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.partner_test_sessions;
DROP POLICY IF EXISTS "Anyone can read participants" ON public.partner_test_session_participants;

CREATE POLICY "Authenticated can read sessions"
  ON public.partner_test_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can read participants"
  ON public.partner_test_session_participants FOR SELECT TO authenticated
  USING (true);

-- Anonymous lookups go through these SECURITY DEFINER RPCs (requires knowing the session_code / invite id)
CREATE OR REPLACE FUNCTION public.get_partner_session_code_by_invite(p_invite_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_code FROM public.partner_test_sessions WHERE host_invite_id = p_invite_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_session_code_by_invite(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_session_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  session_code text,
  status text,
  max_participants integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  pair_booking_count integer,
  is_test_mode boolean,
  invite_code text,
  invite_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.session_code, s.status, s.max_participants, s.started_at, s.completed_at,
         s.created_at, s.pair_booking_count, s.is_test_mode,
         i.code AS invite_code, i.id AS invite_id
  FROM public.partner_test_sessions s
  LEFT JOIN public.partner_invites i ON i.id = s.host_invite_id
  WHERE s.session_code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_session_by_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_session_participants(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  participant_session_id text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, session_id, participant_session_id, joined_at
  FROM public.partner_test_session_participants
  WHERE session_id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_session_participants(uuid) TO anon, authenticated;


-- 1. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.selftest_pii;
ALTER PUBLICATION supabase_realtime DROP TABLE public.clinic_walkins;
ALTER PUBLICATION supabase_realtime DROP TABLE public.counseling_sessions;

-- 2. hr_call_events: admin/moderator only
DROP POLICY IF EXISTS "Admins can read call events" ON public.hr_call_events;
CREATE POLICY "Admins can read call events" ON public.hr_call_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

-- 3. permission_matrix: admin/moderator only
DROP POLICY IF EXISTS "Authenticated read permission matrix" ON public.permission_matrix;
CREATE POLICY "Admins read permission matrix" ON public.permission_matrix
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

-- 4. kit_order_events: drop overly broad SELECT, keep strict one
DROP POLICY IF EXISTS "Users can view their order events" ON public.kit_order_events;

-- 5. hr_user_profile: remove insecure anon read (anon clients use localStorage)
DROP POLICY IF EXISTS "Anon can read own hr profile" ON public.hr_user_profile;

-- 6. partner_test_sessions: scope UPDATE
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.partner_test_sessions;
CREATE POLICY "Host or admin can update sessions" ON public.partner_test_sessions
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR is_test_mode = true
    OR host_invite_id IN (SELECT id FROM public.partner_invites WHERE created_by = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR is_test_mode = true
    OR host_invite_id IN (SELECT id FROM public.partner_invites WHERE created_by = auth.uid())
  );

-- 7. virtual_story_sessions: scope UPDATE to owner / matching anon
DROP POLICY IF EXISTS "Anyone can update own story sessions" ON public.virtual_story_sessions;
CREATE POLICY "Owner can update story sessions" ON public.virtual_story_sessions
  FOR UPDATE TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_id IS NOT NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 8. visitor_attribution: prevent overwriting identified users' rows
DROP POLICY IF EXISTS "Users can update own visitor_attribution" ON public.visitor_attribution;
CREATE POLICY "Users can update own visitor_attribution" ON public.visitor_attribution
  FOR UPDATE TO anon, authenticated
  USING (
    user_id IS NULL
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    user_id IS NULL
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- 9. partner_invite_responses: tighten access; reads via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anyone can read responses" ON public.partner_invite_responses;
DROP POLICY IF EXISTS "Anyone can update responses" ON public.partner_invite_responses;
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.partner_invite_responses;

CREATE POLICY "Admins read partner invite responses" ON public.partner_invite_responses
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'moderator'::app_role));

-- RPC so a visitor can fetch their own response by session id
CREATE OR REPLACE FUNCTION public.get_my_partner_invite_response(
  p_invite_id uuid,
  p_visitor_session_id text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT response_state
  FROM public.partner_invite_responses
  WHERE invite_id = p_invite_id
    AND visitor_session_id = p_visitor_session_id
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_partner_invite_response(uuid, text) TO anon, authenticated;

-- 10. Branch images storage: admin only writes
DROP POLICY IF EXISTS "Authenticated users can upload branch images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branch images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branch images" ON storage.objects;

CREATE POLICY "Admins upload branch images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branch-images' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins update branch images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branch-images' AND has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins delete branch images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branch-images' AND has_role(auth.uid(),'admin'::app_role));

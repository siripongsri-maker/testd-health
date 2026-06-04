-- Fix peer reply INSERT: also block direct insert with is_flagged=true
DROP POLICY IF EXISTS "Anyone can insert peer replies unmoderated" ON public.hr_peer_replies;
CREATE POLICY "Anyone can insert peer replies unmoderated"
ON public.hr_peer_replies
FOR INSERT
WITH CHECK (is_approved = false AND is_flagged = false);

-- Fix partner_test_sessions: remove is_test_mode bypass on UPDATE
DROP POLICY IF EXISTS "Host or admin can update sessions" ON public.partner_test_sessions;
CREATE POLICY "Host or admin can update sessions"
ON public.partner_test_sessions
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (host_invite_id IN (SELECT id FROM public.partner_invites WHERE created_by = auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (host_invite_id IN (SELECT id FROM public.partner_invites WHERE created_by = auth.uid()))
);
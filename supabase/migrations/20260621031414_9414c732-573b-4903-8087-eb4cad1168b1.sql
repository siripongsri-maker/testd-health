
-- 1) Restrict partner_test_session_participants reads to session host or admins
DROP POLICY IF EXISTS "Authenticated can read participants" ON public.partner_test_session_participants;

CREATE POLICY "Host or admin can read participants"
ON public.partner_test_session_participants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.partner_test_sessions s
    JOIN public.partner_invites i ON i.id = s.host_invite_id
    WHERE s.id = partner_test_session_participants.session_id
      AND i.created_by = auth.uid()
  )
);

-- 2) Stop exposing partner_organizations contact PII to all active staff
--    Admin and me_analyst policies remain in place
DROP POLICY IF EXISTS "Staff read partners" ON public.partner_organizations;

-- 3) Harden storage policy for guest selftest-result uploads:
--    keep folder scoping but restrict to image extensions to deter arbitrary file uploads
DROP POLICY IF EXISTS "Guests can upload result photos under guest folder" ON storage.objects;

CREATE POLICY "Guests can upload result photos under guest folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'selftest-results'
  AND (storage.foldername(name))[1] = 'guest'
  AND lower(right(name, 5)) IN ('.jpeg', '.webp')
       OR lower(right(name, 4)) IN ('.jpg', '.png', '.heic')
);

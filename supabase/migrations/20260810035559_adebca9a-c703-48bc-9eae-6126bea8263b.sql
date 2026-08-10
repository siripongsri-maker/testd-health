DROP POLICY IF EXISTS "Users can create their own admin request" ON public.admin_requests;

CREATE POLICY "Users can create their own admin request"
ON public.admin_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (status IS NULL OR status = 'pending')
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);
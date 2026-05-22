-- Allow admins to delete HIV self-test requests
CREATE POLICY "Admins can delete requests"
ON public.hiv_selftest_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
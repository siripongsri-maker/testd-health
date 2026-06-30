
CREATE POLICY "Users can view their own branch interest signups"
ON public.branch_interest_signups
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Branch staff can view selftest-results for their branch"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'selftest-results'
  AND EXISTS (
    SELECT 1
    FROM public.hiv_selftest_requests r
    WHERE r.result_photo_url = storage.objects.name
      AND r.pii_id IS NOT NULL
      AND public.is_branch_staff_for_request(auth.uid(), r.pii_id)
  )
);

DROP POLICY IF EXISTS "Admins can view SMS send log" ON public.sms_send_log;
CREATE POLICY "Admins and analysts can view SMS send log"
ON public.sms_send_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::public.app_role)
);


-- Create helper function to check if user is branch staff for a given request
CREATE OR REPLACE FUNCTION public.is_branch_staff_for_request(_user_id uuid, _pii_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_branch_assignments sba
    JOIN public.hiv_selftest_requests hsr ON hsr.assigned_branch = sba.branch
    WHERE sba.user_id = _user_id
      AND hsr.pii_id = _pii_id
  )
$$;

-- Add policy for branch staff to view PII of their branch's requests
CREATE POLICY "Branch staff can view their branch PII"
ON public.selftest_pii
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  public.is_branch_staff_for_request(auth.uid(), id)
);

-- Add policy for branch staff to update PII of their branch's requests
CREATE POLICY "Branch staff can update their branch PII"
ON public.selftest_pii
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  public.is_branch_staff_for_request(auth.uid(), id)
);

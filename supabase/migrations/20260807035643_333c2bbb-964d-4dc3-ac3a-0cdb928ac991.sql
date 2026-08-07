CREATE POLICY "Booking staff create referrals"
ON public.hr_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (branch_id IS NOT NULL AND public.is_booking_staff(branch_id))
);

CREATE POLICY "Booking staff read branch referrals"
ON public.hr_referrals
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (branch_id IS NOT NULL AND public.is_booking_staff(branch_id))
);
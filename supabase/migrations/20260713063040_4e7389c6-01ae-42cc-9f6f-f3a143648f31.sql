DROP POLICY IF EXISTS "pce_branch_read" ON public.post_counseling_evaluations;
CREATE POLICY "pce_branch_read" ON public.post_counseling_evaluations
FOR SELECT TO authenticated
USING (
  branch_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid()
        AND sp.is_active = true
        AND sp.branch_id = post_counseling_evaluations.branch_id
    )
    OR EXISTS (
      SELECT 1 FROM public.counselor_profiles cp
      WHERE cp.user_id = auth.uid()
        AND cp.is_active = true
        AND cp.branch_id = post_counseling_evaluations.branch_id
    )
  )
);
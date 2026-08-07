DROP POLICY IF EXISTS "Staff insert own case_notes" ON public.case_notes;

CREATE POLICY "Staff insert own case_notes"
ON public.case_notes
FOR INSERT
TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_branch_counselor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid()
        AND sp.is_active = true
        AND (
          branch_id IS NULL
          OR sp.branch_id IS NULL
          OR sp.branch_id = branch_id
        )
    )
  )
);
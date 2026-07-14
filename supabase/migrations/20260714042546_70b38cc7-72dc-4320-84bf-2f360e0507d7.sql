
DROP POLICY IF EXISTS "Authenticated users can update their own visitor_attribution" ON public.visitor_attribution;

CREATE POLICY "Authenticated users can claim or update their visitor_attribution"
ON public.visitor_attribution
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

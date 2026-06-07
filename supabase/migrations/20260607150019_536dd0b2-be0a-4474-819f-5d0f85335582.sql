-- Restrict staff_profiles read access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active staff profiles" ON public.staff_profiles;

CREATE POLICY "Authenticated users can view active staff profiles"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (is_active = true);

REVOKE SELECT ON public.staff_profiles FROM anon;
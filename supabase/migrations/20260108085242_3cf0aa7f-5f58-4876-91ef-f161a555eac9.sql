-- Fix: Add a policy to allow admins to view selftest_pii when accessed through hiv_selftest_requests foreign key
-- The current policy uses has_role which should work, but let's make it more robust

-- First, drop and recreate the admin view policy for selftest_pii with a simpler check
DROP POLICY IF EXISTS "Admins can view PII" ON public.selftest_pii;

-- Create a new policy that directly checks user_roles table (same pattern as hiv_selftest_requests)
CREATE POLICY "Admins can view PII"
ON public.selftest_pii
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);
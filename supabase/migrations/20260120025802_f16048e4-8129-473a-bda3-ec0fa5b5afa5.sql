-- Fix: leaderboard_profiles view is publicly accessible
-- Recreate the view with security_invoker=on so it respects profiles table RLS

-- Drop the existing view
DROP VIEW IF EXISTS public.leaderboard_profiles;

-- Recreate the view with security_invoker enabled
-- This makes the view respect the caller's RLS permissions on the profiles table
CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = on) AS
SELECT 
  id,
  display_name,
  avatar_url,
  xp,
  level,
  streak,
  badges
FROM public.profiles;

-- Grant select to authenticated users only (not anon)
GRANT SELECT ON public.leaderboard_profiles TO authenticated;
REVOKE SELECT ON public.leaderboard_profiles FROM anon;

-- Ensure profiles table has a policy allowing authenticated users to read leaderboard data
-- First check if a select policy exists, if not create one
DO $$
BEGIN
  -- Create policy for authenticated users to read all profiles (for leaderboard)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Authenticated users can view all profiles for leaderboard'
  ) THEN
    CREATE POLICY "Authenticated users can view all profiles for leaderboard"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
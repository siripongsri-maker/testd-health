-- Fix: profiles table exposes sensitive health data publicly
-- Create a view for public leaderboard data with only safe columns

-- Create a secure view for leaderboard display (non-sensitive data only)
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  xp,
  level,
  streak,
  badges
FROM public.profiles;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.leaderboard_profiles TO anon, authenticated;

-- Drop the overly permissive policy that exposes health data
DROP POLICY IF EXISTS "Anyone can view leaderboard profiles" ON public.profiles;

-- The remaining policies are secure:
-- "Users can view own profile" - auth.uid() = id (user can see their own full profile)
-- "Users can insert own profile" - auth.uid() = id
-- "Users can update own profile" - auth.uid() = id
-- Fix the security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard_profiles;

CREATE VIEW public.leaderboard_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  xp,
  level,
  streak,
  badges
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.leaderboard_profiles TO anon, authenticated;
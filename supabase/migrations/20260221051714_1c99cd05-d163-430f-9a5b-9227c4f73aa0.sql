
-- Recreate leaderboard_profiles view to EXCLUDE admin users
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url,
  p.xp,
  p.level,
  p.streak,
  p.badges
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'::app_role
);

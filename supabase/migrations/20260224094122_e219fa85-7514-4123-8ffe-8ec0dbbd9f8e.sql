-- Fix leaderboard_profiles view to use SECURITY INVOKER instead of SECURITY DEFINER
CREATE OR REPLACE VIEW public.leaderboard_profiles
WITH (security_invoker = on) AS
SELECT id,
    display_name,
    avatar_url,
    xp,
    level,
    streak,
    badges
   FROM profiles p
  WHERE (NOT (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = p.id) AND (ur.role = 'admin'::app_role)))));

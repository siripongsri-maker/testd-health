-- Fix SECURITY DEFINER view warnings by recreating views with SECURITY INVOKER

-- Drop and recreate leaderboard_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard_profiles;
CREATE VIEW public.leaderboard_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  display_name,
  avatar_url,
  xp,
  level,
  streak,
  badges
FROM public.profiles;

-- Drop and recreate public_article_comments view with SECURITY INVOKER  
DROP VIEW IF EXISTS public.public_article_comments;
CREATE VIEW public.public_article_comments
WITH (security_invoker = true) AS
SELECT 
  id,
  article_id,
  content,
  author_name,
  created_at,
  updated_at
FROM public.article_comments;

-- Re-grant access to the article comments view
GRANT SELECT ON public.public_article_comments TO anon, authenticated;
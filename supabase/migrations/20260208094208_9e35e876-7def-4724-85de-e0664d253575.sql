-- Fix 1: Create a public view for hall of fame that hides user_id
CREATE VIEW public.hall_of_fame_public
WITH (security_invoker = true) AS
SELECT 
  id,
  display_name,
  avatar_url,
  score,
  captured_at,
  season_key,
  season_label,
  category
FROM public.hall_of_fame;

-- Grant access to the view
GRANT SELECT ON public.hall_of_fame_public TO anon, authenticated;

-- Fix 2: Grant SELECT on public_article_comments view
-- This view uses security_invoker so it inherits base table RLS
GRANT SELECT ON public.public_article_comments TO anon, authenticated;
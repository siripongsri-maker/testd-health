-- Fix the security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.public_site_stats;

CREATE VIEW public.public_site_stats
WITH (security_invoker = on) AS
SELECT 
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_pageviews,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_user_pageviews
FROM public.analytics_events;

-- Grant read access to the aggregate view
GRANT SELECT ON public.public_site_stats TO anon, authenticated;

-- Create RLS policy on the view's base table to allow the view to work
-- Since we already have "Admins can read analytics" policy, the view needs
-- a special policy that allows reading aggregates only
-- Actually, we need to handle this differently - the view itself should be able to read

-- Create a helper function for the view to use (SECURITY DEFINER with access control)
CREATE OR REPLACE FUNCTION public.get_public_site_stats()
RETURNS TABLE (
  total_sessions bigint,
  total_pageviews bigint,
  registered_user_pageviews bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) as total_pageviews,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_user_pageviews
  FROM public.analytics_events;
$$;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION public.get_public_site_stats() TO anon, authenticated;
-- Fix: Remove public access to analytics_events and restrict to admins only
-- This prevents exposure of user browsing history on this health platform

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view analytics events for stats" ON public.analytics_events;

-- The admin read policy already exists, but let's ensure it's properly in place
-- Keep existing policies:
-- - "Admins can read analytics" (SELECT for admins)
-- - "Anonymous users can insert analytics events" (INSERT for anonymous)
-- - "Authenticated users can insert own analytics events" (INSERT for auth users)

-- Create a public aggregate view for site stats that doesn't expose PII
CREATE OR REPLACE VIEW public.public_site_stats AS
SELECT 
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_pageviews,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_user_pageviews
FROM public.analytics_events;

-- Grant read access to the aggregate view (no PII exposed)
GRANT SELECT ON public.public_site_stats TO anon, authenticated;
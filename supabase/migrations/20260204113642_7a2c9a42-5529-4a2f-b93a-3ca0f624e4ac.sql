-- Create a function to get public site stats
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS TABLE(total_members bigint, total_page_views bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM profiles) as total_members,
    (SELECT COUNT(*) FROM analytics_events) as total_page_views;
$$;
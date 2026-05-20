CREATE OR REPLACE FUNCTION public.get_home_community_stats()
RETURNS TABLE(today_events bigint, total_events bigint, total_members bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.analytics_events WHERE created_at >= (now() AT TIME ZONE 'Asia/Bangkok')::date AT TIME ZONE 'Asia/Bangkok'),
    (SELECT COUNT(*) FROM public.analytics_events),
    (SELECT COUNT(*) FROM public.profiles);
$$;

GRANT EXECUTE ON FUNCTION public.get_home_community_stats() TO anon, authenticated;
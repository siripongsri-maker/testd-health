CREATE OR REPLACE FUNCTION public.get_kit_delivery_report(p_days integer DEFAULT 30)
RETURNS TABLE (
  day date,
  waiting integer,
  in_transit integer,
  delivered integer,
  failed integer,
  with_tracking integer,
  total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (r.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
    COUNT(*) FILTER (WHERE r.status IN ('pending','approved','confirmed'))::int AS waiting,
    COUNT(*) FILTER (WHERE r.status = 'shipped')::int AS in_transit,
    COUNT(*) FILTER (WHERE r.status IN ('delivered','received','result_submitted','followed_up'))::int AS delivered,
    COUNT(*) FILTER (WHERE r.status = 'rejected')::int AS failed,
    COUNT(*) FILTER (WHERE COALESCE(r.tracking_number,'') <> '')::int AS with_tracking,
    COUNT(*)::int AS total
  FROM public.hiv_selftest_requests r
  WHERE (public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
      OR public.has_role(auth.uid(), 'me_analyst')
      OR public.has_role(auth.uid(), 'counselor'))
    AND r.created_at >= (now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1)))
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

REVOKE ALL ON FUNCTION public.get_kit_delivery_report(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_kit_delivery_report(integer) TO authenticated;
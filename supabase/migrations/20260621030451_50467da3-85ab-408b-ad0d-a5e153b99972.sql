
CREATE OR REPLACE FUNCTION public.get_selftest_geo_stats()
RETURNS TABLE (
  province text,
  assigned_branch text,
  total bigint,
  distributed bigint,
  results_returned bigint,
  reactive bigint,
  non_reactive bigint,
  invalid_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(p.province), ''), '(ไม่ระบุ)') AS province,
    COALESCE(r.assigned_branch, 'unknown') AS assigned_branch,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE r.status IN ('shipped','delivered','result_submitted','completed','followed_up'))::bigint AS distributed,
    COUNT(*) FILTER (WHERE r.status IN ('result_submitted','completed','followed_up'))::bigint AS results_returned,
    COUNT(*) FILTER (WHERE r.self_reported_result = 'reactive' OR r.test_result IN ('reactive','positive'))::bigint AS reactive,
    COUNT(*) FILTER (WHERE r.self_reported_result = 'non_reactive' OR r.test_result IN ('non_reactive','negative'))::bigint AS non_reactive,
    COUNT(*) FILTER (WHERE r.self_reported_result = 'invalid' OR r.test_result = 'invalid')::bigint AS invalid_count
  FROM public.hiv_selftest_requests r
  LEFT JOIN public.selftest_pii p ON p.id = r.pii_id
  WHERE
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'me_analyst')
  GROUP BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.get_selftest_geo_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_selftest_geo_stats() TO authenticated;

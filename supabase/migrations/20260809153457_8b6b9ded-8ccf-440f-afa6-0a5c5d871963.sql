ALTER TABLE public.hiv_selftest_requests ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.appointment_pre_service_surveys ADD COLUMN IF NOT EXISTS nationality text;

ALTER TABLE public.hiv_selftest_requests DROP CONSTRAINT IF EXISTS hiv_selftest_requests_nationality_chk;
ALTER TABLE public.hiv_selftest_requests ADD CONSTRAINT hiv_selftest_requests_nationality_chk
  CHECK (nationality IS NULL OR nationality IN ('thai','myanmar','lao','cambodian','vietnamese','other','prefer_not_to_say'));

ALTER TABLE public.appointment_pre_service_surveys DROP CONSTRAINT IF EXISTS aps_surveys_nationality_chk;
ALTER TABLE public.appointment_pre_service_surveys ADD CONSTRAINT aps_surveys_nationality_chk
  CHECK (nationality IS NULL OR nationality IN ('thai','myanmar','lao','cambodian','vietnamese','other','prefer_not_to_say'));

CREATE INDEX IF NOT EXISTS idx_selftest_nationality ON public.hiv_selftest_requests (nationality) WHERE nationality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aps_surveys_nationality ON public.appointment_pre_service_surveys (nationality) WHERE nationality IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_nationality_analytics(p_start date DEFAULT (now() - interval '90 days')::date, p_end date DEFAULT now()::date)
RETURNS TABLE (nationality text, selftest_requests bigint, pre_service_surveys bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT COALESCE(r.nationality,'unspecified') AS nat, count(*)::bigint AS c
    FROM public.hiv_selftest_requests r
    WHERE r.created_at >= p_start::timestamptz AND r.created_at < (p_end + 1)::timestamptz
    GROUP BY 1
  ), p AS (
    SELECT COALESCE(a.nationality,'unspecified') AS nat, count(*)::bigint AS c
    FROM public.appointment_pre_service_surveys a
    WHERE a.created_at >= p_start::timestamptz AND a.created_at < (p_end + 1)::timestamptz
    GROUP BY 1
  )
  SELECT COALESCE(s.nat, p.nat) AS nationality,
         COALESCE(s.c,0) AS selftest_requests,
         COALESCE(p.c,0) AS pre_service_surveys,
         COALESCE(s.c,0) + COALESCE(p.c,0) AS total
  FROM s FULL OUTER JOIN p ON p.nat = s.nat
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'me_analyst')
  ORDER BY 4 DESC;
$$;

REVOKE ALL ON FUNCTION public.get_nationality_analytics(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_nationality_analytics(date, date) TO authenticated;
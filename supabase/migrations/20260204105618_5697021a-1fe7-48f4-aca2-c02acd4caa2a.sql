-- Fix the security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.selftest_statistics;

CREATE VIEW public.selftest_statistics
WITH (security_invoker = true)
AS
SELECT 
  COALESCE(gender, 'unknown') as gender,
  COUNT(*) as count,
  CASE 
    WHEN date_of_birth IS NULL THEN 'unknown'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'under_18'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN '18_24'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '25_34'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '35_44'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 55 THEN '45_54'
    ELSE '55_plus'
  END as age_range
FROM public.selftest_pii
GROUP BY gender, 
  CASE 
    WHEN date_of_birth IS NULL THEN 'unknown'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'under_18'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN '18_24'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '25_34'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '35_44'
    WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 55 THEN '45_54'
    ELSE '55_plus'
  END;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.selftest_statistics TO anon, authenticated;

-- Add a minimal policy to allow reading aggregated data (only gender and age stats, no PII)
-- Since the view uses SECURITY INVOKER, users need SELECT access to the underlying table
-- But we only want them to see aggregated data, not individual rows
-- Solution: Create a database function that returns aggregated data

CREATE OR REPLACE FUNCTION public.get_selftest_statistics()
RETURNS TABLE(
  total_count bigint,
  gender_stats jsonb,
  age_stats jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM selftest_pii) as total_count,
    (
      SELECT jsonb_agg(jsonb_build_object('gender', gender, 'count', cnt))
      FROM (
        SELECT COALESCE(gender, 'unknown') as gender, COUNT(*) as cnt
        FROM selftest_pii
        GROUP BY gender
      ) g
    ) as gender_stats,
    (
      SELECT jsonb_agg(jsonb_build_object('age_range', age_range, 'count', cnt))
      FROM (
        SELECT 
          CASE 
            WHEN date_of_birth IS NULL THEN 'unknown'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'under_18'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN '18_24'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '25_34'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '35_44'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 55 THEN '45_54'
            ELSE '55_plus'
          END as age_range,
          COUNT(*) as cnt
        FROM selftest_pii
        GROUP BY 
          CASE 
            WHEN date_of_birth IS NULL THEN 'unknown'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'under_18'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN '18_24'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '25_34'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '35_44'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 55 THEN '45_54'
            ELSE '55_plus'
          END
      ) a
    ) as age_stats;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_selftest_statistics() TO anon, authenticated;
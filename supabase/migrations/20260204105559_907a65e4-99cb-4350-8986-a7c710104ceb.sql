-- REVERT: Remove the overly permissive policy that exposes PII
DROP POLICY IF EXISTS "Anyone can view aggregated stats" ON public.selftest_pii;

-- Create a secure view that only exposes aggregated statistics (no PII)
CREATE OR REPLACE VIEW public.selftest_statistics AS
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
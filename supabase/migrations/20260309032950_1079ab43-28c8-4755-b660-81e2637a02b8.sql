CREATE OR REPLACE FUNCTION public.get_milestone_completed_count(p_month text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0) FROM (
    SELECT id FROM appointments
    WHERE (status IN ('completed', 'checked_out') OR checked_out_at IS NOT NULL)
      AND to_char(appointment_date, 'YYYY-MM') = p_month
    UNION
    SELECT id FROM hiv_selftest_requests
    WHERE status IN ('result_submitted', 'delivered', 'received', 'confirmed')
      AND to_char(created_at, 'YYYY-MM') = p_month
  ) completed_tests;
$$;
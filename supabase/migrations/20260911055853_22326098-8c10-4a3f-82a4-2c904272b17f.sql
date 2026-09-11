CREATE OR REPLACE FUNCTION public.lookup_selftest_tracking(p_thai_id text, p_phone text)
RETURNS TABLE (
  status text,
  tracking_number text,
  tracking_carrier text,
  masked_name text,
  requested_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := regexp_replace(coalesce(p_thai_id, ''), '\D', '', 'g');
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
BEGIN
  IF length(v_id) < 8 OR length(v_phone) < 9 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.status,
    r.tracking_number,
    r.tracking_carrier,
    CASE
      WHEN p.full_name IS NULL OR length(p.full_name) = 0 THEN NULL
      ELSE left(p.full_name, 1) || repeat('*', greatest(length(p.full_name) - 1, 1))
    END AS masked_name,
    r.created_at,
    r.updated_at
  FROM public.hiv_selftest_requests r
  JOIN public.selftest_pii p ON p.id = r.pii_id
  WHERE regexp_replace(coalesce(p.thai_id, ''), '\D', '', 'g') = v_id
    AND right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 9) = right(v_phone, 9)
  ORDER BY r.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_selftest_tracking(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_selftest_tracking(text, text) TO anon, authenticated;
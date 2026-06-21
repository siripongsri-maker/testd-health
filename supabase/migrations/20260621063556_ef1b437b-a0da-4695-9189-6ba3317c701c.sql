-- 1) Branch fallback on the geo aggregation RPC
CREATE OR REPLACE FUNCTION public.get_selftest_geo_stats()
RETURNS TABLE(province text, assigned_branch text, total bigint, distributed bigint, results_returned bigint, reactive bigint, non_reactive bigint, invalid_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(
      NULLIF(TRIM(p.province), ''),
      NULLIF(TRIM(r.province), ''),
      CASE r.assigned_branch
        WHEN 'silom' THEN 'กรุงเทพมหานคร'
        WHEN 'pattaya' THEN 'ชลบุรี'
        ELSE NULL
      END,
      '(ไม่ระบุ)'
    ) AS province,
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
$function$;

-- 2) Drop the old guest RPC signature (PostgREST will pick up the new one with p_province)
DROP FUNCTION IF EXISTS public.submit_guest_selftest_result(text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.submit_guest_selftest_result(
  p_thai_id text,
  p_phone text,
  p_line_id text,
  p_self_result text,
  p_photo_path text,
  p_wants_callback boolean,
  p_province text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_thai_id text := regexp_replace(coalesce(p_thai_id, ''), '\D', '', 'g');
  v_phone   text := nullif(regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g'), '');
  v_result  text := lower(nullif(btrim(coalesce(p_self_result, '')), ''));
  v_photo   text := nullif(btrim(coalesce(p_photo_path, '')), '');
  v_prov    text := nullif(btrim(coalesce(p_province, '')), '');
BEGIN
  IF NOT public.is_valid_thai_id(v_thai_id) THEN
    RAISE EXCEPTION 'invalid_thai_id';
  END IF;

  IF v_phone IS NULL OR length(v_phone) < 8 OR length(v_phone) > 20 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  IF v_result IS NULL OR v_result NOT IN ('negative','reactive','invalid') THEN
    RAISE EXCEPTION 'invalid_result';
  END IF;

  IF v_photo IS NOT NULL AND v_photo NOT LIKE 'guest/%' THEN
    RAISE EXCEPTION 'invalid_photo_path';
  END IF;

  IF v_prov IS NULL OR length(v_prov) > 100 THEN
    RAISE EXCEPTION 'invalid_province';
  END IF;

  INSERT INTO public.hiv_selftest_requests (
    user_id,
    thai_id,
    phone,
    line_id,
    province,
    self_reported_result,
    test_result,
    result_photo_url,
    photo_provided,
    wants_callback,
    callback_phone,
    status,
    submission_path,
    result_submitted_at
  ) VALUES (
    NULL,
    v_thai_id,
    v_phone,
    nullif(btrim(coalesce(p_line_id, '')), ''),
    v_prov,
    v_result,
    v_result,
    v_photo,
    (v_photo IS NOT NULL),
    coalesce(p_wants_callback, false),
    CASE WHEN coalesce(p_wants_callback, false) THEN v_phone ELSE NULL END,
    'result_submitted',
    CASE WHEN v_photo IS NOT NULL THEN 'lean_with_photo' ELSE 'lean_no_photo' END,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_guest_selftest_result(text, text, text, text, text, boolean, text) TO anon, authenticated;
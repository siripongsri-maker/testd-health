CREATE OR REPLACE FUNCTION public.submit_guest_selftest_result(
  p_full_name text,
  p_phone text,
  p_line_id text,
  p_self_result text,
  p_photo_path text,
  p_wants_callback boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g'), '');
  v_result text := lower(nullif(btrim(coalesce(p_self_result, '')), ''));
  v_photo text := nullif(btrim(coalesce(p_photo_path, '')), '');
BEGIN
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
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

  INSERT INTO public.hiv_selftest_requests (
    user_id,
    full_name,
    phone,
    line_id,
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
    v_name,
    v_phone,
    nullif(btrim(coalesce(p_line_id, '')), ''),
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
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_selftest_result(text, text, text, text, text, boolean) TO anon, authenticated;

-- 1) Add thai_id column for linkage. Indexed for lookup; not unique because
--    the same person may legitimately submit multiple results over time.
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS thai_id text;

CREATE INDEX IF NOT EXISTS idx_hiv_selftest_requests_thai_id
  ON public.hiv_selftest_requests (thai_id)
  WHERE thai_id IS NOT NULL;

-- 2) Thai national-ID checksum validator (digits only, 13 chars).
CREATE OR REPLACE FUNCTION public.is_valid_thai_id(_id text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text;
  s int := 0;
  i int;
  c int;
BEGIN
  IF _id IS NULL THEN RETURN false; END IF;
  v := regexp_replace(_id, '\D', '', 'g');
  IF length(v) <> 13 THEN RETURN false; END IF;
  FOR i IN 1..12 LOOP
    s := s + (substr(v, i, 1)::int) * (14 - i);
  END LOOP;
  c := (11 - (s % 11)) % 10;
  RETURN c = substr(v, 13, 1)::int;
END;
$$;

-- 3) Replace guest submit RPC: drop name requirement, require Thai ID.
DROP FUNCTION IF EXISTS public.submit_guest_selftest_result(text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.submit_guest_selftest_result(
  p_thai_id text,
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
  v_thai_id text := regexp_replace(coalesce(p_thai_id, ''), '\D', '', 'g');
  v_phone   text := nullif(regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g'), '');
  v_result  text := lower(nullif(btrim(coalesce(p_self_result, '')), ''));
  v_photo   text := nullif(btrim(coalesce(p_photo_path, '')), '');
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

  INSERT INTO public.hiv_selftest_requests (
    user_id,
    thai_id,
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
    v_thai_id,
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

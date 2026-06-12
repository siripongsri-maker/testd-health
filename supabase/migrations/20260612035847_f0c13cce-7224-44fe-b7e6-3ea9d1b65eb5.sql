
-- 1. Allow guest submissions (user_id nullable)
ALTER TABLE public.hiv_selftest_requests ALTER COLUMN user_id DROP NOT NULL;

-- 2. SECURITY DEFINER RPC for guest result submission
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
  IF p_photo_path IS NULL OR p_photo_path NOT LIKE 'guest/%' THEN
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
    p_photo_path,
    true,
    coalesce(p_wants_callback, false),
    CASE WHEN coalesce(p_wants_callback, false) THEN v_phone ELSE NULL END,
    'result_submitted',
    'guest_existing_kit',
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_selftest_result(text, text, text, text, text, boolean) TO anon, authenticated;

-- 3. Storage policy: allow anon + authenticated to upload into selftest-results/guest/*
DROP POLICY IF EXISTS "Guests can upload result photos under guest folder" ON storage.objects;
CREATE POLICY "Guests can upload result photos under guest folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'selftest-results'
  AND (storage.foldername(name))[1] = 'guest'
);

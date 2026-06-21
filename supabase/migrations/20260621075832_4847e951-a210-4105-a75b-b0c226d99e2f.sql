CREATE OR REPLACE FUNCTION public.attach_selftest_callback_phone(
  p_request_id uuid,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_owner uuid;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g');
  IF length(v_phone) < 8 OR length(v_phone) > 20 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  SELECT user_id INTO v_owner
  FROM public.hiv_selftest_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  -- Only the row owner (authenticated) or anyone for guest rows (user_id IS NULL) may attach.
  IF v_owner IS NOT NULL AND v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.hiv_selftest_requests
  SET wants_callback = true,
      callback_phone = v_phone,
      care_action    = 'requested_callback'
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_selftest_callback_phone(uuid, text) TO anon, authenticated;


-- 1) visitor_attribution: remove permissive anon UPDATE policy; keep only authed-user updates.
DROP POLICY IF EXISTS "Users can update own visitor_attribution" ON public.visitor_attribution;

CREATE POLICY "Authenticated users can update their own visitor_attribution"
ON public.visitor_attribution
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Controlled upsert for anonymous / authed callers: only allows last-touch updates
-- against the row identified by anonymous_id. Cannot alter user_id, first-touch, or
-- other visitors' rows arbitrarily except through this narrow surface.
CREATE OR REPLACE FUNCTION public.upsert_visitor_attribution_touch(
  p_anonymous_id text,
  p_campaign text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_medium text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_term text DEFAULT NULL,
  p_partner text DEFAULT NULL,
  p_link_id uuid DEFAULT NULL,
  p_landing_page text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_device_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_now timestamptz := now();
BEGIN
  IF p_anonymous_id IS NULL OR length(p_anonymous_id) < 8 OR length(p_anonymous_id) > 128 THEN
    RAISE EXCEPTION 'invalid anonymous_id';
  END IF;

  SELECT id INTO v_existing
  FROM public.visitor_attribution
  WHERE anonymous_id = p_anonymous_id
  LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.visitor_attribution (
      anonymous_id,
      first_touch_campaign, first_touch_channel, first_touch_source, first_touch_medium,
      first_touch_content, first_touch_term, first_touch_partner, first_touch_link_id,
      first_touch_landing_page, first_touch_referrer, first_touch_at,
      last_touch_campaign, last_touch_channel, last_touch_source, last_touch_medium,
      last_touch_content, last_touch_term, last_touch_partner, last_touch_link_id,
      last_touch_landing_page, last_touch_referrer, last_touch_at,
      last_seen_at, total_sessions, device_type
    ) VALUES (
      p_anonymous_id,
      p_campaign, p_channel, p_source, p_medium, p_content, p_term, p_partner, p_link_id,
      p_landing_page, p_referrer, v_now,
      p_campaign, p_channel, p_source, p_medium, p_content, p_term, p_partner, p_link_id,
      p_landing_page, p_referrer, v_now,
      v_now, 1, p_device_type
    );
  ELSE
    UPDATE public.visitor_attribution
    SET
      last_touch_campaign = COALESCE(p_campaign, last_touch_campaign),
      last_touch_channel = COALESCE(p_channel, last_touch_channel),
      last_touch_source = COALESCE(p_source, last_touch_source),
      last_touch_medium = COALESCE(p_medium, last_touch_medium),
      last_touch_content = COALESCE(p_content, last_touch_content),
      last_touch_term = COALESCE(p_term, last_touch_term),
      last_touch_partner = COALESCE(p_partner, last_touch_partner),
      last_touch_link_id = COALESCE(p_link_id, last_touch_link_id),
      last_touch_landing_page = COALESCE(p_landing_page, last_touch_landing_page),
      last_touch_referrer = COALESCE(p_referrer, last_touch_referrer),
      last_touch_at = v_now,
      last_seen_at = v_now,
      total_sessions = COALESCE(total_sessions, 0) + 1
    WHERE id = v_existing;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_visitor_attribution_touch(text,text,text,text,text,text,text,text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_visitor_attribution_touch(text,text,text,text,text,text,text,text,uuid,text,text,text) TO anon, authenticated;

-- 2) Guest self-test result photo uploads: require a positively-linked, unconsumed token.
CREATE TABLE IF NOT EXISTS public.selftest_guest_upload_tokens (
  token text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  consumed_at timestamptz NULL
);

GRANT SELECT, INSERT, UPDATE ON public.selftest_guest_upload_tokens TO authenticated;
GRANT ALL ON public.selftest_guest_upload_tokens TO service_role;

ALTER TABLE public.selftest_guest_upload_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role manages guest upload tokens"
ON public.selftest_guest_upload_tokens
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Mint a fresh token for the guest client. SECURITY DEFINER so anon can call.
CREATE OR REPLACE FUNCTION public.mint_selftest_guest_upload_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  -- 32 random bytes → 64-char hex; comfortably above the 24-char storage-policy minimum.
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.selftest_guest_upload_tokens (token) VALUES (v_token);
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.mint_selftest_guest_upload_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mint_selftest_guest_upload_token() TO anon, authenticated;

-- Validator used by the storage policy: token exists, not expired, not consumed.
CREATE OR REPLACE FUNCTION public.is_valid_selftest_guest_upload_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.selftest_guest_upload_tokens
    WHERE token = p_token
      AND consumed_at IS NULL
      AND expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.is_valid_selftest_guest_upload_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_selftest_guest_upload_token(text) TO anon, authenticated;

-- Replace the pattern-only guest upload policy with an ownership-linked one.
DROP POLICY IF EXISTS "Guests can upload result photos under guest folder" ON storage.objects;

CREATE POLICY "Guests can upload result photos with minted token"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'selftest-results'
  AND (storage.foldername(name))[1] = 'guest'
  AND array_length(storage.foldername(name), 1) >= 2
  AND length((storage.foldername(name))[2]) >= 24
  AND (storage.foldername(name))[2] ~ '^[A-Za-z0-9_-]+$'
  AND (
    lower(right(name, 4)) IN ('.jpg', '.png', '.heic')
    OR lower(right(name, 5)) IN ('.jpeg', '.webp')
  )
  AND public.is_valid_selftest_guest_upload_token((storage.foldername(name))[2])
);

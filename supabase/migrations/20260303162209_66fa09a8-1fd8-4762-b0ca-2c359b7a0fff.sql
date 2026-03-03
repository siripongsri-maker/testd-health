
-- A) Add rejection columns to hiv_selftest_requests
ALTER TABLE public.hiv_selftest_requests 
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- B) Add fingerprint + abuse columns
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS name_fp text,
  ADD COLUMN IF NOT EXISTS address_fp text,
  ADD COLUMN IF NOT EXISTS name_address_fp text,
  ADD COLUMN IF NOT EXISTS abuse_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS abuse_reason text,
  ADD COLUMN IF NOT EXISTS abuse_score int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abuse_checked_at timestamptz;

-- Create indexes for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_selftest_name_fp ON public.hiv_selftest_requests (name_fp) WHERE name_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_selftest_address_fp ON public.hiv_selftest_requests (address_fp) WHERE address_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_selftest_name_address_fp ON public.hiv_selftest_requests (name_address_fp) WHERE name_address_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_selftest_abuse_flag ON public.hiv_selftest_requests (abuse_flag) WHERE abuse_flag = true;

-- C) Create selftest_abuse_logs table
CREATE TABLE IF NOT EXISTS public.selftest_abuse_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.hiv_selftest_requests(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  reason text,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.selftest_abuse_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage abuse logs" ON public.selftest_abuse_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- D) Function to normalize text for fingerprinting
CREATE OR REPLACE FUNCTION public.normalize_text_for_fp(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  IF input IS NULL OR input = '' THEN RETURN ''; END IF;
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(trim(input)),
        '\s+', ' ', 'g'
      ),
      '[,.\-/()"""''#]', '', 'g'
    ),
    '(แขวง|เขต|จังหวัด|ตำบล|อำเภอ|หมู่|ซอย|ถนน|จ\.|อ\.|ต\.|ม\.)', '', 'g'
  );
END;
$$;

-- E) Function to generate fingerprints and check abuse on insert
CREATE OR REPLACE FUNCTION public.generate_selftest_fingerprints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_name text;
  v_address text;
  v_name_norm text;
  v_address_norm text;
  v_name_fp text;
  v_address_fp text;
  v_name_address_fp text;
  v_dup_count int;
  v_name_freq int;
  v_addr_freq int;
  v_abuse_reasons text[];
  v_score int := 0;
BEGIN
  SELECT full_name, COALESCE(address, '') || ' ' || COALESCE(district, '') || ' ' || COALESCE(province, '') || ' ' || COALESCE(postal_code, '')
  INTO v_name, v_address
  FROM public.selftest_pii
  WHERE id = NEW.pii_id;

  IF v_name IS NULL AND v_address IS NULL THEN
    RETURN NEW;
  END IF;

  v_name_norm := normalize_text_for_fp(v_name);
  v_address_norm := normalize_text_for_fp(v_address);

  v_name_fp := CASE WHEN v_name_norm != '' THEN encode(extensions.digest(v_name_norm::bytea, 'sha256'), 'hex') ELSE NULL END;
  v_address_fp := CASE WHEN v_address_norm != '' THEN encode(extensions.digest(v_address_norm::bytea, 'sha256'), 'hex') ELSE NULL END;
  v_name_address_fp := CASE WHEN v_name_norm != '' AND v_address_norm != '' 
    THEN encode(extensions.digest((v_name_norm || '|' || v_address_norm)::bytea, 'sha256'), 'hex') 
    ELSE NULL END;

  NEW.name_fp := v_name_fp;
  NEW.address_fp := v_address_fp;
  NEW.name_address_fp := v_name_address_fp;

  v_abuse_reasons := ARRAY[]::text[];

  IF v_name_address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_dup_count
    FROM public.hiv_selftest_requests
    WHERE name_address_fp = v_name_address_fp
      AND id != NEW.id
      AND created_at > now() - interval '30 days'
      AND status != 'rejected';
    IF v_dup_count > 0 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'duplicate_30d');
      v_score := v_score + 10;
    END IF;
  END IF;

  IF v_name_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_name_freq
    FROM public.hiv_selftest_requests
    WHERE name_fp = v_name_fp
      AND id != NEW.id
      AND created_at > now() - interval '14 days';
    IF v_name_freq >= 2 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'high_freq_name');
      v_score := v_score + 5;
    END IF;
  END IF;

  IF v_address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_addr_freq
    FROM public.hiv_selftest_requests
    WHERE address_fp = v_address_fp
      AND id != NEW.id
      AND created_at > now() - interval '14 days';
    IF v_addr_freq >= 2 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'high_freq_address');
      v_score := v_score + 5;
    END IF;
  END IF;

  IF array_length(v_abuse_reasons, 1) > 0 THEN
    NEW.abuse_flag := true;
    NEW.abuse_reason := array_to_string(v_abuse_reasons, ', ');
    NEW.abuse_score := v_score;
    NEW.abuse_checked_at := now();
  ELSE
    NEW.abuse_checked_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_selftest_fingerprints ON public.hiv_selftest_requests;
CREATE TRIGGER trg_selftest_fingerprints
  BEFORE INSERT ON public.hiv_selftest_requests
  FOR EACH ROW
  WHEN (NEW.pii_id IS NOT NULL)
  EXECUTE FUNCTION public.generate_selftest_fingerprints();

-- F) Function to get duplicate counts for a request (admin use)
CREATE OR REPLACE FUNCTION public.get_selftest_duplicate_counts(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_req record;
  v_name_count int := 0;
  v_addr_count int := 0;
  v_exact_count int := 0;
BEGIN
  SELECT name_fp, address_fp, name_address_fp INTO v_req
  FROM public.hiv_selftest_requests WHERE id = p_request_id;

  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;

  IF v_req.name_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_name_count FROM public.hiv_selftest_requests
    WHERE name_fp = v_req.name_fp AND id != p_request_id AND created_at > now() - interval '30 days';
  END IF;

  IF v_req.address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_addr_count FROM public.hiv_selftest_requests
    WHERE address_fp = v_req.address_fp AND id != p_request_id AND created_at > now() - interval '30 days';
  END IF;

  IF v_req.name_address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_exact_count FROM public.hiv_selftest_requests
    WHERE name_address_fp = v_req.name_address_fp AND id != p_request_id AND created_at > now() - interval '30 days';
  END IF;

  RETURN jsonb_build_object(
    'same_name_30d', v_name_count,
    'same_address_30d', v_addr_count,
    'exact_match_30d', v_exact_count
  );
END;
$$;

-- 1. Quota settings
CREATE TABLE IF NOT EXISTS public.counseling_payout_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  max_claims integer NOT NULL DEFAULT 100,
  amount numeric NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.counseling_payout_settings TO authenticated;
GRANT SELECT ON public.counseling_payout_settings TO anon;
GRANT ALL ON public.counseling_payout_settings TO service_role;
ALTER TABLE public.counseling_payout_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout settings readable" ON public.counseling_payout_settings FOR SELECT USING (true);
CREATE POLICY "admins manage payout settings" ON public.counseling_payout_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.counseling_payout_settings (id, max_claims, amount)
VALUES (true, 100, 200) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_counseling_payout_settings_updated
BEFORE UPDATE ON public.counseling_payout_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Claim columns
ALTER TABLE public.counseling_payout_claims
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS phone_last4 text,
  ADD COLUMN IF NOT EXISTS claim_seq integer,
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS counseling_payout_claims_phone_unique
  ON public.counseling_payout_claims (phone_hash)
  WHERE phone_hash IS NOT NULL AND status <> 'rejected';

-- 3. Helper: resolve booking behind a post-eval token
CREATE OR REPLACE FUNCTION public.get_post_eval_booking(_note_id uuid)
RETURNS TABLE(appointment_id uuid, contact_phone text, attended boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,
         a.contact_phone,
         (a.checked_out_at IS NOT NULL OR a.status IN ('completed','checked_out'))
  FROM public.pre_service_counseling_notes n
  JOIN public.appointment_pre_service_surveys s ON s.id = n.survey_id
  JOIN public.appointments a ON a.id = s.booking_id
  WHERE n.id = _note_id
  LIMIT 1;
$$;

-- 4. Status RPC with quota + attendance info
DROP FUNCTION IF EXISTS public.get_post_eval_claim_status(uuid);
CREATE FUNCTION public.get_post_eval_claim_status(_token uuid)
RETURNS TABLE(
  has_evaluation boolean,
  has_claim boolean,
  claim_status text,
  amount numeric,
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  bank_last4 text,
  quota_limit integer,
  quota_used integer,
  quota_remaining integer,
  attendance_verified boolean,
  phone_last4 text,
  phone_already_claimed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note public.pre_service_counseling_notes;
  v_eval public.post_counseling_evaluations;
  v_claim public.counseling_payout_claims;
  v_limit integer;
  v_amount numeric;
  v_used integer;
  v_book record;
  v_phone_hash text;
BEGIN
  SELECT * INTO v_note FROM public.pre_service_counseling_notes WHERE post_eval_token = _token LIMIT 1;
  IF v_note.id IS NULL THEN RETURN; END IF;

  SELECT max_claims, amount INTO v_limit, v_amount FROM public.counseling_payout_settings WHERE id;
  v_limit := coalesce(v_limit, 100);
  v_amount := coalesce(v_amount, 200);

  SELECT count(*) INTO v_used FROM public.counseling_payout_claims WHERE status <> 'rejected';

  SELECT * INTO v_eval FROM public.post_counseling_evaluations WHERE note_id = v_note.id LIMIT 1;
  IF v_eval.id IS NOT NULL THEN
    SELECT * INTO v_claim FROM public.counseling_payout_claims WHERE evaluation_id = v_eval.id LIMIT 1;
  END IF;

  SELECT * INTO v_book FROM public.get_post_eval_booking(v_note.id);
  IF v_book.contact_phone IS NOT NULL THEN
    v_phone_hash := encode(digest(regexp_replace(v_book.contact_phone, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  END IF;

  RETURN QUERY SELECT
    v_eval.id IS NOT NULL,
    v_claim.id IS NOT NULL,
    v_claim.status,
    coalesce(v_claim.amount, v_amount),
    v_claim.created_at,
    v_claim.approved_at,
    v_claim.paid_at,
    v_claim.rejection_reason,
    right(v_claim.bank_account_no, 4),
    v_limit,
    v_used,
    greatest(v_limit - v_used, 0),
    coalesce(v_book.attended, false),
    right(regexp_replace(coalesce(v_book.contact_phone,''), '[^0-9]', '', 'g'), 4),
    (v_phone_hash IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.counseling_payout_claims c
      WHERE c.phone_hash = v_phone_hash AND c.status <> 'rejected'
        AND (v_eval.id IS NULL OR c.evaluation_id IS DISTINCT FROM v_eval.id)
    ));
END;
$$;

-- 5. Submit RPC with quota, attendance and phone binding
CREATE OR REPLACE FUNCTION public.submit_counseling_payout_claim(_token uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note public.pre_service_counseling_notes;
  v_eval public.post_counseling_evaluations;
  v_book record;
  v_acct text;
  v_hash text;
  v_phone text;
  v_phone_hash text;
  v_dupes integer;
  v_limit integer;
  v_amount numeric;
  v_used integer;
  v_id uuid;
BEGIN
  SELECT * INTO v_note FROM public.pre_service_counseling_notes WHERE post_eval_token = _token LIMIT 1;
  IF v_note.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_eval FROM public.post_counseling_evaluations WHERE note_id = v_note.id LIMIT 1;
  IF v_eval.id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not submitted yet' USING ERRCODE = 'P0003';
  END IF;

  IF EXISTS (SELECT 1 FROM public.counseling_payout_claims WHERE evaluation_id = v_eval.id) THEN
    RAISE EXCEPTION 'Claim already submitted' USING ERRCODE = 'P0002';
  END IF;

  -- attendance must be verified from the original booking
  SELECT * INTO v_book FROM public.get_post_eval_booking(v_note.id);
  IF v_book.appointment_id IS NULL OR NOT coalesce(v_book.attended, false) THEN
    RAISE EXCEPTION 'Visit not verified' USING ERRCODE = 'P0006';
  END IF;

  v_phone := regexp_replace(coalesce(v_book.contact_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone) < 9 THEN
    RAISE EXCEPTION 'Booking phone missing' USING ERRCODE = 'P0006';
  END IF;
  v_phone_hash := encode(digest(v_phone, 'sha256'), 'hex');

  IF EXISTS (
    SELECT 1 FROM public.counseling_payout_claims
    WHERE phone_hash = v_phone_hash AND status <> 'rejected'
  ) THEN
    RAISE EXCEPTION 'Phone already claimed' USING ERRCODE = 'P0007';
  END IF;

  SELECT max_claims, amount INTO v_limit, v_amount FROM public.counseling_payout_settings WHERE id;
  v_limit := coalesce(v_limit, 100);
  v_amount := coalesce(v_amount, 200);

  PERFORM pg_advisory_xact_lock(hashtext('counseling_payout_quota'));
  SELECT count(*) INTO v_used FROM public.counseling_payout_claims WHERE status <> 'rejected';
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Quota exhausted' USING ERRCODE = 'P0005';
  END IF;

  v_acct := regexp_replace(coalesce(_payload->>'bank_account_no',''), '[^0-9]', '', 'g');
  IF length(v_acct) < 8 OR length(v_acct) > 20 THEN
    RAISE EXCEPTION 'Invalid bank account number' USING ERRCODE = 'P0004';
  END IF;
  IF coalesce(btrim(_payload->>'bank_name'),'') = '' OR coalesce(btrim(_payload->>'account_holder_name'),'') = '' THEN
    RAISE EXCEPTION 'Missing bank details' USING ERRCODE = 'P0004';
  END IF;

  v_hash := encode(digest(v_acct, 'sha256'), 'hex');

  SELECT count(*) INTO v_dupes
  FROM public.counseling_payout_claims
  WHERE bank_account_hash = v_hash
    AND status <> 'rejected'
    AND created_at > now() - interval '90 days';

  INSERT INTO public.counseling_payout_claims (
    evaluation_id, note_id, branch_id, amount,
    account_holder_name, bank_name, bank_account_no, bank_account_hash, id_card_path,
    duplicate_flag, duplicate_count,
    phone_hash, phone_last4, appointment_id, claim_seq
  ) VALUES (
    v_eval.id, v_note.id, v_note.branch_id, v_amount,
    left(btrim(_payload->>'account_holder_name'), 120),
    left(btrim(_payload->>'bank_name'), 80),
    v_acct,
    v_hash,
    nullif(btrim(coalesce(_payload->>'id_card_path','')), ''),
    v_dupes > 0,
    v_dupes,
    v_phone_hash,
    right(v_phone, 4),
    v_book.appointment_id,
    v_used + 1
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
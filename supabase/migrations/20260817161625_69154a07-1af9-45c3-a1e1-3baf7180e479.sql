ALTER TABLE public.counseling_payout_claims
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS id_card_watermarked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.submit_counseling_payout_claim(_token uuid, _payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_method text;
  v_pp text;
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

  v_method := lower(coalesce(nullif(btrim(_payload->>'payout_method'), ''), 'bank'));
  IF v_method NOT IN ('bank', 'promptpay') THEN
    RAISE EXCEPTION 'Invalid payout method' USING ERRCODE = 'P0004';
  END IF;

  IF coalesce(btrim(_payload->>'account_holder_name'),'') = '' THEN
    RAISE EXCEPTION 'Missing bank details' USING ERRCODE = 'P0004';
  END IF;

  IF v_method = 'promptpay' THEN
    v_pp := regexp_replace(coalesce(_payload->>'promptpay_no',''), '[^0-9]', '', 'g');
    IF length(v_pp) NOT IN (10, 13) THEN
      RAISE EXCEPTION 'Invalid promptpay number' USING ERRCODE = 'P0004';
    END IF;
    v_acct := v_pp;
  ELSE
    v_acct := regexp_replace(coalesce(_payload->>'bank_account_no',''), '[^0-9]', '', 'g');
    IF length(v_acct) < 8 OR length(v_acct) > 20 THEN
      RAISE EXCEPTION 'Invalid bank account number' USING ERRCODE = 'P0004';
    END IF;
    IF coalesce(btrim(_payload->>'bank_name'),'') = '' THEN
      RAISE EXCEPTION 'Missing bank details' USING ERRCODE = 'P0004';
    END IF;
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
    signature_path, id_card_watermarked,
    payout_method, promptpay_no,
    duplicate_flag, duplicate_count,
    phone_hash, phone_last4, appointment_id, claim_seq
  ) VALUES (
    v_eval.id, v_note.id, v_note.branch_id, v_amount,
    left(btrim(_payload->>'account_holder_name'), 120),
    CASE WHEN v_method = 'promptpay'
      THEN coalesce(nullif(left(btrim(coalesce(_payload->>'bank_name','')), 80), ''), 'พร้อมเพย์')
      ELSE left(btrim(_payload->>'bank_name'), 80) END,
    v_acct,
    v_hash,
    nullif(btrim(coalesce(_payload->>'id_card_path','')), ''),
    nullif(btrim(coalesce(_payload->>'signature_path','')), ''),
    coalesce((_payload->>'id_card_watermarked')::boolean, false),
    v_method,
    CASE WHEN v_method = 'promptpay' THEN v_pp ELSE NULL END,
    v_dupes > 0,
    v_dupes,
    v_phone_hash,
    right(v_phone, 4),
    v_book.appointment_id,
    v_used + 1
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
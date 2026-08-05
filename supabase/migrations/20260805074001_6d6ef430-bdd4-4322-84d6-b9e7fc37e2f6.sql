-- 1) Duplicate detection fields on claims
ALTER TABLE public.counseling_payout_claims
  ADD COLUMN IF NOT EXISTS duplicate_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0;

-- 2) Auto-dispatch queue fields
ALTER TABLE public.post_eval_sms_dispatches
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS auto_queued boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS pesd_queue_idx
  ON public.post_eval_sms_dispatches(status, scheduled_for)
  WHERE status = 'queued';

-- 3) Claim submission: flag cross-case duplicates by bank account hash
CREATE OR REPLACE FUNCTION public.submit_counseling_payout_claim(_token uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_note public.pre_service_counseling_notes;
  v_eval public.post_counseling_evaluations;
  v_acct text;
  v_hash text;
  v_dupes integer;
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
    duplicate_flag, duplicate_count
  ) VALUES (
    v_eval.id, v_note.id, v_note.branch_id, 200,
    left(btrim(_payload->>'account_holder_name'), 120),
    left(btrim(_payload->>'bank_name'), 80),
    v_acct,
    v_hash,
    nullif(btrim(coalesce(_payload->>'id_card_path','')), ''),
    v_dupes > 0,
    v_dupes
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_counseling_payout_claim(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_counseling_payout_claim(uuid, jsonb) TO anon, authenticated, service_role;

-- 4) Richer claim status for the client tracking screen (still no PII)
DROP FUNCTION IF EXISTS public.get_post_eval_claim_status(uuid);
CREATE OR REPLACE FUNCTION public.get_post_eval_claim_status(_token uuid)
RETURNS TABLE(
  has_evaluation boolean,
  has_claim boolean,
  claim_status text,
  amount numeric,
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  bank_last4 text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id IS NOT NULL,
    c.id IS NOT NULL,
    c.status,
    coalesce(c.amount, 200),
    c.created_at,
    c.approved_at,
    c.paid_at,
    c.rejection_reason,
    right(c.bank_account_no, 4)
  FROM public.pre_service_counseling_notes n
  LEFT JOIN public.post_counseling_evaluations e ON e.note_id = n.id
  LEFT JOIN public.counseling_payout_claims c ON c.evaluation_id = e.id
  WHERE n.post_eval_token = _token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_post_eval_claim_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_eval_claim_status(uuid) TO anon, authenticated, service_role;

-- 5) Auto-queue the evaluation SMS when a visit is checked out / completed
CREATE OR REPLACE FUNCTION public.queue_post_eval_sms_on_checkout()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_note_id uuid;
  v_branch uuid;
BEGIN
  IF NEW.status NOT IN ('checked_out','completed') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF coalesce(btrim(NEW.contact_phone), '') = '' THEN
    RETURN NEW;
  END IF;

  SELECT n.id, n.branch_id INTO v_note_id, v_branch
  FROM public.pre_service_counseling_notes n
  JOIN public.appointment_pre_service_surveys s ON s.id = n.survey_id
  WHERE s.booking_id = NEW.id
  ORDER BY n.created_at DESC
  LIMIT 1;

  IF v_note_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.post_eval_sms_dispatches d
    WHERE d.note_id = v_note_id AND d.status IN ('queued','sent')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.post_eval_sms_dispatches (note_id, branch_id, appointment_id, status, auto_queued, scheduled_for)
  VALUES (v_note_id, coalesce(v_branch, NEW.branch_id), NEW.id, 'queued', true, now() + interval '30 minutes');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_post_eval_sms_trg ON public.appointments;
CREATE TRIGGER queue_post_eval_sms_trg
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.queue_post_eval_sms_on_checkout();
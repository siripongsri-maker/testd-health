-- ============ Batches ============
CREATE TABLE public.counseling_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL UNIQUE,
  period_from date NOT NULL,
  period_to date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  claim_count integer NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpb_status_chk CHECK (status IN ('draft','submitted','paid','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counseling_payout_batches TO authenticated;
GRANT ALL ON public.counseling_payout_batches TO service_role;
ALTER TABLE public.counseling_payout_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpb_admin_all ON public.counseling_payout_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============ Claims ============
CREATE TABLE public.counseling_payout_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL UNIQUE REFERENCES public.post_counseling_evaluations(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.pre_service_counseling_notes(id) ON DELETE SET NULL,
  branch_id uuid,
  amount numeric(10,2) NOT NULL DEFAULT 200,
  currency text NOT NULL DEFAULT 'THB',
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  bank_account_no text NOT NULL,
  bank_account_hash text,
  id_card_path text,
  id_card_delete_after timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  id_card_deleted_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  batch_id uuid REFERENCES public.counseling_payout_batches(id) ON DELETE SET NULL,
  approved_by uuid,
  approved_at timestamptz,
  paid_by uuid,
  paid_at timestamptz,
  payment_ref text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpc_status_chk CHECK (status IN ('pending','approved','paid','rejected')),
  CONSTRAINT cpc_amount_chk CHECK (amount > 0 AND amount <= 5000)
);
CREATE INDEX cpc_status_idx ON public.counseling_payout_claims(status);
CREATE INDEX cpc_branch_idx ON public.counseling_payout_claims(branch_id);
CREATE INDEX cpc_batch_idx ON public.counseling_payout_claims(batch_id);
CREATE INDEX cpc_retention_idx ON public.counseling_payout_claims(id_card_delete_after) WHERE id_card_deleted_at IS NULL;
CREATE INDEX cpc_acct_hash_idx ON public.counseling_payout_claims(bank_account_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.counseling_payout_claims TO authenticated;
GRANT ALL ON public.counseling_payout_claims TO service_role;
ALTER TABLE public.counseling_payout_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY cpc_admin_all ON public.counseling_payout_claims FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY cpc_branch_read ON public.counseling_payout_claims FOR SELECT TO authenticated
  USING (
    branch_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active AND sp.branch_id = counseling_payout_claims.branch_id)
      OR EXISTS (SELECT 1 FROM counselor_profiles cp WHERE cp.user_id = auth.uid() AND cp.is_active AND cp.branch_id = counseling_payout_claims.branch_id)
    )
  );

CREATE OR REPLACE FUNCTION public.cpc_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER cpc_touch_trg BEFORE UPDATE ON public.counseling_payout_claims
FOR EACH ROW EXECUTE FUNCTION public.cpc_touch();
CREATE TRIGGER cpb_touch_trg BEFORE UPDATE ON public.counseling_payout_batches
FOR EACH ROW EXECUTE FUNCTION public.cpc_touch();

-- ============ SMS dispatch log ============
CREATE TABLE public.post_eval_sms_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.pre_service_counseling_notes(id) ON DELETE CASCADE,
  branch_id uuid,
  phone_last4 text,
  phone_hash text,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error_message text,
  sent_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pesd_status_chk CHECK (status IN ('queued','sent','failed'))
);
CREATE INDEX pesd_note_idx ON public.post_eval_sms_dispatches(note_id);
GRANT SELECT, INSERT, UPDATE ON public.post_eval_sms_dispatches TO authenticated;
GRANT ALL ON public.post_eval_sms_dispatches TO service_role;
ALTER TABLE public.post_eval_sms_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY pesd_admin_all ON public.post_eval_sms_dispatches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY pesd_branch_read ON public.post_eval_sms_dispatches FOR SELECT TO authenticated
  USING (branch_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active AND sp.branch_id = post_eval_sms_dispatches.branch_id)
    OR EXISTS (SELECT 1 FROM counselor_profiles cp WHERE cp.user_id = auth.uid() AND cp.is_active AND cp.branch_id = post_eval_sms_dispatches.branch_id)
  ));
CREATE TRIGGER pesd_touch_trg BEFORE UPDATE ON public.post_eval_sms_dispatches
FOR EACH ROW EXECUTE FUNCTION public.cpc_touch();

-- ============ Guest claim submission (via post-eval magic token) ============
CREATE OR REPLACE FUNCTION public.submit_counseling_payout_claim(_token uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_note public.pre_service_counseling_notes;
  v_eval public.post_counseling_evaluations;
  v_acct text;
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

  INSERT INTO public.counseling_payout_claims (
    evaluation_id, note_id, branch_id, amount,
    account_holder_name, bank_name, bank_account_no, bank_account_hash, id_card_path
  ) VALUES (
    v_eval.id, v_note.id, v_note.branch_id, 200,
    left(btrim(_payload->>'account_holder_name'), 120),
    left(btrim(_payload->>'bank_name'), 80),
    v_acct,
    encode(digest(v_acct, 'sha256'), 'hex'),
    nullif(btrim(coalesce(_payload->>'id_card_path','')), '')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_counseling_payout_claim(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_counseling_payout_claim(uuid, jsonb) TO anon, authenticated, service_role;

-- Claim status for the guest page (no PII returned)
CREATE OR REPLACE FUNCTION public.get_post_eval_claim_status(_token uuid)
RETURNS TABLE(has_evaluation boolean, has_claim boolean, claim_status text, amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id IS NOT NULL,
    c.id IS NOT NULL,
    c.status,
    coalesce(c.amount, 200)
  FROM public.pre_service_counseling_notes n
  LEFT JOIN public.post_counseling_evaluations e ON e.note_id = n.id
  LEFT JOIN public.counseling_payout_claims c ON c.evaluation_id = e.id
  WHERE n.post_eval_token = _token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_post_eval_claim_status(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_eval_claim_status(uuid) TO anon, authenticated, service_role;
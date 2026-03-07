-- SMS Credit System Tables

CREATE TABLE IF NOT EXISTS public.sms_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own SMS balance"
  ON public.sms_credit_balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all SMS balances"
  ON public.sms_credit_balances FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert SMS balances"
  ON public.sms_credit_balances FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SMS balances"
  ON public.sms_credit_balances FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.sms_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relay_id uuid,
  transaction_type text NOT NULL CHECK (transaction_type IN ('grant','purchase','deduct','refund','adjustment')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own SMS transactions"
  ON public.sms_credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all SMS transactions"
  ON public.sms_credit_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sms_credit_transactions_user ON public.sms_credit_transactions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_sms_credit_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT balance FROM sms_credit_balances WHERE user_id = auth.uid()),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_sms_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'admin_grant'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;
  INSERT INTO sms_credit_balances (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = sms_credit_balances.balance + p_amount, updated_at = now();
  SELECT balance INTO v_new_balance FROM sms_credit_balances WHERE user_id = p_user_id;
  INSERT INTO sms_credit_transactions (user_id, transaction_type, amount, balance_after, metadata)
  VALUES (p_user_id, 'grant', p_amount, v_new_balance, jsonb_build_object('reason', p_reason, 'granted_by', auth.uid()::text));
  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_sms_credit(p_user_id uuid, p_relay_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  SELECT balance INTO v_balance FROM sms_credit_balances WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < 1 THEN
    RAISE EXCEPTION 'insufficient_sms_credits';
  END IF;
  v_new_balance := v_balance - 1;
  UPDATE sms_credit_balances SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO sms_credit_transactions (user_id, relay_id, transaction_type, amount, balance_after, metadata)
  VALUES (p_user_id, p_relay_id, 'deduct', -1, v_new_balance, '{}'::jsonb);
  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_sms_credit(p_user_id uuid, p_relay_id uuid DEFAULT NULL, p_reason text DEFAULT 'auto_refund')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  INSERT INTO sms_credit_balances (user_id, balance, updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = sms_credit_balances.balance + 1, updated_at = now();
  SELECT balance INTO v_new_balance FROM sms_credit_balances WHERE user_id = p_user_id;
  INSERT INTO sms_credit_transactions (user_id, relay_id, transaction_type, amount, balance_after, metadata)
  VALUES (p_user_id, p_relay_id, 'refund', 1, v_new_balance, jsonb_build_object('reason', p_reason));
  RETURN v_new_balance;
END;
$$;
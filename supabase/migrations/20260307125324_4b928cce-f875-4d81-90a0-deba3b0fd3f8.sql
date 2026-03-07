
-- Credit packages configuration table
CREATE TABLE public.sms_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key text UNIQUE NOT NULL,
  credits integer NOT NULL,
  price_thb numeric(10,2) NOT NULL,
  name_th text NOT NULL,
  name_en text NOT NULL,
  description_th text,
  description_en text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credit_packages ENABLE ROW LEVEL SECURITY;

-- Everyone can read active packages
CREATE POLICY "Anyone can read active packages"
  ON public.sms_credit_packages FOR SELECT
  USING (is_active = true);

-- Admin can manage packages
CREATE POLICY "Admins can manage packages"
  ON public.sms_credit_packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed starter packages
INSERT INTO public.sms_credit_packages (package_key, credits, price_thb, name_th, name_en, description_th, description_en, display_order) VALUES
  ('pack_5', 5, 50.00, '5 เครดิต', '5 Credits', 'ส่งได้ 5 ข้อความ', 'Send 5 messages', 1),
  ('pack_10', 10, 90.00, '10 เครดิต', '10 Credits', 'ส่งได้ 10 ข้อความ (ประหยัด 10%)', 'Send 10 messages (save 10%)', 2),
  ('pack_20', 20, 160.00, '20 เครดิต', '20 Credits', 'ส่งได้ 20 ข้อความ (ประหยัด 20%)', 'Send 20 messages (save 20%)', 3);

-- Purchase tracking table
CREATE TABLE public.sms_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.sms_credit_packages(id),
  package_key text NOT NULL,
  payment_provider text,
  payment_reference text,
  amount_thb numeric(10,2),
  credits integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credit_purchases ENABLE ROW LEVEL SECURITY;

-- Users can see own purchases
CREATE POLICY "Users can view own purchases"
  ON public.sms_credit_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
  ON public.sms_credit_purchases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC to complete a purchase and grant credits atomically
CREATE OR REPLACE FUNCTION public.complete_sms_purchase(p_purchase_id uuid, p_payment_reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_purchase record;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_purchase FROM sms_credit_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase_not_found'; END IF;
  IF v_purchase.status != 'pending' THEN RAISE EXCEPTION 'purchase_not_pending'; END IF;

  -- Mark purchase paid
  UPDATE sms_credit_purchases SET status = 'paid', payment_reference = COALESCE(p_payment_reference, payment_reference), updated_at = now() WHERE id = p_purchase_id;

  -- Add credits
  INSERT INTO sms_credit_balances (user_id, balance, updated_at)
  VALUES (v_purchase.user_id, v_purchase.credits, now())
  ON CONFLICT (user_id) DO UPDATE SET balance = sms_credit_balances.balance + v_purchase.credits, updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO sms_credit_transactions (user_id, transaction_type, amount, balance_after, metadata)
  VALUES (v_purchase.user_id, 'purchase', v_purchase.credits, v_new_balance, jsonb_build_object('purchase_id', p_purchase_id, 'package_key', v_purchase.package_key, 'amount_thb', v_purchase.amount_thb));

  RETURN jsonb_build_object('balance', v_new_balance, 'credits_added', v_purchase.credits);
END;
$$;

-- RPC to create a purchase (user-facing)
CREATE OR REPLACE FUNCTION public.create_sms_purchase(p_package_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_package record;
  v_purchase_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT * INTO v_package FROM sms_credit_packages WHERE package_key = p_package_key AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'package_not_found'; END IF;

  INSERT INTO sms_credit_purchases (user_id, package_id, package_key, credits, amount_thb, status)
  VALUES (v_user_id, v_package.id, v_package.package_key, v_package.credits, v_package.price_thb, 'pending')
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object('purchase_id', v_purchase_id, 'credits', v_package.credits, 'amount_thb', v_package.price_thb, 'package_key', v_package.package_key);
END;
$$;

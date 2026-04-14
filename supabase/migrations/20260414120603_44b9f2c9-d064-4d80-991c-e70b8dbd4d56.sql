
-- Reward system configuration (admin-managed)
CREATE TABLE public.reward_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward config"
  ON public.reward_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reward config"
  ON public.reward_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.reward_config (config_key, config_value) VALUES
  ('eligibility_threshold', '{"min_points": 100}'::jsonb),
  ('extra_entry_interval', '{"points_per_entry": 50}'::jsonb),
  ('prize_labels', '{"big_prize_en": "Grand Prize", "big_prize_th": "รางวัลใหญ่", "small_prize_en": "Consolation Prize", "small_prize_th": "รางวัลปลอบใจ", "big_prize_count": 1, "small_prize_count": 5}'::jsonb),
  ('draw_settings', '{"draw_day_of_month": 1, "auto_draw": false}'::jsonb);

-- Monthly reward cycles
CREATE TABLE public.reward_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL UNIQUE, -- e.g. '2026-04'
  cycle_label text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'drawn', 'archived')),
  draw_date timestamptz,
  drawn_at timestamptz,
  drawn_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward cycles"
  ON public.reward_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reward cycles"
  ON public.reward_cycles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User monthly points
CREATE TABLE public.reward_points_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL, -- e.g. '2026-04'
  total_points integer NOT NULL DEFAULT 0,
  entries integer NOT NULL DEFAULT 0,
  rank integer,
  is_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key)
);

ALTER TABLE public.reward_points_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly points"
  ON public.reward_points_monthly FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all monthly points"
  ON public.reward_points_monthly FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert/update monthly points"
  ON public.reward_points_monthly FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update own monthly points"
  ON public.reward_points_monthly FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Point transactions log
CREATE TABLE public.reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL,
  points integer NOT NULL,
  source text NOT NULL, -- e.g. 'booking', 'checkin', 'survey', 'article_read'
  source_id text, -- optional reference ID
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.reward_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.reward_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert own transactions"
  ON public.reward_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Reward winners
CREATE TABLE public.reward_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.reward_cycles(id) ON DELETE CASCADE,
  month_key text NOT NULL,
  user_id uuid NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('big', 'small')),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, user_id) -- one user can't win twice in same cycle
);

ALTER TABLE public.reward_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own wins"
  ON public.reward_winners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage winners"
  ON public.reward_winners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to calculate user rank for current month
CREATE OR REPLACE FUNCTION public.get_my_monthly_rank(p_user_id uuid, p_month_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer + 1
     FROM reward_points_monthly
     WHERE month_key = p_month_key
       AND total_points > (
         SELECT COALESCE(total_points, 0)
         FROM reward_points_monthly
         WHERE user_id = p_user_id AND month_key = p_month_key
       )
    ),
    0
  );
$$;

-- Function to get total participants for current month
CREATE OR REPLACE FUNCTION public.get_monthly_participants(p_month_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM reward_points_monthly WHERE month_key = p_month_key AND total_points > 0;
$$;

-- Function to add reward points (upserts monthly record)
CREATE OR REPLACE FUNCTION public.add_reward_points(
  p_user_id uuid,
  p_points integer,
  p_source text,
  p_source_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_key text;
  v_threshold integer;
  v_entry_interval integer;
  v_new_total integer;
BEGIN
  v_month_key := to_char(now(), 'YYYY-MM');

  -- Insert transaction
  INSERT INTO reward_transactions (user_id, month_key, points, source, source_id, description)
  VALUES (p_user_id, v_month_key, p_points, p_source, p_source_id, p_description);

  -- Upsert monthly total
  INSERT INTO reward_points_monthly (user_id, month_key, total_points)
  VALUES (p_user_id, v_month_key, p_points)
  ON CONFLICT (user_id, month_key)
  DO UPDATE SET
    total_points = reward_points_monthly.total_points + p_points,
    updated_at = now();

  -- Get new total
  SELECT total_points INTO v_new_total
  FROM reward_points_monthly
  WHERE user_id = p_user_id AND month_key = v_month_key;

  -- Get config
  SELECT COALESCE((config_value->>'min_points')::integer, 100) INTO v_threshold
  FROM reward_config WHERE config_key = 'eligibility_threshold';

  SELECT COALESCE((config_value->>'points_per_entry')::integer, 50) INTO v_entry_interval
  FROM reward_config WHERE config_key = 'extra_entry_interval';

  -- Update eligibility and entries
  UPDATE reward_points_monthly
  SET
    is_eligible = (v_new_total >= v_threshold),
    entries = GREATEST(1, v_new_total / GREATEST(v_entry_interval, 1)),
    updated_at = now()
  WHERE user_id = p_user_id AND month_key = v_month_key;

  -- Auto-create cycle if not exists
  INSERT INTO reward_cycles (month_key, cycle_label, status)
  VALUES (v_month_key, to_char(now(), 'Month YYYY'), 'open')
  ON CONFLICT (month_key) DO NOTHING;
END;
$$;

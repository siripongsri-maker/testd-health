
-- Create homepage_rewards table
CREATE TABLE public.homepage_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_title text NOT NULL,
  reward_description text NOT NULL DEFAULT '',
  reward_image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  status_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_rewards ENABLE ROW LEVEL SECURITY;

-- Public can read active rewards
CREATE POLICY "Anyone can view active rewards"
  ON public.homepage_rewards FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage rewards"
  ON public.homepage_rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create app_feature_flags table
CREATE TABLE public.app_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags
CREATE POLICY "Anyone can read feature flags"
  ON public.app_feature_flags FOR SELECT
  USING (true);

-- Admins can manage flags
CREATE POLICY "Admins can manage feature flags"
  ON public.app_feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert the homepage rewards flag (disabled by default)
INSERT INTO public.app_feature_flags (flag_key, enabled)
VALUES ('homepage_rewards_enabled', false);

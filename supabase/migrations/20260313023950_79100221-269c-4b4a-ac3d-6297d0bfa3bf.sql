
-- Lightweight demographic profile for harm reduction personalization
CREATE TABLE public.hr_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_token TEXT,
  age_range TEXT,
  gender_identity TEXT,
  sexual_behavior_category TEXT,
  is_msm BOOLEAN DEFAULT false,
  is_msw BOOLEAN DEFAULT false,
  consent_profile_use BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hr_user_profile_user_or_anon CHECK (user_id IS NOT NULL OR anonymous_token IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_hr_user_profile_user_id ON public.hr_user_profile(user_id);
CREATE INDEX idx_hr_user_profile_anon ON public.hr_user_profile(anonymous_token);

-- RLS
ALTER TABLE public.hr_user_profile ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own profile
CREATE POLICY "Users can read own hr profile"
  ON public.hr_user_profile FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own hr profile"
  ON public.hr_user_profile FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own hr profile"
  ON public.hr_user_profile FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anonymous users can insert
CREATE POLICY "Anon can insert hr profile"
  ON public.hr_user_profile FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);

-- Anon can read own profile by token
CREATE POLICY "Anon can read own hr profile"
  ON public.hr_user_profile FOR SELECT
  TO anon
  USING (anonymous_token IS NOT NULL);

-- Admin read all
CREATE POLICY "Admin can read all hr profiles"
  ON public.hr_user_profile FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregation function for admin analytics (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_hr_demographic_stats()
RETURNS TABLE(
  total_profiles BIGINT,
  msm_count BIGINT,
  msw_count BIGINT,
  age_stats JSONB,
  gender_stats JSONB,
  behavior_stats JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM hr_user_profile) AS total_profiles,
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msm = true) AS msm_count,
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msw = true) AS msw_count,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('range', age_range, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(age_range, 'unknown') AS age_range, COUNT(*) AS cnt FROM hr_user_profile GROUP BY age_range) a
    ) AS age_stats,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('identity', gender_identity, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(gender_identity, 'unknown') AS gender_identity, COUNT(*) AS cnt FROM hr_user_profile GROUP BY gender_identity) g
    ) AS gender_stats,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('category', sexual_behavior_category, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(sexual_behavior_category, 'unknown') AS sexual_behavior_category, COUNT(*) AS cnt FROM hr_user_profile GROUP BY sexual_behavior_category) s
    ) AS behavior_stats;
$$;

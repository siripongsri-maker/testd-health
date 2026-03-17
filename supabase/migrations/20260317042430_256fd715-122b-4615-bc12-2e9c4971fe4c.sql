
CREATE TABLE public.msw_rapid_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  survey_date date NOT NULL,
  survey_time time NOT NULL,
  venue_code text NOT NULL,
  bangkok_area text,
  bangkok_area_other text,
  bangkok_peer_code text,
  bangkok_peer_code_other text,
  pattaya_area text,
  pattaya_area_other text,
  pattaya_peer_code text,
  pattaya_peer_code_other text,
  respondent_type text NOT NULL,
  respondent_type_other text,
  venue_type text NOT NULL,
  venue_type_other text,
  msw_count_estimate text NOT NULL,
  msw_count_estimate_other text,
  offsite_work_ratio text NOT NULL,
  offsite_work_ratio_other text,
  nationality_mix text NOT NULL,
  nationality_mix_other text,
  foreign_groups text[] NOT NULL DEFAULT '{}',
  foreign_groups_other text,
  language_skill text NOT NULL,
  language_skill_other text,
  other_primary_language text,
  other_primary_language_other text,
  health_info_language_priority text NOT NULL,
  health_info_language_priority_other text,
  health_info_channel text NOT NULL,
  health_info_channel_other text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.msw_rapid_assessments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on msw_rapid_assessments"
  ON public.msw_rapid_assessments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert (submit survey)
CREATE POLICY "Authenticated users can submit assessments"
  ON public.msw_rapid_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can read their own submissions
CREATE POLICY "Users can read own assessments"
  ON public.msw_rapid_assessments
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

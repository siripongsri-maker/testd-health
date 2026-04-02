
-- Youth HIV Survey Responses
CREATE TABLE public.youth_hiv_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  -- Sec 0: Consent
  consent text NOT NULL,
  -- Sec 1: Role
  role text,
  -- Sec 2: Basic Profile
  age_group text,
  region text,
  gender_identities text[] DEFAULT '{}',
  -- Sec 3: HIV Knowledge
  knowledge_level text,
  prevention_methods text[] DEFAULT '{}',
  -- Sec 4: Testing
  tested_12m text,
  barriers text[] DEFAULT '{}',
  -- Sec 5: Role-specific
  school_hiv text,
  comfort_talking text,
  taught_hiv text,
  teach_barriers text[] DEFAULT '{}',
  -- Sec 6: Digital
  platforms text[] DEFAULT '{}',
  use_ai_interest text,
  -- Sec 7: Stigma + Open
  stigma_avoidance text,
  open_feedback text,
  -- Meta
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youth_hiv_survey_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous survey)
CREATE POLICY "Anyone can submit youth HIV survey"
  ON public.youth_hiv_survey_responses
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read youth HIV survey responses"
  ON public.youth_hiv_survey_responses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

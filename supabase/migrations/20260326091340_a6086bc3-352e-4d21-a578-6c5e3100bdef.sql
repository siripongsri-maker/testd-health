
-- Main feedback responses table
CREATE TABLE public.client_feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_id text NOT NULL DEFAULT ('FB-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  submitted_at timestamptz DEFAULT now(),
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  channel text NOT NULL DEFAULT 'clinic',
  language text DEFAULT 'th',
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  booking_id uuid,
  user_id uuid,
  staff_id uuid,
  branch_id uuid REFERENCES public.booking_branches(id) ON DELETE SET NULL,
  service_point text,
  referral_source text,
  is_anonymous boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'submitted',

  -- Section 1: Counselling Quality (0-4 each)
  q1_respect integer,
  q2_open_discussion integer,
  q3_info_clarity integer,
  q4_results_explained integer,
  q5_condom_demo integer,
  counselling_quality_score integer GENERATED ALWAYS AS (COALESCE(q1_respect,0) + COALESCE(q2_open_discussion,0) + COALESCE(q3_info_clarity,0) + COALESCE(q4_results_explained,0) + COALESCE(q5_condom_demo,0)) STORED,
  counselling_quality_percent numeric GENERATED ALWAYS AS (
    CASE WHEN (q1_respect IS NOT NULL OR q2_open_discussion IS NOT NULL OR q3_info_clarity IS NOT NULL OR q4_results_explained IS NOT NULL OR q5_condom_demo IS NOT NULL)
    THEN ROUND((COALESCE(q1_respect,0) + COALESCE(q2_open_discussion,0) + COALESCE(q3_info_clarity,0) + COALESCE(q4_results_explained,0) + COALESCE(q5_condom_demo,0))::numeric / 20 * 100, 1)
    ELSE NULL END
  ) STORED,

  -- Section 2-3
  satisfaction_score integer,
  self_efficacy_score integer,

  -- Section 4: Services received flags
  received_sti boolean DEFAULT false,
  received_prep boolean DEFAULT false,
  received_pep boolean DEFAULT false,
  received_art boolean DEFAULT false,
  received_harm_reduction boolean DEFAULT false,
  received_mental_health boolean DEFAULT false,
  no_additional_service boolean DEFAULT false,

  -- STI sub
  sti_status text,
  sti_knowledge_1 boolean,
  sti_knowledge_2 boolean,
  sti_knowledge_3 boolean,
  sti_knowledge_score integer GENERATED ALWAYS AS (
    COALESCE(sti_knowledge_1::int,0) + COALESCE(sti_knowledge_2::int,0) + COALESCE(sti_knowledge_3::int,0)
  ) STORED,

  -- PrEP sub
  prep_status text,
  prep_knowledge_1 boolean,
  prep_knowledge_2 boolean,
  prep_knowledge_3 boolean,
  prep_knowledge_score integer GENERATED ALWAYS AS (
    COALESCE(prep_knowledge_1::int,0) + COALESCE(prep_knowledge_2::int,0) + COALESCE(prep_knowledge_3::int,0)
  ) STORED,

  -- PEP sub
  pep_status text,
  pep_knowledge_1 boolean,
  pep_knowledge_2 boolean,
  pep_knowledge_3 boolean,
  pep_knowledge_score integer GENERATED ALWAYS AS (
    COALESCE(pep_knowledge_1::int,0) + COALESCE(pep_knowledge_2::int,0) + COALESCE(pep_knowledge_3::int,0)
  ) STORED,

  -- ART sub
  art_status text,
  art_knowledge_1 boolean,
  art_knowledge_2 boolean,
  art_knowledge_3 boolean,
  art_knowledge_score integer GENERATED ALWAYS AS (
    COALESCE(art_knowledge_1::int,0) + COALESCE(art_knowledge_2::int,0) + COALESCE(art_knowledge_3::int,0)
  ) STORED,

  -- Harm Reduction
  hr_knowledge_1 boolean,
  hr_knowledge_2 boolean,
  hr_knowledge_3 boolean,
  hr_knowledge_score integer GENERATED ALWAYS AS (
    COALESCE(hr_knowledge_1::int,0) + COALESCE(hr_knowledge_2::int,0) + COALESCE(hr_knowledge_3::int,0)
  ) STORED,
  hr_intention_change jsonb DEFAULT '[]'::jsonb,
  hr_intention_count integer DEFAULT 0,

  -- Mental Health
  mh_referral_uptake text,
  mh_outcome text,

  -- Open feedback
  open_feedback_text text,

  -- Meta
  source_app text DEFAULT 'testD',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_feedback_responses ENABLE ROW LEVEL SECURITY;

-- Anonymous insert (for client self-entry)
CREATE POLICY "Anyone can insert feedback" ON public.client_feedback_responses
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Authenticated staff can update drafts
CREATE POLICY "Staff can update own drafts" ON public.client_feedback_responses
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admin/analyst can read all
CREATE POLICY "Admin can read all feedback" ON public.client_feedback_responses
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    created_by = auth.uid()
  );

-- Index for dashboard queries
CREATE INDEX idx_feedback_service_date ON public.client_feedback_responses(service_date);
CREATE INDEX idx_feedback_branch ON public.client_feedback_responses(branch_id);
CREATE INDEX idx_feedback_channel ON public.client_feedback_responses(channel);
CREATE INDEX idx_feedback_status ON public.client_feedback_responses(status);

-- Summary view for dashboard
CREATE OR REPLACE VIEW public.feedback_summary AS
SELECT
  date_trunc('month', service_date)::date AS month,
  channel,
  branch_id,
  COUNT(*) AS total_responses,
  ROUND(AVG(counselling_quality_percent), 1) AS avg_quality_pct,
  ROUND(AVG(satisfaction_score), 2) AS avg_satisfaction,
  ROUND(AVG(self_efficacy_score), 2) AS avg_self_efficacy,
  COUNT(*) FILTER (WHERE received_sti) AS sti_count,
  COUNT(*) FILTER (WHERE received_prep) AS prep_count,
  COUNT(*) FILTER (WHERE received_pep) AS pep_count,
  COUNT(*) FILTER (WHERE received_art) AS art_count,
  COUNT(*) FILTER (WHERE received_harm_reduction) AS hr_count,
  COUNT(*) FILTER (WHERE received_mental_health) AS mh_count,
  ROUND(AVG(sti_knowledge_score) FILTER (WHERE received_sti), 2) AS avg_sti_knowledge,
  ROUND(AVG(prep_knowledge_score) FILTER (WHERE received_prep), 2) AS avg_prep_knowledge,
  ROUND(AVG(pep_knowledge_score) FILTER (WHERE received_pep), 2) AS avg_pep_knowledge,
  ROUND(AVG(art_knowledge_score) FILTER (WHERE received_art), 2) AS avg_art_knowledge,
  ROUND(AVG(hr_knowledge_score) FILTER (WHERE received_harm_reduction), 2) AS avg_hr_knowledge,
  COUNT(*) FILTER (WHERE mh_outcome IN ('much_better','slightly_better')) AS mh_improved,
  COUNT(*) FILTER (WHERE received_mental_health) AS mh_total
FROM public.client_feedback_responses
WHERE status = 'submitted'
GROUP BY 1, 2, 3;

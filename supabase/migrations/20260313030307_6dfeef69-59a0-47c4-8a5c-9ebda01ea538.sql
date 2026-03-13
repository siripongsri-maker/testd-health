
-- MEL Phase 0: Full Data Architecture

-- 1. Extend profiles with MEL fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS participant_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS consent_mel_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrollment_date date,
  ADD COLUMN IF NOT EXISTS population_group text,
  ADD COLUMN IF NOT EXISTS is_active_participant boolean DEFAULT true;

-- 2. Consent Records
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_token text,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_hint text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consent" ON public.consent_records FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read consent" ON public.consent_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Service Events
CREATE TABLE IF NOT EXISTS public.service_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  event_type text NOT NULL,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  branch_id uuid REFERENCES public.booking_branches(id),
  staff_id uuid,
  appointment_id uuid REFERENCES public.appointments(id),
  description_th text,
  description_en text,
  outcome text,
  population_group text,
  is_first_visit boolean DEFAULT false,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff insert service events" ON public.service_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Admin read service events" ON public.service_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'me_analyst'));
CREATE POLICY "Staff update service events" ON public.service_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 4. Clinic Encounters
CREATE TABLE IF NOT EXISTS public.clinic_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  service_event_id uuid REFERENCES public.service_events(id),
  encounter_date date NOT NULL DEFAULT CURRENT_DATE,
  branch_id uuid REFERENCES public.booking_branches(id),
  encounter_type text NOT NULL,
  clinical_notes text,
  outcome text,
  follow_up_needed boolean DEFAULT false,
  follow_up_date date,
  staff_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.clinic_encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage clinic encounters" ON public.clinic_encounters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read clinic" ON public.clinic_encounters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 5. Follow-up Events
CREATE TABLE IF NOT EXISTS public.followup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  source_type text NOT NULL,
  source_id uuid,
  followup_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text DEFAULT 'pending',
  response_data jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.followup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own followups" ON public.followup_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff manage followups" ON public.followup_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read followups" ON public.followup_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 6. Referral Pathways
CREATE TABLE IF NOT EXISTS public.referral_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_service text NOT NULL,
  to_service text NOT NULL,
  to_organization text,
  to_branch_id uuid REFERENCES public.booking_branches(id),
  pathway_name_th text,
  pathway_name_en text,
  is_internal boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.referral_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage referral pathways" ON public.referral_pathways FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read referral pathways" ON public.referral_pathways FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read pathways" ON public.referral_pathways FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 7. MEL Referrals
CREATE TABLE IF NOT EXISTS public.mel_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  pathway_id uuid REFERENCES public.referral_pathways(id),
  service_event_id uuid REFERENCES public.service_events(id),
  referral_date date NOT NULL DEFAULT CURRENT_DATE,
  referral_status text DEFAULT 'initiated',
  from_context text,
  to_service text,
  to_organization text,
  completion_date date,
  outcome_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mel_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage mel referrals" ON public.mel_referrals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read referrals" ON public.mel_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 8. Outreach Events
CREATE TABLE IF NOT EXISTS public.outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  event_type text NOT NULL,
  location_name text,
  location_type text,
  branch_id uuid REFERENCES public.booking_branches(id),
  staff_ids uuid[] DEFAULT '{}',
  people_reached integer DEFAULT 0,
  materials_distributed integer DEFAULT 0,
  condoms_distributed integer DEFAULT 0,
  lube_distributed integer DEFAULT 0,
  referrals_made integer DEFAULT 0,
  hiv_tests_done integer DEFAULT 0,
  campaign_code text,
  notes text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage outreach events" ON public.outreach_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read outreach" ON public.outreach_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 9. Outreach Channels
CREATE TABLE IF NOT EXISTS public.outreach_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name text NOT NULL,
  channel_type text NOT NULL,
  platform text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outreach_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage channels" ON public.outreach_channels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read channels" ON public.outreach_channels FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 10. Training Curricula
CREATE TABLE IF NOT EXISTS public.training_curricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_th text NOT NULL,
  title_en text NOT NULL,
  description_th text,
  description_en text,
  target_audience text,
  duration_hours numeric(5,1),
  modules jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage curricula" ON public.training_curricula FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read curricula" ON public.training_curricula FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read curricula" ON public.training_curricula FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 11. Training Sessions
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid REFERENCES public.training_curricula(id),
  session_date date NOT NULL,
  session_title_th text,
  session_title_en text,
  location text,
  branch_id uuid REFERENCES public.booking_branches(id),
  trainer_ids uuid[] DEFAULT '{}',
  total_participants integer DEFAULT 0,
  status text DEFAULT 'planned',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage training sessions" ON public.training_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read sessions" ON public.training_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 12. Training Attendance
CREATE TABLE IF NOT EXISTS public.training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_name text,
  participant_id uuid,
  organization text,
  role text,
  pre_test_score numeric(5,1),
  post_test_score numeric(5,1),
  certificate_issued boolean DEFAULT false,
  feedback text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage attendance" ON public.training_attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read attendance" ON public.training_attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 13. Support Groups
CREATE TABLE IF NOT EXISTS public.support_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name_th text NOT NULL,
  group_name_en text NOT NULL,
  group_type text,
  target_population text,
  facilitator_ids uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage groups" ON public.support_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read groups" ON public.support_groups FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 14. Support Sessions
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.support_groups(id),
  session_date date NOT NULL,
  session_title_th text,
  session_title_en text,
  location text,
  branch_id uuid REFERENCES public.booking_branches(id),
  facilitator_ids uuid[] DEFAULT '{}',
  total_participants integer DEFAULT 0,
  topics_covered text[],
  community_dialogue_notes text,
  status text DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage support sessions" ON public.support_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read support sessions" ON public.support_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 15. Support Session Attendance
CREATE TABLE IF NOT EXISTS public.support_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.support_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_name text,
  participant_id uuid,
  feedback_rating integer,
  feedback_text text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage ss attendance" ON public.support_session_attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read ss attendance" ON public.support_session_attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 16. Partner Organizations
CREATE TABLE IF NOT EXISTS public.partner_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th text NOT NULL,
  name_en text NOT NULL,
  org_type text,
  country text DEFAULT 'Thailand',
  contact_name text,
  contact_email text,
  contact_phone text,
  partnership_status text DEFAULT 'active',
  services_provided text[],
  mou_signed boolean DEFAULT false,
  mou_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage partners" ON public.partner_organizations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read partners" ON public.partner_organizations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read partners" ON public.partner_organizations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 17. Engagement Meetings
CREATE TABLE IF NOT EXISTS public.engagement_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  meeting_type text,
  title_th text,
  title_en text,
  location text,
  partner_org_ids uuid[] DEFAULT '{}',
  attendee_names text[],
  agenda text,
  minutes text,
  outcomes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.engagement_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage meetings" ON public.engagement_meetings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read meetings" ON public.engagement_meetings FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "ME analyst read meetings" ON public.engagement_meetings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 18. Meeting Actions
CREATE TABLE IF NOT EXISTS public.meeting_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.engagement_meetings(id) ON DELETE CASCADE NOT NULL,
  action_text text NOT NULL,
  assigned_to text,
  due_date date,
  status text DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.meeting_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage actions" ON public.meeting_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read actions" ON public.meeting_actions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true));

-- 19. Policy Evidence Logs
CREATE TABLE IF NOT EXISTS public.policy_evidence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_date date NOT NULL DEFAULT CURRENT_DATE,
  evidence_type text NOT NULL,
  title_th text,
  title_en text,
  description text,
  source_url text,
  source_file_url text,
  meeting_id uuid REFERENCES public.engagement_meetings(id),
  impact_level text,
  verified boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.policy_evidence_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage evidence" ON public.policy_evidence_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read evidence" ON public.policy_evidence_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 20. Situational Analysis Items
CREATE TABLE IF NOT EXISTS public.situational_analysis_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  title_th text,
  title_en text,
  summary text,
  tags text[] DEFAULT '{}',
  source_description text,
  file_url text,
  population_focus text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.situational_analysis_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage SA items" ON public.situational_analysis_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read SA" ON public.situational_analysis_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 21. Knowledge Products
CREATE TABLE IF NOT EXISTS public.knowledge_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL,
  title_th text NOT NULL,
  title_en text NOT NULL,
  description text,
  file_url text,
  published_at timestamptz,
  status text DEFAULT 'draft',
  target_audience text,
  tags text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.knowledge_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage KP" ON public.knowledge_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read KP" ON public.knowledge_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 22. Dissemination Logs
CREATE TABLE IF NOT EXISTS public.dissemination_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_product_id uuid REFERENCES public.knowledge_products(id),
  dissemination_date date NOT NULL DEFAULT CURRENT_DATE,
  channel text,
  audience text,
  reach_count integer,
  feedback text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dissemination_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage dissemination" ON public.dissemination_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read dissemination" ON public.dissemination_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 23. Evaluation Questions
CREATE TABLE IF NOT EXISTS public.evaluation_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type text DEFAULT 'keq',
  result_area text,
  data_sources text,
  methodology text,
  responsible text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage eval q" ON public.evaluation_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read eval q" ON public.evaluation_questions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 24. Evaluation Matrix Rows
CREATE TABLE IF NOT EXISTS public.evaluation_matrix_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_question_id uuid REFERENCES public.evaluation_questions(id) ON DELETE CASCADE,
  indicator text,
  data_collection_method text,
  data_source text,
  frequency text,
  responsible text,
  baseline text,
  target text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.evaluation_matrix_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage eval matrix" ON public.evaluation_matrix_rows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read eval matrix" ON public.evaluation_matrix_rows FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 25. Evaluation Risks
CREATE TABLE IF NOT EXISTS public.evaluation_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_description text NOT NULL,
  risk_category text,
  likelihood text,
  impact text,
  mitigation text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.evaluation_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage eval risks" ON public.evaluation_risks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read eval risks" ON public.evaluation_risks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 26. MEL Timeline Items
CREATE TABLE IF NOT EXISTS public.mel_timeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name text NOT NULL,
  activity_type text,
  start_date date,
  end_date date,
  responsible text,
  status text DEFAULT 'planned',
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.mel_timeline_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage mel timeline" ON public.mel_timeline_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read mel timeline" ON public.mel_timeline_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 27. Indicator Definitions
CREATE TABLE IF NOT EXISTS public.indicator_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code text UNIQUE NOT NULL,
  indicator_name_th text NOT NULL,
  indicator_name_en text NOT NULL,
  result_level text NOT NULL,
  result_area text,
  unit text DEFAULT 'count',
  direction text DEFAULT 'higher_is_better',
  baseline_value numeric,
  baseline_date date,
  target_value numeric,
  target_date date,
  data_source text,
  collection_frequency text DEFAULT 'quarterly',
  calculation_method text,
  disaggregation text[],
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.indicator_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage indicators" ON public.indicator_definitions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read indicators" ON public.indicator_definitions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 28. Reporting Periods
CREATE TABLE IF NOT EXISTS public.reporting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  period_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'open',
  submitted_at timestamptz,
  submitted_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage periods" ON public.reporting_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read periods" ON public.reporting_periods FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 29. Indicator Results
CREATE TABLE IF NOT EXISTS public.indicator_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES public.indicator_definitions(id) ON DELETE CASCADE NOT NULL,
  reporting_period_id uuid REFERENCES public.reporting_periods(id),
  period_label text,
  value numeric NOT NULL,
  disaggregation_key text,
  notes text,
  data_quality_flag text,
  entered_by uuid,
  verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.indicator_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage results" ON public.indicator_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read results" ON public.indicator_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- 30. Data Quality Flags
CREATE TABLE IF NOT EXISTS public.data_quality_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type text NOT NULL,
  source_table text NOT NULL,
  source_id uuid,
  description text,
  severity text DEFAULT 'warning',
  status text DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.data_quality_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage dq flags" ON public.data_quality_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ME analyst read dq flags" ON public.data_quality_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'me_analyst'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_events_date ON public.service_events(service_date);
CREATE INDEX IF NOT EXISTS idx_service_events_type ON public.service_events(event_type);
CREATE INDEX IF NOT EXISTS idx_service_events_user ON public.service_events(user_id);
CREATE INDEX IF NOT EXISTS idx_followup_events_status ON public.followup_events(status);
CREATE INDEX IF NOT EXISTS idx_followup_events_scheduled ON public.followup_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mel_referrals_status ON public.mel_referrals(referral_status);
CREATE INDEX IF NOT EXISTS idx_outreach_events_date ON public.outreach_events(event_date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON public.training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_indicator_results_indicator ON public.indicator_results(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_results_period ON public.indicator_results(reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_clinic_encounters_date ON public.clinic_encounters(encounter_date);
CREATE INDEX IF NOT EXISTS idx_data_quality_flags_status ON public.data_quality_flags(status);


-- Unified outreach situational form table
CREATE TABLE public.outreach_situational_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Section A: Basic Session Info
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  observer_name TEXT NOT NULL,
  observer_role TEXT,
  peer_code TEXT,
  city TEXT NOT NULL,
  area_name TEXT NOT NULL,
  venue_alias TEXT,
  venue_type TEXT,
  outreach_type TEXT DEFAULT 'venue',
  record_type TEXT DEFAULT 'single_session',
  
  -- Section B: Location & Context
  environment_notes TEXT,
  activity_intensity TEXT,
  visible_changes TEXT,
  is_known_hotspot BOOLEAN DEFAULT false,
  is_emerging_hotspot BOOLEAN DEFAULT false,
  
  -- Section C: Population Observation
  estimated_msw_count TEXT,
  estimated_msm_count TEXT,
  population_pattern TEXT,
  nationality_pattern TEXT,
  nationality_groups TEXT[],
  age_pattern TEXT,
  online_offline_linkage TEXT,
  work_pattern TEXT,
  mobility_pattern TEXT,
  offsite_ratio TEXT,
  
  -- Section D: Risk / Situational Signals
  chemsex_signal TEXT DEFAULT 'ไม่พบ',
  common_substances TEXT,
  injection_signal TEXT DEFAULT 'ไม่พบ',
  mental_health_signal TEXT DEFAULT 'ไม่พบ',
  violence_safety_signal TEXT DEFAULT 'ไม่พบ',
  police_pressure_signal TEXT DEFAULT 'ไม่พบ',
  housing_vulnerability_signal TEXT DEFAULT 'ไม่พบ',
  access_barrier_signal TEXT DEFAULT 'ไม่พบ',
  digital_platform_pattern TEXT,
  urgency_level TEXT DEFAULT 'normal',
  
  -- Section E: Service Access / Needs / Barriers
  service_interests TEXT[],
  service_barriers TEXT[],
  preferred_contact_channel TEXT,
  preferred_service_model TEXT,
  
  -- Section F: Communication & Language
  main_language TEXT,
  other_languages TEXT,
  communication_barrier_level TEXT DEFAULT 'ไม่มี',
  barrier_observation_note TEXT,
  interpreter_needed BOOLEAN DEFAULT false,
  digital_content_language TEXT,
  
  -- Section G: Programme Implications
  key_finding_summary TEXT,
  recommended_action TEXT,
  immediate_followup_needed BOOLEAN DEFAULT false,
  project_implications TEXT[],
  policy_issue TEXT,
  internal_note TEXT,
  confidence_level TEXT DEFAULT 'medium',
  
  -- Meta
  is_draft BOOLEAN DEFAULT true,
  submitted_by UUID,
  record_source TEXT DEFAULT 'unified_form',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.outreach_situational_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on outreach_situational_forms"
  ON public.outreach_situational_forms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert outreach_situational_forms"
  ON public.outreach_situational_forms FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view own outreach_situational_forms"
  ON public.outreach_situational_forms FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));


-- Counseling sessions table
CREATE TABLE IF NOT EXISTS public.counseling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id UUID REFERENCES public.service_pathways(id),
  encounter_id UUID REFERENCES public.clinic_encounters(id),
  staff_id UUID,
  branch_id UUID REFERENCES public.booking_branches(id),
  participant_name TEXT,
  anonymous_token TEXT,
  user_id UUID,
  session_type TEXT NOT NULL DEFAULT 'harm_reduction_counseling',
  session_status TEXT NOT NULL DEFAULT 'in_progress',
  focus_areas TEXT[] DEFAULT '{}',
  guidance_notes TEXT,
  action_plan JSONB DEFAULT '[]',
  followup_plan TEXT DEFAULT 'none',
  followup_due_date DATE,
  session_outcome TEXT,
  intake_reason TEXT[] DEFAULT '{}',
  intake_urgency TEXT DEFAULT 'normal',
  intake_notes TEXT,
  intake_questions JSONB DEFAULT '{}',
  digital_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Clinic walk-in registrations
CREATE TABLE IF NOT EXISTS public.clinic_walkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.booking_branches(id),
  participant_name TEXT,
  anonymous_id TEXT,
  age_range TEXT,
  gender_identity TEXT,
  community_context TEXT,
  source TEXT DEFAULT 'walk_in',
  reason_for_visit TEXT[] DEFAULT '{}',
  urgency_level TEXT DEFAULT 'normal',
  preferred_language TEXT DEFAULT 'th',
  consent_confirmed BOOLEAN DEFAULT false,
  queue_status TEXT DEFAULT 'waiting',
  pathway_id UUID REFERENCES public.service_pathways(id),
  session_id UUID REFERENCES public.counseling_sessions(id),
  staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  intake_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.counseling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_walkins ENABLE ROW LEVEL SECURITY;

-- RLS: admins and moderators can manage
CREATE POLICY "Admin full access counseling_sessions" ON public.counseling_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderator access counseling_sessions" ON public.counseling_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admin full access clinic_walkins" ON public.clinic_walkins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderator access clinic_walkins" ON public.clinic_walkins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.counseling_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_walkins;

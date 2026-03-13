
-- 1. Create service_pathways table
CREATE TABLE IF NOT EXISTS public.service_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  anonymous_token TEXT,
  entry_point TEXT NOT NULL DEFAULT 'harm_reduction',
  reason_for_visit TEXT[] DEFAULT '{}',
  intake_age_range TEXT,
  intake_gender TEXT,
  intake_context TEXT,
  intake_urgency TEXT DEFAULT 'normal',
  preferred_support_channel TEXT,
  screening_completed BOOLEAN DEFAULT false,
  screening_distress_level TEXT,
  recommendation_shown TEXT[],
  recommendation_accepted TEXT[],
  service_status TEXT DEFAULT 'started',
  followup_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pathways" ON public.service_pathways
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own pathways" ON public.service_pathways
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own pathways" ON public.service_pathways
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anon can insert pathways" ON public.service_pathways
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Admin full access pathways" ON public.service_pathways
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

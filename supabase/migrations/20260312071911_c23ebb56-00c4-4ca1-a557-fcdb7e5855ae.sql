
-- Harm Reduction Module Tables

-- Anonymous user profiles for HR module (optional, allows anonymous usage)
CREATE TABLE public.hr_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text UNIQUE,
  nickname text,
  consent_given boolean DEFAULT false,
  consent_given_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Screenings (multi-step risk assessment)
CREATE TABLE public.hr_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  status text DEFAULT 'in_progress',
  risk_level text,
  recommendations jsonb DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Substance use answers
CREATE TABLE public.hr_substance_use (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE CASCADE NOT NULL,
  substances text[] DEFAULT '{}',
  frequency text,
  mixing boolean DEFAULT false,
  injection_use boolean DEFAULT false,
  slam_use boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Sexual health answers
CREATE TABLE public.hr_sexual_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE CASCADE NOT NULL,
  condom_use text,
  prep_use text,
  last_hiv_test text,
  sti_history boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Harm history answers
CREATE TABLE public.hr_harm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE CASCADE NOT NULL,
  overdose boolean DEFAULT false,
  panic boolean DEFAULT false,
  blackout boolean DEFAULT false,
  crash boolean DEFAULT false,
  injury boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Mental health answers
CREATE TABLE public.hr_mental_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE CASCADE NOT NULL,
  anxiety_level integer DEFAULT 0,
  depression_level integer DEFAULT 0,
  loneliness_level integer DEFAULT 0,
  sleep_issues_level integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Safer use plans
CREATE TABLE public.hr_safer_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  plan_name text DEFAULT 'My Safety Plan',
  checklist jsonb DEFAULT '[]'::jsonb,
  plan_date date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reminders
CREATE TABLE public.hr_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  plan_id uuid REFERENCES public.hr_safer_plans(id) ON DELETE SET NULL,
  reminder_type text NOT NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_interval text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Counseling referrals
CREATE TABLE public.hr_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  referral_type text NOT NULL,
  status text DEFAULT 'requested',
  priority text DEFAULT 'normal',
  contact_method text,
  contact_value text,
  notes text,
  assigned_to uuid,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Follow-ups
CREATE TABLE public.hr_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.hr_referrals(id) ON DELETE CASCADE,
  screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE SET NULL,
  user_id uuid,
  followup_type text NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Knowledge progress tracking
CREATE TABLE public.hr_knowledge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anonymous_token text,
  content_id text NOT NULL,
  content_type text NOT NULL,
  completed boolean DEFAULT false,
  score integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hr_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_substance_use ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_sexual_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_harm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_mental_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_safer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_knowledge_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own data
CREATE POLICY "Users manage own hr profiles" ON public.hr_user_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own screenings" ON public.hr_screenings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own substance use" ON public.hr_substance_use FOR ALL TO authenticated USING (screening_id IN (SELECT id FROM public.hr_screenings WHERE user_id = auth.uid()));
CREATE POLICY "Users read own sexual health" ON public.hr_sexual_health FOR ALL TO authenticated USING (screening_id IN (SELECT id FROM public.hr_screenings WHERE user_id = auth.uid()));
CREATE POLICY "Users read own harm history" ON public.hr_harm_history FOR ALL TO authenticated USING (screening_id IN (SELECT id FROM public.hr_screenings WHERE user_id = auth.uid()));
CREATE POLICY "Users read own mental health" ON public.hr_mental_health FOR ALL TO authenticated USING (screening_id IN (SELECT id FROM public.hr_screenings WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own safer plans" ON public.hr_safer_plans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own reminders" ON public.hr_reminders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own referrals" ON public.hr_referrals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own followups" ON public.hr_followups FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own knowledge progress" ON public.hr_knowledge_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Anonymous insert policies (allow unauthenticated inserts with anonymous_token)
CREATE POLICY "Anon insert screenings" ON public.hr_screenings FOR INSERT TO anon WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);
CREATE POLICY "Anon insert substance use" ON public.hr_substance_use FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert sexual health" ON public.hr_sexual_health FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert harm history" ON public.hr_harm_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert mental health" ON public.hr_mental_health FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon insert safer plans" ON public.hr_safer_plans FOR INSERT TO anon WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);
CREATE POLICY "Anon insert referrals" ON public.hr_referrals FOR INSERT TO anon WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);
CREATE POLICY "Anon insert knowledge progress" ON public.hr_knowledge_progress FOR INSERT TO anon WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);

-- Admin read-all policies (for M&E dashboard)
CREATE POLICY "Admins read all hr profiles" ON public.hr_user_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all screenings" ON public.hr_screenings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all substance use" ON public.hr_substance_use FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all sexual health" ON public.hr_sexual_health FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all harm history" ON public.hr_harm_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all mental health" ON public.hr_mental_health FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all safer plans" ON public.hr_safer_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all reminders" ON public.hr_reminders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all referrals" ON public.hr_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all referrals" ON public.hr_referrals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all followups" ON public.hr_followups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all followups" ON public.hr_followups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all knowledge progress" ON public.hr_knowledge_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for referrals (staff need live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_referrals;


-- Scenario templates
CREATE TABLE public.hr_safety_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  icon TEXT NOT NULL DEFAULT 'shield',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_safety_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active scenarios" ON public.hr_safety_scenarios FOR SELECT USING (is_active = true);

-- User safety plans
CREATE TABLE public.hr_user_safety_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_token TEXT,
  scenario_id UUID REFERENCES public.hr_safety_scenarios(id),
  substances_selected TEXT[] DEFAULT '{}',
  sex_related BOOLEAN DEFAULT false,
  using_alone BOOLEAN DEFAULT false,
  alcohol_involved BOOLEAN DEFAULT false,
  buddy_enabled BOOLEAN DEFAULT false,
  hydration_enabled BOOLEAN DEFAULT false,
  dose_timer_enabled BOOLEAN DEFAULT false,
  recovery_check_enabled BOOLEAN DEFAULT false,
  swing_referral_enabled BOOLEAN DEFAULT false,
  emergency_shortcuts_enabled BOOLEAN DEFAULT false,
  saved_plan_json JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_user_safety_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plans" ON public.hr_user_safety_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anon can insert plans" ON public.hr_user_safety_plans FOR INSERT WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);

-- Plan actions / reminders
CREATE TABLE public.hr_plan_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.hr_user_safety_plans(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  label_th TEXT NOT NULL,
  label_en TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_plan_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plan actions" ON public.hr_plan_actions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hr_user_safety_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

-- Safety alert events
CREATE TABLE public.hr_safety_alert_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_token TEXT,
  plan_id UUID REFERENCES public.hr_user_safety_plans(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  response_action TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_safety_alert_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own alerts" ON public.hr_safety_alert_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert alerts" ON public.hr_safety_alert_events FOR INSERT WITH CHECK (true);

-- Referral events
CREATE TABLE public.hr_referral_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_token TEXT,
  referral_type TEXT NOT NULL,
  referral_target TEXT NOT NULL DEFAULT 'swing_clinic',
  source_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_referral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert referral events" ON public.hr_referral_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users see own referrals" ON public.hr_referral_events FOR SELECT USING (auth.uid() = user_id);

-- Callback requests (ElevenLabs readiness)
CREATE TABLE public.hr_callback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_token TEXT,
  phone_number TEXT,
  consent_to_call BOOLEAN NOT NULL DEFAULT false,
  preferred_language TEXT DEFAULT 'th',
  preferred_time TEXT,
  callback_reason TEXT,
  callback_status TEXT NOT NULL DEFAULT 'pending',
  escalation_level TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_callback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own callbacks" ON public.hr_callback_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anon can insert callbacks" ON public.hr_callback_requests FOR INSERT WITH CHECK (user_id IS NULL AND anonymous_token IS NOT NULL);

-- Voice integration settings (admin-only config)
CREATE TABLE public.hr_voice_integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL DEFAULT 'elevenlabs',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  inbound_supported BOOLEAN NOT NULL DEFAULT false,
  outbound_supported BOOLEAN NOT NULL DEFAULT false,
  escalation_rules_json JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_voice_integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read voice settings" ON public.hr_voice_integration_settings FOR SELECT USING (true);

-- Call events log
CREATE TABLE public.hr_call_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  callback_request_id UUID REFERENCES public.hr_callback_requests(id) ON DELETE SET NULL,
  provider_name TEXT DEFAULT 'elevenlabs',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read call events" ON public.hr_call_events FOR SELECT USING (true);

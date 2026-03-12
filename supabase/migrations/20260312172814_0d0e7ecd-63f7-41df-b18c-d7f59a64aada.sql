
-- hr_ai_conversations: anonymized AI companion usage logs
CREATE TABLE public.hr_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert ai conversations" ON public.hr_ai_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view ai conversations" ON public.hr_ai_conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hr_dose_logs: optionally synced dose timer logs
CREATE TABLE public.hr_dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  substance text NOT NULL,
  dose_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own dose logs" ON public.hr_dose_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view own dose logs" ON public.hr_dose_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- hr_nudge_events: nudge impressions/dismissals
CREATE TABLE public.hr_nudge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  nudge_type text NOT NULL,
  action text NOT NULL DEFAULT 'shown',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_nudge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert nudge events" ON public.hr_nudge_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view nudge events" ON public.hr_nudge_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hr_distress_alerts: mental health escalation events
CREATE TABLE public.hr_distress_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  trigger_type text NOT NULL,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_distress_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert distress alerts" ON public.hr_distress_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view distress alerts" ON public.hr_distress_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hr_peer_posts: anonymous peer support posts
CREATE TABLE public.hr_peer_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_token text NOT NULL,
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_peer_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert peer posts" ON public.hr_peer_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can view approved posts" ON public.hr_peer_posts FOR SELECT TO anon, authenticated USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update peer posts" ON public.hr_peer_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hr_peer_replies: replies to peer posts
CREATE TABLE public.hr_peer_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.hr_peer_posts(id) ON DELETE CASCADE,
  anonymous_token text NOT NULL,
  content text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_peer_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert peer replies" ON public.hr_peer_replies FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can view approved replies" ON public.hr_peer_replies FOR SELECT TO anon, authenticated USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update peer replies" ON public.hr_peer_replies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

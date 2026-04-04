
-- Virtual Story Sessions
CREATE TABLE public.virtual_story_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  episode_number integer NOT NULL DEFAULT 1,
  user_id uuid,
  anonymous_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  exited_at timestamptz,
  current_scene text,
  completed boolean NOT NULL DEFAULT false,
  result_type text,
  path_selected text,
  knowledge_score integer NOT NULL DEFAULT 0,
  readiness_score integer NOT NULL DEFAULT 0,
  community_score integer NOT NULL DEFAULT 0,
  language text DEFAULT 'th',
  source_page text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_story_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create story sessions"
  ON public.virtual_story_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own story sessions"
  ON public.virtual_story_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read story sessions"
  ON public.virtual_story_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Virtual Story Events
CREATE TABLE public.virtual_story_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.virtual_story_sessions(id) ON DELETE CASCADE NOT NULL,
  story_id text NOT NULL,
  event_name text NOT NULL,
  scene_id text,
  scene_label text,
  choice_key text,
  choice_text text,
  topic text,
  cta_target text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_story_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create story events"
  ON public.virtual_story_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read story events"
  ON public.virtual_story_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for analytics queries
CREATE INDEX idx_vss_story_id ON public.virtual_story_sessions(story_id);
CREATE INDEX idx_vss_created_at ON public.virtual_story_sessions(created_at);
CREATE INDEX idx_vss_completed ON public.virtual_story_sessions(completed);
CREATE INDEX idx_vse_session_id ON public.virtual_story_events(session_id);
CREATE INDEX idx_vse_event_name ON public.virtual_story_events(event_name);
CREATE INDEX idx_vse_story_id ON public.virtual_story_events(story_id);

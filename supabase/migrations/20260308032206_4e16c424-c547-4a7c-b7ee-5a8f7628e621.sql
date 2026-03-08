
-- Community milestones table
CREATE TABLE public.community_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL, -- e.g. '2026-03'
  metric_type text NOT NULL DEFAULT 'tests_completed',
  target_value integer NOT NULL DEFAULT 1000,
  current_value integer NOT NULL DEFAULT 0,
  reward_xp integer NOT NULL DEFAULT 50,
  reward_ticket integer NOT NULL DEFAULT 1,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month, metric_type)
);

ALTER TABLE public.community_milestones ENABLE ROW LEVEL SECURITY;

-- Everyone can read milestones
CREATE POLICY "Anyone can read milestones"
  ON public.community_milestones FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage milestones"
  ON public.community_milestones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_milestones;


CREATE TABLE public.field_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- basic info
  visit_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  observer_name text NOT NULL,
  -- location
  city text NOT NULL,
  area_name text NOT NULL,
  venue_alias text NOT NULL,
  -- observation
  estimated_msw_seen integer NOT NULL DEFAULT 0,
  estimated_offsite_clients text NOT NULL DEFAULT '',
  visible_nationality_ratio text NOT NULL DEFAULT '',
  -- informant sources
  info_sources text[] NOT NULL DEFAULT '{}',
  estimated_msw_per_night_range text NOT NULL DEFAULT '',
  foreign_msw_ratio text NOT NULL,
  main_nationality_groups text NOT NULL DEFAULT '',
  -- language & communication
  common_languages text NOT NULL DEFAULT '',
  communication_barrier_level text NOT NULL,
  barrier_observation_note text,
  -- project implications
  project_implications text[] NOT NULL DEFAULT '{}',
  -- meta
  internal_note text,
  is_draft boolean NOT NULL DEFAULT false,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.field_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on field_notes"
  ON public.field_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert field_notes"
  ON public.field_notes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own field_notes"
  ON public.field_notes FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own drafts"
  ON public.field_notes FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND is_draft = true)
  WITH CHECK (submitted_by = auth.uid());

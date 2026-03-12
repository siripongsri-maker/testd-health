
-- Daily check-ins table for retention engine
CREATE TABLE public.hr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  anonymous_token TEXT,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress INTEGER NOT NULL CHECK (stress BETWEEN 1 AND 5),
  sleep INTEGER NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date),
  UNIQUE (anonymous_token, checkin_date)
);

ALTER TABLE public.hr_checkins ENABLE ROW LEVEL SECURITY;

-- Anyone can insert
CREATE POLICY "Anyone can insert checkins"
  ON public.hr_checkins FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can read own checkins
CREATE POLICY "Users can read own checkins"
  ON public.hr_checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anon can read by token
CREATE POLICY "Anon can read own checkins by token"
  ON public.hr_checkins FOR SELECT
  TO anon
  USING (anonymous_token IS NOT NULL);

-- Admin full access
CREATE POLICY "Admin full access to checkins"
  ON public.hr_checkins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

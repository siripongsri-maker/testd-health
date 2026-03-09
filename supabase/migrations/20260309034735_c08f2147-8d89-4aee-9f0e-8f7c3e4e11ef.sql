
CREATE TABLE public.prevention_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  result_type text NOT NULL,
  avatar_type text,
  score integer,
  answers jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prevention_match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results"
  ON public.prevention_match_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own results"
  ON public.prevention_match_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all results"
  ON public.prevention_match_results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

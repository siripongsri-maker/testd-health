
CREATE TABLE public.hr_language_dictionary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_original TEXT NOT NULL,
  term_recommended TEXT NOT NULL,
  notes TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_language_dictionary ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the dictionary
CREATE POLICY "Anyone can read language dictionary"
  ON public.hr_language_dictionary
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify (using has_role function)
CREATE POLICY "Admins can manage language dictionary"
  ON public.hr_language_dictionary
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

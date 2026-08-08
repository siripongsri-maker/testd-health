CREATE TABLE public.seo_disavow_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_domain TEXT NOT NULL UNIQUE,
  example_url TEXT,
  anchor_sample TEXT,
  authority_score INTEGER,
  backlinks_count INTEGER,
  spam_signals TEXT[] NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_disavow_candidates TO authenticated;
GRANT ALL ON public.seo_disavow_candidates TO service_role;

ALTER TABLE public.seo_disavow_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disavow candidates"
ON public.seo_disavow_candidates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seo_disavow_candidates_updated_at
BEFORE UPDATE ON public.seo_disavow_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
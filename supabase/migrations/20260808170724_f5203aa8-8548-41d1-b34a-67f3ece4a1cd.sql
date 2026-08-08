CREATE TABLE public.seo_link_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  authority_score INTEGER,
  links_to TEXT,
  rationale TEXT,
  contact_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  notes TEXT,
  updated_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_link_prospects TO authenticated;
GRANT ALL ON public.seo_link_prospects TO service_role;

ALTER TABLE public.seo_link_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage link prospects"
ON public.seo_link_prospects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_link_prospects_updated_at
BEFORE UPDATE ON public.seo_link_prospects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- References master table
CREATE TABLE public.hr_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'guideline',
  year INTEGER,
  authors TEXT,
  publisher TEXT,
  language TEXT DEFAULT 'en',
  region TEXT,
  credibility_level TEXT NOT NULL DEFAULT 'global_guidance',
  citation_short TEXT NOT NULL,
  citation_full TEXT,
  access_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Page-reference link table
CREATE TABLE public.hr_page_reference_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  page_id UUID,
  reference_id UUID NOT NULL REFERENCES public.hr_references(id) ON DELETE CASCADE,
  section_key TEXT,
  citation_note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hr_references_org ON public.hr_references(organization);
CREATE INDEX idx_hr_references_active ON public.hr_references(is_active);
CREATE INDEX idx_hr_page_ref_links_page ON public.hr_page_reference_links(page_type, page_slug);
CREATE INDEX idx_hr_page_ref_links_ref ON public.hr_page_reference_links(reference_id);

-- RLS
ALTER TABLE public.hr_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_page_reference_links ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read hr_references" ON public.hr_references FOR SELECT USING (true);
CREATE POLICY "Public read hr_page_reference_links" ON public.hr_page_reference_links FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admin insert hr_references" ON public.hr_references FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update hr_references" ON public.hr_references FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete hr_references" ON public.hr_references FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert hr_page_reference_links" ON public.hr_page_reference_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update hr_page_reference_links" ON public.hr_page_reference_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete hr_page_reference_links" ON public.hr_page_reference_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

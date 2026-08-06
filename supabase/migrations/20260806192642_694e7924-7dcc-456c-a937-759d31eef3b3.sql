CREATE TABLE public.seo_jsonld_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('th','en')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','needs_fix')),
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  snapshot JSONB,
  notes TEXT,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, locale)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_jsonld_reviews TO authenticated;
GRANT ALL ON public.seo_jsonld_reviews TO service_role;

ALTER TABLE public.seo_jsonld_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_jsonld_reviews"
  ON public.seo_jsonld_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_jsonld_reviews_updated_at
  BEFORE UPDATE ON public.seo_jsonld_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
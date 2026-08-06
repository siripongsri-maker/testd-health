CREATE TABLE public.seo_article_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_index integer,
  slug text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'running',
  version integer NOT NULL DEFAULT 1,
  publish_status text,
  cover_generated boolean NOT NULL DEFAULT false,
  error_message text,
  duration_ms integer,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

CREATE INDEX seo_article_runs_created_idx ON public.seo_article_runs (created_at DESC);
CREATE INDEX seo_article_runs_slug_idx ON public.seo_article_runs (slug);

GRANT SELECT ON public.seo_article_runs TO authenticated;
GRANT ALL ON public.seo_article_runs TO service_role;

ALTER TABLE public.seo_article_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo article runs"
ON public.seo_article_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
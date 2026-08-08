CREATE TABLE public.seo_disavow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  domain_count integer NOT NULL DEFAULT 0,
  url_count integer NOT NULL DEFAULT 0,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_content text NOT NULL,
  file_name text NOT NULL,
  note text,
  submitted_to_google boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_disavow_runs TO authenticated;
GRANT ALL ON public.seo_disavow_runs TO service_role;

ALTER TABLE public.seo_disavow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disavow runs"
ON public.seo_disavow_runs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_seo_disavow_runs_generated_at ON public.seo_disavow_runs (generated_at DESC);

CREATE TRIGGER update_seo_disavow_runs_updated_at
BEFORE UPDATE ON public.seo_disavow_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
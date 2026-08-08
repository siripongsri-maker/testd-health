CREATE TABLE public.seo_backlink_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_on date NOT NULL UNIQUE,
  total_backlinks integer NOT NULL DEFAULT 0,
  referring_domains integer NOT NULL DEFAULT 0,
  authority_score integer,
  follow_links integer NOT NULL DEFAULT 0,
  nofollow_links integer NOT NULL DEFAULT 0,
  new_domains integer NOT NULL DEFAULT 0,
  lost_domains integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_backlink_snapshots TO authenticated;
GRANT ALL ON public.seo_backlink_snapshots TO service_role;
ALTER TABLE public.seo_backlink_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage backlink snapshots" ON public.seo_backlink_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seo_referring_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  authority_score integer,
  backlinks integer NOT NULL DEFAULT 1,
  first_seen date NOT NULL DEFAULT CURRENT_DATE,
  last_seen date NOT NULL DEFAULT CURRENT_DATE,
  lost_on date,
  status text NOT NULL DEFAULT 'active',
  is_follow boolean NOT NULL DEFAULT true,
  top_anchor text,
  topic text NOT NULL DEFAULT 'other',
  target_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_referring_domains TO authenticated;
GRANT ALL ON public.seo_referring_domains TO service_role;
ALTER TABLE public.seo_referring_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage referring domains" ON public.seo_referring_domains FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX seo_referring_domains_status_idx ON public.seo_referring_domains (status, last_seen DESC);
CREATE TRIGGER seo_referring_domains_updated_at BEFORE UPDATE ON public.seo_referring_domains
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
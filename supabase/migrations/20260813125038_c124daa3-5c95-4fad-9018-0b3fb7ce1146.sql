CREATE TABLE public.safe_space_qr_scans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  event_code text,
  source text,
  path text,
  visitor_key text,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_ssqs_session ON public.safe_space_qr_scans(session_id);
CREATE INDEX idx_ssqs_created ON public.safe_space_qr_scans(created_at);
GRANT INSERT ON public.safe_space_qr_scans TO anon, authenticated;
GRANT SELECT ON public.safe_space_qr_scans TO authenticated;
GRANT ALL ON public.safe_space_qr_scans TO service_role;
ALTER TABLE public.safe_space_qr_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log a qr scan" ON public.safe_space_qr_scans FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff can read qr scans" ON public.safe_space_qr_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'me_analyst') OR public.has_role(auth.uid(),'outreach_staff') OR public.has_role(auth.uid(),'counselor'));
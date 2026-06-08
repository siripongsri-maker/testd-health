-- Targets registry
CREATE TABLE public.route_health_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  expected_substring TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_status_code INT,
  last_ok BOOLEAN,
  last_error TEXT,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_health_targets TO authenticated;
GRANT ALL ON public.route_health_targets TO service_role;

ALTER TABLE public.route_health_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage route health targets"
  ON public.route_health_targets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- History
CREATE TABLE public.route_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code INT,
  ok BOOLEAN NOT NULL,
  error TEXT,
  duration_ms INT,
  content_length INT
);

CREATE INDEX idx_route_health_checks_path_time ON public.route_health_checks (path, checked_at DESC);
CREATE INDEX idx_route_health_checks_time ON public.route_health_checks (checked_at DESC);

GRANT SELECT ON public.route_health_checks TO authenticated;
GRANT ALL ON public.route_health_checks TO service_role;

ALTER TABLE public.route_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read route health checks"
  ON public.route_health_checks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_route_health_targets_updated
  BEFORE UPDATE ON public.route_health_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed critical routes
INSERT INTO public.route_health_targets (path, label) VALUES
  ('/', 'Home'),
  ('/submit-result', 'HIV-ST Submit (short)'),
  ('/submit-hiv-result', 'HIV-ST Submit (long)'),
  ('/hiv-selftest', 'HIV Self-test Hub'),
  ('/clinic', 'SWING Clinic'),
  ('/clinic/book', 'Clinic Booking'),
  ('/my-appointments', 'My Appointments'),
  ('/guest-appointments', 'Guest Appointments'),
  ('/booking', 'Booking'),
  ('/th', 'TH locale root'),
  ('/en', 'EN locale root')
ON CONFLICT (path) DO NOTHING;

-- Enable pg_cron + pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
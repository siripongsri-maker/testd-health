
-- Add deploy detection table for post-deploy smoke tests
CREATE TABLE IF NOT EXISTS public.route_health_deploys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  build_fingerprint TEXT NOT NULL,
  base_url TEXT NOT NULL,
  smoke_status TEXT NOT NULL DEFAULT 'pending', -- pending | pass | fail | error
  checked_count INT NOT NULL DEFAULT 0,
  failing_count INT NOT NULL DEFAULT 0,
  failing_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INT,
  notes TEXT
);

GRANT SELECT ON public.route_health_deploys TO authenticated;
GRANT ALL ON public.route_health_deploys TO service_role;

ALTER TABLE public.route_health_deploys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deploys"
  ON public.route_health_deploys FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_route_health_deploys_detected_at
  ON public.route_health_deploys (detected_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_route_health_deploys_fingerprint
  ON public.route_health_deploys (build_fingerprint);

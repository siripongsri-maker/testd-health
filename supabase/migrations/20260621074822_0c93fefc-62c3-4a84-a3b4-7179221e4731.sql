
CREATE TABLE IF NOT EXISTS public.cache_reset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text,
  user_id uuid,
  from_version text,
  to_version text,
  trigger text NOT NULL,
  stage text NOT NULL,
  success boolean,
  duration_ms integer,
  attempt integer DEFAULT 1,
  error text,
  user_agent text,
  hostname text,
  path text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cache_reset_events TO anon, authenticated;
GRANT ALL ON public.cache_reset_events TO service_role;

ALTER TABLE public.cache_reset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log their own cache reset events"
ON public.cache_reset_events
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

CREATE POLICY "Admins and analysts can read cache reset events"
ON public.cache_reset_events
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_cache_reset_events_created_at
  ON public.cache_reset_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_reset_events_to_version
  ON public.cache_reset_events (to_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_reset_events_trigger_stage
  ON public.cache_reset_events (trigger, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_reset_events_anon
  ON public.cache_reset_events (anonymous_id, created_at DESC);

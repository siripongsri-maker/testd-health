-- 1) Add UIC/tracking columns to client_feedback_responses
ALTER TABLE public.client_feedback_responses
  ADD COLUMN IF NOT EXISTS uic_hnid TEXT,
  ADD COLUMN IF NOT EXISTS client_seed_id TEXT,
  ADD COLUMN IF NOT EXISTS visit_count_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assessment_count_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_repeat_assessment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_assessment_at TIMESTAMPTZ;

ALTER TABLE public.client_feedback_responses
  DROP CONSTRAINT IF EXISTS chk_uic_hnid_format;
ALTER TABLE public.client_feedback_responses
  ADD CONSTRAINT chk_uic_hnid_format
  CHECK (uic_hnid IS NULL OR uic_hnid ~ '^[0-9]{13}$');

CREATE INDEX IF NOT EXISTS idx_cfr_uic_hnid ON public.client_feedback_responses(uic_hnid) WHERE uic_hnid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cfr_seed ON public.client_feedback_responses(client_seed_id) WHERE client_seed_id IS NOT NULL;

-- 2) New table: client_seed_visits (first-party tracking)
CREATE TABLE IF NOT EXISTS public.client_seed_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_seed_id TEXT NOT NULL,
  uic_hnid TEXT,
  event_type TEXT NOT NULL,
  page_path TEXT,
  channel TEXT,
  branch_id UUID,
  language TEXT,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_csv_uic_format CHECK (uic_hnid IS NULL OR uic_hnid ~ '^[0-9]{13}$')
);

CREATE INDEX IF NOT EXISTS idx_csv_seed ON public.client_seed_visits(client_seed_id);
CREATE INDEX IF NOT EXISTS idx_csv_uic ON public.client_seed_visits(uic_hnid) WHERE uic_hnid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csv_created ON public.client_seed_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csv_event ON public.client_seed_visits(event_type);

ALTER TABLE public.client_seed_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert visit events" ON public.client_seed_visits;
CREATE POLICY "Anyone can insert visit events"
  ON public.client_seed_visits FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view visit events" ON public.client_seed_visits;
CREATE POLICY "Staff can view visit events"
  ON public.client_seed_visits FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'moderator'::public.app_role) OR
    public.has_role(auth.uid(), 'me_analyst'::public.app_role) OR
    public.has_role(auth.uid(), 'outreach_staff'::public.app_role)
  );

-- 3) View: per-UIC assessment summary
CREATE OR REPLACE VIEW public.v_uic_assessment_summary AS
SELECT
  uic_hnid,
  COUNT(*)::int AS assessment_count,
  MIN(service_date) AS first_assessment_date,
  MAX(service_date) AS last_assessment_date,
  MIN(submitted_at) AS first_submitted_at,
  MAX(submitted_at) AS last_submitted_at,
  ARRAY_AGG(DISTINCT channel) AS channels,
  ARRAY_AGG(DISTINCT branch_id) FILTER (WHERE branch_id IS NOT NULL) AS branches,
  AVG(satisfaction_score)::numeric(5,2) AS avg_satisfaction,
  AVG(counselling_quality_percent)::numeric(5,2) AS avg_quality_pct
FROM public.client_feedback_responses
WHERE uic_hnid IS NOT NULL AND status = 'submitted'
GROUP BY uic_hnid;

-- 4) Function: get prior visit and assessment counts
CREATE OR REPLACE FUNCTION public.get_uic_visit_stats(
  _uic TEXT,
  _seed TEXT
)
RETURNS TABLE (
  visit_count INTEGER,
  assessment_count INTEGER,
  last_assessment_at TIMESTAMPTZ,
  is_repeat BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visits INT := 0;
  v_assessments INT := 0;
  v_last TIMESTAMPTZ;
BEGIN
  IF _uic IS NOT NULL THEN
    SELECT COUNT(*) INTO v_visits
    FROM public.client_seed_visits
    WHERE uic_hnid = _uic;
  ELSIF _seed IS NOT NULL THEN
    SELECT COUNT(*) INTO v_visits
    FROM public.client_seed_visits
    WHERE client_seed_id = _seed;
  END IF;

  IF _uic IS NOT NULL THEN
    SELECT COUNT(*), MAX(submitted_at) INTO v_assessments, v_last
    FROM public.client_feedback_responses
    WHERE uic_hnid = _uic AND status = 'submitted';
  END IF;

  RETURN QUERY SELECT
    v_visits,
    v_assessments,
    v_last,
    (v_assessments > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_uic_visit_stats(TEXT, TEXT) TO anon, authenticated;
GRANT SELECT ON public.v_uic_assessment_summary TO authenticated;
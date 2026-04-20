-- Drop dependent objects first
DROP VIEW IF EXISTS public.v_uic_assessment_summary CASCADE;
DROP FUNCTION IF EXISTS public.get_uic_visit_stats(text, text) CASCADE;

-- Clear old 13-digit data (incompatible format)
UPDATE public.client_feedback_responses SET uic_hnid = NULL WHERE uic_hnid IS NOT NULL;
UPDATE public.client_seed_visits SET uic_hnid = NULL WHERE uic_hnid IS NOT NULL;

-- Rename columns
ALTER TABLE public.client_feedback_responses RENAME COLUMN uic_hnid TO uic;
ALTER TABLE public.client_seed_visits RENAME COLUMN uic_hnid TO uic;

-- Indexes (drop old, create new)
DROP INDEX IF EXISTS idx_client_feedback_uic_hnid;
DROP INDEX IF EXISTS idx_client_seed_visits_uic_hnid;
CREATE INDEX IF NOT EXISTS idx_client_feedback_uic ON public.client_feedback_responses(uic) WHERE uic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_seed_visits_uic ON public.client_seed_visits(uic) WHERE uic IS NOT NULL;

-- Recreate aggregate view
CREATE OR REPLACE VIEW public.v_uic_assessment_summary AS
SELECT
  uic,
  COUNT(*)::int AS assessment_count,
  MAX(submitted_at) AS last_submitted_at,
  MAX(service_date) AS last_assessment_date
FROM public.client_feedback_responses
WHERE uic IS NOT NULL AND status = 'submitted'
GROUP BY uic;

-- Recreate stats RPC: matches by UIC (primary) OR client_seed_id (fallback)
CREATE OR REPLACE FUNCTION public.get_uic_visit_stats(_uic text, _seed text)
RETURNS TABLE (
  visit_count int,
  assessment_count int,
  last_assessment_at timestamptz,
  is_repeat boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v_count int := 0;
  _a_count int := 0;
  _last timestamptz := NULL;
BEGIN
  IF _uic IS NOT NULL AND length(_uic) > 0 THEN
    SELECT COUNT(*)::int INTO _v_count
      FROM client_seed_visits WHERE uic = _uic;
    SELECT COUNT(*)::int, MAX(submitted_at) INTO _a_count, _last
      FROM client_feedback_responses
      WHERE uic = _uic AND status = 'submitted';
  ELSIF _seed IS NOT NULL AND length(_seed) > 0 THEN
    SELECT COUNT(*)::int INTO _v_count
      FROM client_seed_visits WHERE client_seed_id = _seed;
    SELECT COUNT(*)::int, MAX(submitted_at) INTO _a_count, _last
      FROM client_feedback_responses
      WHERE client_seed_id = _seed AND status = 'submitted';
  END IF;

  RETURN QUERY SELECT
    _v_count,
    _a_count,
    _last,
    (_a_count > 0 OR _v_count > 0) AS is_repeat;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_uic_visit_stats(text, text) TO anon, authenticated;

ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS last_postponed_at timestamptz,
  ADD COLUMN IF NOT EXISTS postpone_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reactive_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactive_notified_to text;

CREATE INDEX IF NOT EXISTS idx_selftest_postponed
  ON public.hiv_selftest_requests(last_postponed_at)
  WHERE last_postponed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selftest_reactive_pending
  ON public.hiv_selftest_requests(self_reported_result, care_action)
  WHERE self_reported_result = 'reactive';

CREATE OR REPLACE FUNCTION public.increment_postpone(req_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hiv_selftest_requests
  SET
    last_postponed_at = now(),
    postpone_count = COALESCE(postpone_count, 0) + 1
  WHERE id = req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_postpone(uuid) TO authenticated, anon;

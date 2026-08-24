CREATE INDEX IF NOT EXISTS idx_hiv_selftest_requests_created_at
  ON public.hiv_selftest_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hiv_selftest_requests_user_created
  ON public.hiv_selftest_requests (user_id, created_at DESC);
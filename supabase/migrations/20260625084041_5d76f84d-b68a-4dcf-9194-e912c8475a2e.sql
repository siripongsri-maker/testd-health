
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS contact_attempt_1_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_attempt_2_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_attempt_3_at timestamptz;

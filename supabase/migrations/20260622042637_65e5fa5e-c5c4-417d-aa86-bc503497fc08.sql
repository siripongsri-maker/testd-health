ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pickup_branch TEXT,
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS risk_level TEXT,
  ADD COLUMN IF NOT EXISTS prior_test TEXT;
NOTIFY pgrst, 'reload schema';
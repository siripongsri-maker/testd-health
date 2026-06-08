
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS legacy_result_id text,
  ADD COLUMN IF NOT EXISTS legacy_source text,
  ADD COLUMN IF NOT EXISTS legacy_raw_result text,
  ADD COLUMN IF NOT EXISTS legacy_hospital_confirmed text,
  ADD COLUMN IF NOT EXISTS legacy_hospital_name text,
  ADD COLUMN IF NOT EXISTS legacy_treatment_status text,
  ADD COLUMN IF NOT EXISTS legacy_art_status text,
  ADD COLUMN IF NOT EXISTS legacy_pdpa_consent boolean,
  ADD COLUMN IF NOT EXISTS national_id_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_selftest_legacy_result_id
  ON public.hiv_selftest_requests (legacy_result_id)
  WHERE legacy_result_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selftest_national_id_hash
  ON public.hiv_selftest_requests (national_id_hash)
  WHERE national_id_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selftest_legacy_source
  ON public.hiv_selftest_requests (legacy_source)
  WHERE legacy_source IS NOT NULL;

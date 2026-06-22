ALTER TABLE public.selftest_pii ADD COLUMN IF NOT EXISTS national_id TEXT;
NOTIFY pgrst, 'reload schema';
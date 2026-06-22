ALTER TABLE public.selftest_pii ADD COLUMN IF NOT EXISTS email TEXT;
NOTIFY pgrst, 'reload schema';
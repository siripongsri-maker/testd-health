-- Add date_of_birth column to selftest_pii table
ALTER TABLE public.selftest_pii
ADD COLUMN date_of_birth DATE NULL;
-- Add gender column to selftest_pii table for NHSO compliance
ALTER TABLE public.selftest_pii 
ADD COLUMN IF NOT EXISTS gender text;

-- Add comment explaining the field
COMMENT ON COLUMN public.selftest_pii.gender IS 'Gender for NHSO eligibility reporting';
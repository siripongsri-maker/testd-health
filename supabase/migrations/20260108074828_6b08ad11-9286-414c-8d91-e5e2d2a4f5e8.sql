-- Add subdistrict and district columns to selftest_pii table
ALTER TABLE public.selftest_pii 
ADD COLUMN subdistrict text,
ADD COLUMN district text;
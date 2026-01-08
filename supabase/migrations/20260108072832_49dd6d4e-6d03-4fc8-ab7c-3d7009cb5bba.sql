-- Add Thai ID column to hiv_selftest_requests table
ALTER TABLE public.hiv_selftest_requests 
ADD COLUMN thai_id text;
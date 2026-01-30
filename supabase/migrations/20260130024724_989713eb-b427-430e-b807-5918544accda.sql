-- Add callback consent columns to hiv_selftest_requests
ALTER TABLE public.hiv_selftest_requests 
ADD COLUMN IF NOT EXISTS wants_callback boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS callback_phone text;

ALTER TABLE public.prevention_match_results 
ADD COLUMN IF NOT EXISTS compatible_type text,
ADD COLUMN IF NOT EXISTS dating_behavior text,
ADD COLUMN IF NOT EXISTS partner_preference text,
ADD COLUMN IF NOT EXISTS photo_url text;

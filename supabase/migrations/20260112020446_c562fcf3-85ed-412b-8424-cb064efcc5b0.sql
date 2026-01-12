-- Fix survey_views overly permissive RLS policies
-- The increment_survey_view() function is SECURITY DEFINER and handles all writes
-- So we can remove direct INSERT/UPDATE access

-- Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert survey views" ON public.survey_views;

-- Drop the permissive UPDATE policy  
DROP POLICY IF EXISTS "Anyone can update survey views" ON public.survey_views;

-- Keep the SELECT policy for read access (this is fine for public analytics)
-- "Anyone can view survey views" remains intact
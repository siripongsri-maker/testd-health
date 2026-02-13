
-- Fix 1: Remove overly permissive public SELECT on profiles table
-- The leaderboard_profiles view already provides safe public access
DROP POLICY IF EXISTS "Anyone can view leaderboard profiles" ON public.profiles;

-- Fix 2: Split health_profiles ALL policy into specific policies (no DELETE)
DROP POLICY IF EXISTS "Users can manage their own health profile" ON public.health_profiles;

CREATE POLICY "Users can view their own health profile"
ON public.health_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health profile"
ON public.health_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health profile"
ON public.health_profiles FOR UPDATE
USING (auth.uid() = user_id);

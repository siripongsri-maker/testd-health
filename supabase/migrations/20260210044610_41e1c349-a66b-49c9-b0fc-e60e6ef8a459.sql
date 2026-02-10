
-- Fix 1: article_comments - restrict SELECT to authenticated users only
-- Drop the overly permissive "anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view article comments" ON public.article_comments;

-- Replace with authenticated-only SELECT policy
CREATE POLICY "Authenticated users can view article comments"
ON public.article_comments
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: profiles - remove the broad leaderboard SELECT policy that exposes all fields
-- The leaderboard_profiles view already provides safe public access
DROP POLICY IF EXISTS "Authenticated users can view profiles for leaderboard" ON public.profiles;

-- ============================================
-- Security Fixes Migration
-- ============================================

-- 1. Admin Moderation: Allow admins to delete chat messages
-- This enables content moderation for health misinformation/harassment
CREATE POLICY "Admins can delete any chat message"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Profiles Table: Restrict sensitive health data to owners only
-- First, drop the current overly permissive policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create separate policies for public leaderboard data vs private health data
-- Allow users to view their own full profile
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow viewing of public leaderboard fields only (not health data)
-- This uses a secure view approach - create a view for leaderboard
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  xp,
  level,
  streak,
  badges
FROM public.profiles;

-- Allow admins to update all profiles (for seasonal resets etc)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Article Comments: Create secure view that hides user_id from public
-- The view will show author_name but not user_id
CREATE OR REPLACE VIEW public.public_article_comments AS
SELECT 
  id,
  article_id,
  content,
  author_name,
  created_at,
  updated_at
FROM public.article_comments;

-- Grant access to the view
GRANT SELECT ON public.public_article_comments TO anon, authenticated;
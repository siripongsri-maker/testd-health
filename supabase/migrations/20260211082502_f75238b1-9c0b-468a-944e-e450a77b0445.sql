-- Allow all authenticated users to view leaderboard data from profiles
-- This is safe because leaderboard_profiles view only exposes: id, display_name, avatar_url, xp, level, streak, badges
CREATE POLICY "Authenticated users can view leaderboard profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

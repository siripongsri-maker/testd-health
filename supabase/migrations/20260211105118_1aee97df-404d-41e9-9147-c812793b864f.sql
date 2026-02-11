-- Allow anyone (including anonymous/unauthenticated) to view leaderboard profiles
-- The view only exposes: id, display_name, avatar_url, xp, level, streak, badges
CREATE POLICY "Anyone can view leaderboard profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

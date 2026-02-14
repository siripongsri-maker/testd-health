-- Allow anonymous users to read profiles for leaderboard display
-- The leaderboard_profiles view already restricts visible columns to safe data only
CREATE POLICY "Anyone can view profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (true);
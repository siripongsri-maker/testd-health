-- Add policy to allow viewing leaderboard data (public display_name, xp, level, avatar_url only)
CREATE POLICY "Anyone can view leaderboard profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Note: This policy allows reading the profiles table for leaderboard purposes
-- Only non-sensitive fields (display_name, xp, level, avatar_url) should be selected in queries
-- Create table to store full leaderboard snapshots before each season reset
CREATE TABLE public.leaderboard_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_key TEXT NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can view their own snapshot history
CREATE POLICY "Users can view their own snapshots" 
ON public.leaderboard_snapshots 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all snapshots
CREATE POLICY "Admins can view all snapshots" 
ON public.leaderboard_snapshots 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage snapshots
CREATE POLICY "Admins can manage snapshots" 
ON public.leaderboard_snapshots 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for efficient queries
CREATE INDEX idx_leaderboard_snapshots_season ON public.leaderboard_snapshots(season_key);
CREATE INDEX idx_leaderboard_snapshots_user ON public.leaderboard_snapshots(user_id);
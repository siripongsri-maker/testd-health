-- Create hall_of_fame table to store season winners
CREATE TABLE public.hall_of_fame (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_key TEXT NOT NULL UNIQUE,
  season_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Top Health Score',
  user_id UUID NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Anyone can view hall of fame
CREATE POLICY "Anyone can view hall of fame" 
ON public.hall_of_fame 
FOR SELECT 
USING (true);

-- Only admins can manage hall of fame
CREATE POLICY "Admins can manage hall of fame" 
ON public.hall_of_fame 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
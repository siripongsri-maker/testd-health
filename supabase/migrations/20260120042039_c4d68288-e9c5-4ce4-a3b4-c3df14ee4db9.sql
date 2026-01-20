-- Drop existing survey_views table and create comprehensive surveys table
DROP TABLE IF EXISTS survey_views;

-- Create surveys table with all fields
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  url TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  is_hot BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Everyone can view active surveys
CREATE POLICY "Anyone can view active surveys"
ON public.surveys
FOR SELECT
USING (is_active = true);

-- Admins can manage surveys
CREATE POLICY "Admins can insert surveys"
ON public.surveys
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update surveys"
ON public.surveys
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete surveys"
ON public.surveys
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create survey_completions table to track who completed what
CREATE TABLE public.survey_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.survey_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
ON public.survey_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can insert completions (for anonymous tracking too)
CREATE POLICY "Anyone can insert completions"
ON public.survey_completions
FOR INSERT
WITH CHECK (true);

-- Function to increment survey view and track completion
CREATE OR REPLACE FUNCTION public.complete_survey(
  p_survey_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_reward INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get XP reward
  SELECT xp_reward INTO v_xp_reward FROM surveys WHERE id = p_survey_id;
  
  IF v_xp_reward IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Increment view and completion count
  UPDATE surveys 
  SET view_count = view_count + 1,
      completion_count = completion_count + 1,
      updated_at = now()
  WHERE id = p_survey_id;
  
  -- Record completion
  INSERT INTO survey_completions (survey_id, user_id, session_id, xp_awarded)
  VALUES (p_survey_id, v_user_id, p_session_id, v_xp_reward);
  
  -- Award XP to user if logged in
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles 
    SET xp = COALESCE(xp, 0) + v_xp_reward,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_xp_reward;
END;
$$;

-- Insert the existing survey as seed data
INSERT INTO public.surveys (title_th, title_en, description_th, description_en, url, xp_reward, is_hot, is_new)
VALUES (
  'แบบสอบถาม testD Health',
  'testD Health Survey',
  'แบบประเมินสุขภาพและความเสี่ยง',
  'Health and risk assessment survey',
  'https://www.testd-health.com/survey/',
  15,
  true,
  true
);

-- Create index for performance
CREATE INDEX idx_surveys_active ON public.surveys(is_active);
CREATE INDEX idx_survey_completions_survey ON public.survey_completions(survey_id);
CREATE INDEX idx_survey_completions_user ON public.survey_completions(user_id);
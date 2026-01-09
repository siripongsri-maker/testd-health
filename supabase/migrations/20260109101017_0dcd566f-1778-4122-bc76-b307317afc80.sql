-- Create table to track survey views
CREATE TABLE public.survey_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id text NOT NULL UNIQUE,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.survey_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view survey stats
CREATE POLICY "Anyone can view survey views" 
ON public.survey_views 
FOR SELECT 
USING (true);

-- Anyone can insert new survey views (will be upserted)
CREATE POLICY "Anyone can insert survey views" 
ON public.survey_views 
FOR INSERT 
WITH CHECK (true);

-- Anyone can update survey views (increment count)
CREATE POLICY "Anyone can update survey views" 
ON public.survey_views 
FOR UPDATE 
USING (true);

-- Create function to increment survey view count
CREATE OR REPLACE FUNCTION public.increment_survey_view(p_survey_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO survey_views (survey_id, view_count)
  VALUES (p_survey_id, 1)
  ON CONFLICT (survey_id) 
  DO UPDATE SET 
    view_count = survey_views.view_count + 1,
    updated_at = now()
  RETURNING view_count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_survey_views_updated_at
BEFORE UPDATE ON public.survey_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial record for the testD survey
INSERT INTO public.survey_views (survey_id, view_count) 
VALUES ('testd-health-survey', 0);
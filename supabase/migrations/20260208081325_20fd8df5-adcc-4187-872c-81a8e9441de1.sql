-- Fix overly permissive RLS policies for survey_responses
DROP POLICY IF EXISTS "Anyone can create responses" ON public.survey_responses;
CREATE POLICY "Authenticated or anonymous can create responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated and setting their user_id
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    -- Allow anonymous responses with session_id
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Fix overly permissive RLS policies for survey_answers  
DROP POLICY IF EXISTS "Anyone can create answers" ON public.survey_answers;
CREATE POLICY "Users can create answers for their responses"
  ON public.survey_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = response_id 
      AND (
        (sr.user_id = auth.uid()) OR 
        (sr.user_id IS NULL AND sr.session_id IS NOT NULL)
      )
    )
  );
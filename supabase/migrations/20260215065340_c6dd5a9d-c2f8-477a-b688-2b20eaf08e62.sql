
-- Fix 1: survey_responses - restrict anonymous response visibility
DROP POLICY IF EXISTS "Users can view their own responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON public.survey_responses;

-- Users can only view their own authenticated responses
CREATE POLICY "Users can view their own responses"
  ON public.survey_responses FOR SELECT
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Users can only update their own authenticated responses
CREATE POLICY "Users can update their own responses"
  ON public.survey_responses FOR UPDATE
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- Fix 2: survey_answers - restrict anonymous answer visibility  
DROP POLICY IF EXISTS "Users can view their own answers" ON public.survey_answers;

CREATE POLICY "Users can view their own answers"
  ON public.survey_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_answers.response_id 
      AND sr.user_id IS NOT NULL 
      AND sr.user_id = auth.uid()
    )
  );

-- Fix 3: survey_answers INSERT - also tighten to prevent anonymous abuse
DROP POLICY IF EXISTS "Users can create answers for their responses" ON public.survey_answers;

CREATE POLICY "Users can create answers for their responses"
  ON public.survey_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_answers.response_id 
      AND (
        (sr.user_id IS NOT NULL AND sr.user_id = auth.uid()) 
        OR (sr.user_id IS NULL AND sr.session_id IS NOT NULL)
      )
    )
  );

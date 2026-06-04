
DROP POLICY IF EXISTS "Authenticated or anonymous can create responses" ON public.survey_responses;
CREATE POLICY "Anyone can create survey responses"
  ON public.survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create answers for their responses" ON public.survey_answers;
CREATE POLICY "Anyone can create survey answers"
  ON public.survey_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_answers.response_id
        AND (
          (auth.uid() IS NULL AND sr.user_id IS NULL)
          OR (auth.uid() IS NOT NULL AND (sr.user_id IS NULL OR sr.user_id = auth.uid()))
        )
    )
  );

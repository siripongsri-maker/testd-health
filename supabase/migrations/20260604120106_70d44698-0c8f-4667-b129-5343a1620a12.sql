
CREATE POLICY "Anyone can complete anonymous responses"
  ON public.survey_responses
  FOR UPDATE
  TO anon, authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);


CREATE OR REPLACE FUNCTION public.is_anonymous_survey_response(p_response_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_responses
    WHERE id = p_response_id AND user_id IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_anonymous_survey_response(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can create survey answers" ON public.survey_answers;
CREATE POLICY "Anyone can create survey answers"
  ON public.survey_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_anonymous_survey_response(response_id)
    OR EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_answers.response_id
        AND sr.user_id IS NOT NULL
        AND sr.user_id = auth.uid()
    )
  );

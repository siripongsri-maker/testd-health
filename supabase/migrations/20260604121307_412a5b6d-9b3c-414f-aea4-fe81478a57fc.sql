CREATE OR REPLACE FUNCTION public.export_pre_post_full()
RETURNS TABLE (
  response_id uuid,
  attempt text,
  respondent_name text,
  completed_at timestamptz,
  question_order int,
  question_text_th text,
  question_text_en text,
  question_type text,
  answer_text text,
  answer_options_text text,
  answer_rating int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey_id uuid := '6e5918db-d70a-4d7d-b978-e6711f2a4779';
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'me_analyst')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH attempt_map AS (
    SELECT sa.response_id,
           CASE
             WHEN (sa.answer_options::jsonb) ? 'pre' THEN 'pre'
             WHEN (sa.answer_options::jsonb) ? 'post' THEN 'post'
             ELSE NULL
           END AS attempt
    FROM survey_answers sa
    JOIN survey_questions sq ON sq.id = sa.question_id
    WHERE sq.survey_id = v_survey_id AND sq.display_order = 1
  ),
  name_map AS (
    SELECT sa.response_id, sa.answer_text AS respondent_name
    FROM survey_answers sa
    JOIN survey_questions sq ON sq.id = sa.question_id
    WHERE sq.survey_id = v_survey_id AND sq.display_order = 2
  )
  SELECT
    sr.id AS response_id,
    am.attempt,
    nm.respondent_name,
    sr.completed_at,
    sq.display_order AS question_order,
    sq.question_text_th,
    sq.question_text_en,
    sq.question_type,
    sa.answer_text,
    (
      SELECT string_agg(
        COALESCE(opt->>'text_th', opt->>'text_en', opt->>'id'),
        ' | '
      )
      FROM jsonb_array_elements(sq.options::jsonb) opt
      WHERE (sa.answer_options::jsonb) ? (opt->>'id')
    ) AS answer_options_text,
    sa.answer_rating
  FROM survey_responses sr
  LEFT JOIN attempt_map am ON am.response_id = sr.id
  LEFT JOIN name_map nm ON nm.response_id = sr.id
  JOIN survey_answers sa ON sa.response_id = sr.id
  JOIN survey_questions sq ON sq.id = sa.question_id
  WHERE sr.survey_id = v_survey_id
  ORDER BY sr.completed_at NULLS LAST, sr.id, sq.display_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_pre_post_full() TO authenticated;
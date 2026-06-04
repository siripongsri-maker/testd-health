
CREATE OR REPLACE FUNCTION public.get_pre_post_score(p_name text)
RETURNS TABLE (
  pre_score int,
  pre_total int,
  pre_completed_at timestamptz,
  post_score int,
  post_total int,
  post_completed_at timestamptz,
  matched_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pre_id uuid := '6e5918db-d70a-4d7d-b978-e6711f2a4779';
  post_id uuid := '4a5e39ad-0b89-487b-9ff3-2b97a393cf38';
  norm_name text := lower(btrim(coalesce(p_name, '')));
BEGIN
  IF length(norm_name) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH responses AS (
    SELECT
      sr.id,
      sr.survey_id,
      sr.completed_at,
      lower(btrim(sa_name.answer_text)) AS norm_name,
      sa_name.answer_text AS raw_name
    FROM survey_responses sr
    JOIN survey_questions sq_name
      ON sq_name.survey_id = sr.survey_id AND sq_name.display_order = 1
    JOIN survey_answers sa_name
      ON sa_name.response_id = sr.id AND sa_name.question_id = sq_name.id
    WHERE sr.survey_id IN (pre_id, post_id)
      AND sr.completed_at IS NOT NULL
      AND lower(btrim(sa_name.answer_text)) = norm_name
  ),
  latest AS (
    SELECT DISTINCT ON (survey_id)
      survey_id, id, completed_at, raw_name
    FROM responses
    ORDER BY survey_id, completed_at DESC
  ),
  scored AS (
    SELECT
      l.survey_id,
      l.completed_at,
      l.raw_name,
      COUNT(*) FILTER (
        WHERE sq.display_order >= 2
          AND (sa.answer_options::jsonb) @> '["b"]'::jsonb
      )::int AS score,
      COUNT(*) FILTER (WHERE sq.display_order >= 2)::int AS total
    FROM latest l
    JOIN survey_questions sq ON sq.survey_id = l.survey_id
    LEFT JOIN survey_answers sa
      ON sa.response_id = l.id AND sa.question_id = sq.id
    GROUP BY l.survey_id, l.completed_at, l.raw_name
  )
  SELECT
    MAX(CASE WHEN survey_id = pre_id THEN score END)::int,
    MAX(CASE WHEN survey_id = pre_id THEN total END)::int,
    MAX(CASE WHEN survey_id = pre_id THEN completed_at END),
    MAX(CASE WHEN survey_id = post_id THEN score END)::int,
    MAX(CASE WHEN survey_id = post_id THEN total END)::int,
    MAX(CASE WHEN survey_id = post_id THEN completed_at END),
    COALESCE(
      MAX(CASE WHEN survey_id = pre_id THEN raw_name END),
      MAX(CASE WHEN survey_id = post_id THEN raw_name END)
    )
  FROM scored
  HAVING COUNT(*) > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_post_score(text) TO anon, authenticated;

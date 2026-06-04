
CREATE OR REPLACE FUNCTION public.export_pre_post_results()
RETURNS TABLE (
  matched_name text,
  pre_score int,
  pre_total int,
  pre_completed_at timestamptz,
  post_score int,
  post_total int,
  post_completed_at timestamptz,
  score_delta int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey uuid := '6e5918db-d70a-4d7d-b978-e6711f2a4779';
  v_name_q uuid;
  v_phase_q uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'me_analyst')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_phase_q FROM survey_questions
    WHERE survey_id = v_survey AND display_order = 1 LIMIT 1;
  SELECT id INTO v_name_q FROM survey_questions
    WHERE survey_id = v_survey AND display_order = 2 LIMIT 1;

  RETURN QUERY
  WITH base AS (
    SELECT
      r.id AS response_id,
      r.completed_at,
      lower(trim(BOTH FROM (
        SELECT (a.answer_text)
        FROM survey_answers a
        WHERE a.response_id = r.id AND a.question_id = v_name_q
        LIMIT 1
      ))) AS norm_name,
      (
        SELECT (a.answer_options::jsonb) ->> 0
        FROM survey_answers a
        WHERE a.response_id = r.id AND a.question_id = v_phase_q
        LIMIT 1
      ) AS phase,
      (
        SELECT count(*)::int
        FROM survey_answers a
        JOIN survey_questions q ON q.id = a.question_id
        WHERE a.response_id = r.id
          AND q.survey_id = v_survey
          AND q.display_order > 2
          AND a.answer_options::jsonb @> '["b"]'::jsonb
      ) AS score,
      (
        SELECT count(*)::int
        FROM survey_questions q
        WHERE q.survey_id = v_survey AND q.display_order > 2
      ) AS total
    FROM survey_responses r
    WHERE r.survey_id = v_survey AND r.completed_at IS NOT NULL
  ),
  named AS (
    SELECT * FROM base WHERE norm_name IS NOT NULL AND norm_name <> ''
  ),
  pre AS (
    SELECT DISTINCT ON (norm_name) norm_name, score, total, completed_at
    FROM named WHERE phase = 'pre' ORDER BY norm_name, completed_at ASC
  ),
  post AS (
    SELECT DISTINCT ON (norm_name) norm_name, score, total, completed_at
    FROM named WHERE phase = 'post' ORDER BY norm_name, completed_at DESC
  )
  SELECT
    COALESCE(pre.norm_name, post.norm_name) AS matched_name,
    pre.score AS pre_score,
    pre.total AS pre_total,
    pre.completed_at AS pre_completed_at,
    post.score AS post_score,
    post.total AS post_total,
    post.completed_at AS post_completed_at,
    CASE WHEN pre.score IS NOT NULL AND post.score IS NOT NULL
         THEN post.score - pre.score ELSE NULL END AS score_delta
  FROM pre
  FULL OUTER JOIN post USING (norm_name)
  ORDER BY matched_name;
END;
$$;

REVOKE ALL ON FUNCTION public.export_pre_post_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_pre_post_results() TO authenticated;

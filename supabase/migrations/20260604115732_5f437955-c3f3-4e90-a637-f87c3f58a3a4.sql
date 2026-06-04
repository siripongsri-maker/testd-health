
-- 1) GRANTS so anonymous + authenticated visitors can read surveys and submit responses/answers
GRANT SELECT ON public.surveys TO anon, authenticated;
GRANT SELECT ON public.survey_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.survey_responses TO anon, authenticated;
GRANT SELECT, INSERT ON public.survey_answers TO anon, authenticated;
GRANT ALL ON public.surveys, public.survey_questions, public.survey_responses, public.survey_answers TO service_role;

-- 2) Consolidate to single survey. Keep the existing Pre-test row as the canonical one.
UPDATE public.surveys
SET title_th    = 'แบบทดสอบ ยกเลิก พ.ร.บ.ค้าประเวณี 2539',
    title_en    = 'Quiz — Repeal of the 1996 Prevention and Suppression of Prostitution Act',
    description_th = 'โดยมูลนิธิเพื่อนพนักงานบริการ (SWING) — เลือกว่าเป็นแบบทดสอบ "ก่อน" หรือ "หลัง" จากนั้นกรอกชื่อเดียวกันทั้งสองครั้งเพื่อจับคู่ผลลัพธ์',
    description_en = 'By SWING Foundation. Choose whether this is your Pre or Post attempt, then enter the same name in both attempts so the results can be paired.'
WHERE id = '6e5918db-d70a-4d7d-b978-e6711f2a4779';

-- 3) Shift existing question display_order by +1 to make room for the new Pre/Post question at position 1
UPDATE public.survey_questions
SET display_order = display_order + 1
WHERE survey_id = '6e5918db-d70a-4d7d-b978-e6711f2a4779';

-- 4) Insert the new Pre/Post selector as question 1
INSERT INTO public.survey_questions
  (survey_id, question_type, question_text_th, question_text_en, options, is_required, display_order)
VALUES (
  '6e5918db-d70a-4d7d-b978-e6711f2a4779',
  'multiple_choice',
  'นี่เป็นแบบทดสอบครั้งใด',
  'Which attempt is this?',
  '[{"id":"pre","text_th":"ก่อน (Pre)","text_en":"Before (Pre)"},{"id":"post","text_th":"หลัง (Post)","text_en":"After (Post)"}]'::jsonb,
  true,
  1
);

-- 5) Remove the duplicate Post-test survey + its data
DELETE FROM public.survey_answers
 WHERE response_id IN (SELECT id FROM public.survey_responses WHERE survey_id = '4a5e39ad-0b89-487b-9ff3-2b97a393cf38');
DELETE FROM public.survey_responses WHERE survey_id = '4a5e39ad-0b89-487b-9ff3-2b97a393cf38';
DELETE FROM public.survey_questions WHERE survey_id = '4a5e39ad-0b89-487b-9ff3-2b97a393cf38';
DELETE FROM public.surveys WHERE id = '4a5e39ad-0b89-487b-9ff3-2b97a393cf38';

-- 6) Replace pairing RPC: single survey, phase = answer to display_order 1, name = answer to display_order 2
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
  survey_id_const uuid := '6e5918db-d70a-4d7d-b978-e6711f2a4779';
  norm_name text := lower(btrim(coalesce(p_name, '')));
BEGIN
  IF length(norm_name) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH q_phase AS (
    SELECT id FROM survey_questions
     WHERE survey_id = survey_id_const AND display_order = 1
  ),
  q_name AS (
    SELECT id FROM survey_questions
     WHERE survey_id = survey_id_const AND display_order = 2
  ),
  responses AS (
    SELECT
      sr.id,
      sr.completed_at,
      sa_name.answer_text AS raw_name,
      CASE
        WHEN (sa_phase.answer_options::jsonb) @> '["pre"]'::jsonb THEN 'pre'
        WHEN (sa_phase.answer_options::jsonb) @> '["post"]'::jsonb THEN 'post'
      END AS phase
    FROM survey_responses sr
    JOIN q_phase qp ON true
    JOIN q_name qn ON true
    JOIN survey_answers sa_phase ON sa_phase.response_id = sr.id AND sa_phase.question_id = qp.id
    JOIN survey_answers sa_name  ON sa_name.response_id  = sr.id AND sa_name.question_id  = qn.id
    WHERE sr.survey_id = survey_id_const
      AND sr.completed_at IS NOT NULL
      AND lower(btrim(sa_name.answer_text)) = norm_name
  ),
  latest AS (
    SELECT DISTINCT ON (phase) phase, id, completed_at, raw_name
    FROM responses
    WHERE phase IS NOT NULL
    ORDER BY phase, completed_at DESC
  ),
  scored AS (
    SELECT
      l.phase,
      l.completed_at,
      l.raw_name,
      COUNT(*) FILTER (
        WHERE sq.display_order >= 3
          AND (sa.answer_options::jsonb) @> '["b"]'::jsonb
      )::int AS score,
      COUNT(*) FILTER (WHERE sq.display_order >= 3)::int AS total
    FROM latest l
    JOIN survey_questions sq ON sq.survey_id = survey_id_const
    LEFT JOIN survey_answers sa ON sa.response_id = l.id AND sa.question_id = sq.id
    GROUP BY l.phase, l.completed_at, l.raw_name
  )
  SELECT
    MAX(CASE WHEN phase='pre'  THEN score END)::int,
    MAX(CASE WHEN phase='pre'  THEN total END)::int,
    MAX(CASE WHEN phase='pre'  THEN completed_at END),
    MAX(CASE WHEN phase='post' THEN score END)::int,
    MAX(CASE WHEN phase='post' THEN total END)::int,
    MAX(CASE WHEN phase='post' THEN completed_at END),
    COALESCE(
      MAX(CASE WHEN phase='pre'  THEN raw_name END),
      MAX(CASE WHEN phase='post' THEN raw_name END)
    )
  FROM scored
  HAVING COUNT(*) > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_post_score(text) TO anon, authenticated;

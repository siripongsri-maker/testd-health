-- Add conditional logic support to survey_questions
ALTER TABLE public.survey_questions ADD COLUMN IF NOT EXISTS skip_condition jsonb DEFAULT NULL;

COMMENT ON COLUMN public.survey_questions.skip_condition IS 'JSON: { "depends_on_question_index": int, "show_if_option_ids": [string] } — show this question only if the referenced question has one of the specified options selected';

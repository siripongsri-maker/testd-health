
CREATE OR REPLACE FUNCTION public.pre_service_counseling_notes_mint_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('counseling_completed', 'case_closed') THEN
    IF NEW.post_eval_token IS NULL THEN
      NEW.post_eval_token := gen_random_uuid();
    END IF;
    IF NEW.counseling_completed_at IS NULL THEN
      NEW.counseling_completed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.pre_service_counseling_notes
SET post_eval_token = gen_random_uuid()
WHERE status IN ('counseling_completed', 'case_closed')
  AND post_eval_token IS NULL;

UPDATE public.pre_service_counseling_notes
SET counseling_completed_at = COALESCE(counseling_completed_at, updated_at)
WHERE status IN ('counseling_completed', 'case_closed')
  AND counseling_completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_post_eval_context(_token uuid)
RETURNS TABLE (
  note_id uuid,
  branch_id uuid,
  branch_name_th text,
  branch_name_en text,
  counseling_completed_at timestamptz,
  already_submitted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.branch_id,
    b.name_th,
    b.name_en,
    n.counseling_completed_at,
    EXISTS (SELECT 1 FROM public.post_counseling_evaluations e WHERE e.note_id = n.id)
  FROM public.pre_service_counseling_notes n
  LEFT JOIN public.booking_branches b ON b.id = n.branch_id
  WHERE n.post_eval_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_eval_context(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_post_counseling_evaluation(
  _token uuid,
  _payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note public.pre_service_counseling_notes;
  v_survey public.appointment_pre_service_surveys;
  v_id uuid;
BEGIN
  SELECT * INTO v_note FROM public.pre_service_counseling_notes
  WHERE post_eval_token = _token LIMIT 1;

  IF v_note.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.post_counseling_evaluations WHERE note_id = v_note.id) THEN
    RAISE EXCEPTION 'Already submitted' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_survey FROM public.appointment_pre_service_surveys WHERE id = v_note.survey_id;

  INSERT INTO public.post_counseling_evaluations (
    note_id, survey_id, branch_id, counselor_id,
    satisfaction_score, understanding_score, safety_score,
    respect_score, clarity_score, next_step_confidence_score,
    still_needs_support, requested_service_after_counseling,
    follow_up_interest, open_feedback, anonymous_feedback,
    language
  )
  VALUES (
    v_note.id, v_note.survey_id, v_note.branch_id, v_note.updated_by,
    (_payload->>'satisfaction_score')::int,
    (_payload->>'understanding_score')::int,
    (_payload->>'safety_score')::int,
    (_payload->>'respect_score')::int,
    (_payload->>'clarity_score')::int,
    (_payload->>'next_step_confidence_score')::int,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'still_needs_support', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(_payload->'requested_service_after_counseling', '[]'::jsonb))),
    _payload->>'follow_up_interest',
    _payload->>'open_feedback',
    _payload->>'anonymous_feedback',
    COALESCE(_payload->>'language', v_survey.language)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_post_counseling_evaluation(uuid, jsonb) TO anon, authenticated;

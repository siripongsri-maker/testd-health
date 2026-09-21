-- 1) Make the post-counseling evaluation carry full linkage (UIC, branch, counselor, date)
CREATE OR REPLACE FUNCTION public.submit_post_counseling_evaluation(_token uuid, _payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    uic_hash, anonymous_id, counseling_completed_at,
    satisfaction_score, understanding_score, safety_score,
    respect_score, clarity_score, next_step_confidence_score,
    still_needs_support, requested_service_after_counseling,
    follow_up_interest, open_feedback, anonymous_feedback,
    language
  )
  VALUES (
    v_note.id, v_note.survey_id,
    COALESCE(v_note.branch_id, v_survey.branch_id),
    COALESCE(v_note.assigned_counselor_id, v_note.updated_by),
    v_survey.uic_hash, v_survey.uic_code,
    COALESCE(v_note.counseling_completed_at, now()),
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
$function$;

-- 2) Staff-facing helper: make sure a case has a note + token, and return the QR context
CREATE OR REPLACE FUNCTION public.ensure_post_eval_link(_survey_id uuid)
RETURNS TABLE(
  survey_id uuid,
  note_id uuid,
  token uuid,
  uic_display text,
  branch_id uuid,
  branch_name_th text,
  branch_name_en text,
  counselor_name text,
  counseling_date date,
  status text,
  has_evaluation boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_survey public.appointment_pre_service_surveys;
  v_note public.pre_service_counseling_notes;
  v_branch uuid;
BEGIN
  SELECT * INTO v_survey FROM public.appointment_pre_service_surveys WHERE id = _survey_id;
  IF v_survey.id IS NULL THEN
    RAISE EXCEPTION 'Survey not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(v_survey.branch_id, a.branch_id) INTO v_branch
  FROM public.appointments a WHERE a.id = v_survey.booking_id;
  v_branch := COALESCE(v_branch, v_survey.branch_id);

  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active AND (v_branch IS NULL OR sp.branch_id = v_branch))
    OR EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.user_id = auth.uid() AND cp.is_active AND (v_branch IS NULL OR cp.branch_id = v_branch))
  ) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_note FROM public.pre_service_counseling_notes n WHERE n.survey_id = _survey_id LIMIT 1;

  IF v_note.id IS NULL THEN
    INSERT INTO public.pre_service_counseling_notes(survey_id, branch_id, status, updated_by)
    VALUES (_survey_id, v_branch, 'not_reviewed', auth.uid())
    RETURNING * INTO v_note;
  ELSIF v_note.post_eval_token IS NULL THEN
    UPDATE public.pre_service_counseling_notes
    SET post_eval_token = gen_random_uuid()
    WHERE id = v_note.id
    RETURNING * INTO v_note;
  END IF;

  RETURN QUERY
  SELECT
    _survey_id,
    v_note.id,
    v_note.post_eval_token,
    v_survey.uic_display,
    COALESCE(v_note.branch_id, v_branch),
    b.name_th,
    b.name_en,
    COALESCE(p.display_name, sp.full_name),
    COALESCE(v_note.counseling_completed_at::date, v_survey.created_at::date),
    v_note.status,
    EXISTS (SELECT 1 FROM public.post_counseling_evaluations e WHERE e.note_id = v_note.id)
  FROM (SELECT 1) x
  LEFT JOIN public.booking_branches b ON b.id = COALESCE(v_note.branch_id, v_branch)
  LEFT JOIN public.profiles p ON p.id = COALESCE(v_note.assigned_counselor_id, v_note.updated_by)
  LEFT JOIN public.staff_profiles sp ON sp.user_id = COALESCE(v_note.assigned_counselor_id, v_note.updated_by);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ensure_post_eval_link(uuid) TO authenticated;

-- 1. Extend notes with post-eval token + completed timestamp
ALTER TABLE public.pre_service_counseling_notes
  ADD COLUMN IF NOT EXISTS post_eval_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS counseling_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS pre_service_counseling_notes_token_idx
  ON public.pre_service_counseling_notes(post_eval_token);

-- Trigger: whenever status transitions to counseling_completed, mint a token and mark timestamp.
CREATE OR REPLACE FUNCTION public.pre_service_counseling_notes_mint_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'counseling_completed' THEN
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

DROP TRIGGER IF EXISTS pre_service_counseling_notes_mint_token_trg ON public.pre_service_counseling_notes;
CREATE TRIGGER pre_service_counseling_notes_mint_token_trg
BEFORE INSERT OR UPDATE ON public.pre_service_counseling_notes
FOR EACH ROW EXECUTE FUNCTION public.pre_service_counseling_notes_mint_token();

-- Backfill for existing completed rows
UPDATE public.pre_service_counseling_notes
SET post_eval_token = gen_random_uuid()
WHERE status = 'counseling_completed' AND post_eval_token IS NULL;

UPDATE public.pre_service_counseling_notes
SET counseling_completed_at = COALESCE(counseling_completed_at, updated_at)
WHERE status = 'counseling_completed' AND counseling_completed_at IS NULL;

-- 2. Post-counseling evaluations table
CREATE TABLE IF NOT EXISTS public.post_counseling_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.pre_service_counseling_notes(id) ON DELETE CASCADE,
  survey_id uuid REFERENCES public.appointment_pre_service_surveys(id) ON DELETE SET NULL,
  branch_id uuid,
  counselor_id uuid,
  uic_hash text,
  anonymous_id text,
  counseling_completed_at timestamptz,
  evaluation_submitted_at timestamptz NOT NULL DEFAULT now(),
  satisfaction_score smallint,
  understanding_score smallint,
  safety_score smallint,
  respect_score smallint,
  clarity_score smallint,
  next_step_confidence_score smallint,
  still_needs_support text[] DEFAULT '{}',
  requested_service_after_counseling text[] DEFAULT '{}',
  follow_up_interest text,
  open_feedback text,
  anonymous_feedback text,
  language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pce_scores_range CHECK (
    (satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5) AND
    (understanding_score IS NULL OR understanding_score BETWEEN 1 AND 5) AND
    (safety_score IS NULL OR safety_score BETWEEN 1 AND 5) AND
    (respect_score IS NULL OR respect_score BETWEEN 1 AND 5) AND
    (clarity_score IS NULL OR clarity_score BETWEEN 1 AND 5) AND
    (next_step_confidence_score IS NULL OR next_step_confidence_score BETWEEN 1 AND 5)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pce_note_unique ON public.post_counseling_evaluations(note_id);
CREATE INDEX IF NOT EXISTS pce_branch_idx ON public.post_counseling_evaluations(branch_id);
CREATE INDEX IF NOT EXISTS pce_submitted_idx ON public.post_counseling_evaluations(evaluation_submitted_at);

GRANT SELECT, INSERT, UPDATE ON public.post_counseling_evaluations TO authenticated;
GRANT ALL ON public.post_counseling_evaluations TO service_role;

ALTER TABLE public.post_counseling_evaluations ENABLE ROW LEVEL SECURITY;

-- Admins/analysts see all
DROP POLICY IF EXISTS "pce_admin_read" ON public.post_counseling_evaluations;
CREATE POLICY "pce_admin_read" ON public.post_counseling_evaluations
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
);

-- Counselors / moderators see own branch
DROP POLICY IF EXISTS "pce_branch_read" ON public.post_counseling_evaluations;
CREATE POLICY "pce_branch_read" ON public.post_counseling_evaluations
FOR SELECT TO authenticated
USING (
  branch_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = auth.uid()
      AND sp.is_active = true
      AND sp.branch_id = post_counseling_evaluations.branch_id
  )
);

-- Only service_role writes directly (public form uses SECURITY DEFINER RPC)
-- Admins may update to correct data
DROP POLICY IF EXISTS "pce_admin_update" ON public.post_counseling_evaluations;
CREATE POLICY "pce_admin_update" ON public.post_counseling_evaluations
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Touch trigger
CREATE OR REPLACE FUNCTION public.pce_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS pce_touch_trg ON public.post_counseling_evaluations;
CREATE TRIGGER pce_touch_trg BEFORE UPDATE ON public.post_counseling_evaluations
FOR EACH ROW EXECUTE FUNCTION public.pce_touch();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_counseling_evaluations;

-- 3. Public RPCs (secure token-based access)
CREATE OR REPLACE FUNCTION public.get_post_eval_context(_token uuid)
RETURNS TABLE(
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
    AND n.status = 'counseling_completed'
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
  WHERE post_eval_token = _token AND status = 'counseling_completed' LIMIT 1;

  IF v_note.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.post_counseling_evaluations WHERE note_id = v_note.id) THEN
    RAISE EXCEPTION 'Already submitted' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_survey FROM public.appointment_pre_service_surveys
  WHERE id = v_note.survey_id LIMIT 1;

  INSERT INTO public.post_counseling_evaluations(
    note_id, survey_id, branch_id, counselor_id,
    uic_hash, anonymous_id, counseling_completed_at,
    satisfaction_score, understanding_score, safety_score, respect_score,
    clarity_score, next_step_confidence_score,
    still_needs_support, requested_service_after_counseling,
    follow_up_interest, open_feedback, anonymous_feedback, language
  ) VALUES (
    v_note.id, v_note.survey_id, v_note.branch_id, v_note.updated_by,
    v_survey.uic_hash, v_survey.uic_code, v_note.counseling_completed_at,
    NULLIF((_payload->>'satisfaction_score')::int, 0)::smallint,
    NULLIF((_payload->>'understanding_score')::int, 0)::smallint,
    NULLIF((_payload->>'safety_score')::int, 0)::smallint,
    NULLIF((_payload->>'respect_score')::int, 0)::smallint,
    NULLIF((_payload->>'clarity_score')::int, 0)::smallint,
    NULLIF((_payload->>'next_step_confidence_score')::int, 0)::smallint,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_payload->'still_needs_support')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_payload->'requested_service_after_counseling')), '{}'),
    NULLIF(_payload->>'follow_up_interest', ''),
    NULLIF(_payload->>'open_feedback', ''),
    NULLIF(_payload->>'anonymous_feedback', ''),
    NULLIF(_payload->>'language', '')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_post_counseling_evaluation(uuid, jsonb) TO anon, authenticated;


-- Add UIC anonymous longitudinal tracking to pre-service surveys
ALTER TABLE public.appointment_pre_service_surveys
  ADD COLUMN IF NOT EXISTS uic_hash text,
  ADD COLUMN IF NOT EXISTS visit_sequence integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS linked_previous_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_apss_uic_hash ON public.appointment_pre_service_surveys(uic_hash);

-- RPC: submit pre-service survey atomically with anonymous visit counting via uic_hash
CREATE OR REPLACE FUNCTION public.submit_pre_service_survey(
  p_booking_id uuid,
  p_uic_code text,
  p_uic_hash text,
  p_language text,
  p_channel text,
  p_knowledge jsonb,
  p_behavior jsonb,
  p_confidence int,
  p_safety int,
  p_recommend text,
  p_mental_health_interest text,
  p_suggestions text
)
RETURNS TABLE(id uuid, visit_sequence integer, linked_previous_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_count integer := 0;
  v_id uuid;
  v_seq integer := 1;
BEGIN
  -- Verify booking exists
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF p_uic_hash IS NOT NULL AND length(p_uic_hash) > 0 THEN
    SELECT COUNT(*) INTO v_prev_count
    FROM public.appointment_pre_service_surveys
    WHERE uic_hash = p_uic_hash;
    v_seq := v_prev_count + 1;
  END IF;

  INSERT INTO public.appointment_pre_service_surveys (
    booking_id, uic_code, uic_hash, language, channel,
    knowledge, behavior, confidence, safety, recommend,
    mental_health_interest, suggestions,
    visit_sequence, linked_previous_count
  ) VALUES (
    p_booking_id, p_uic_code, p_uic_hash, COALESCE(p_language, 'th'), COALESCE(p_channel, 'clinic'),
    p_knowledge, p_behavior, p_confidence, p_safety, p_recommend,
    p_mental_health_interest, p_suggestions,
    v_seq, v_prev_count
  )
  RETURNING appointment_pre_service_surveys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_seq, v_prev_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_pre_service_survey(
  uuid, text, text, text, text, jsonb, jsonb, int, int, text, text, text
) TO anon, authenticated;

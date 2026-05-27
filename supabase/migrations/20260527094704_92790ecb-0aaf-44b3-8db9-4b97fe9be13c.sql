
-- Drop old broken function (ambiguous "id" column due to RETURNS TABLE OUT names colliding with table columns)
DROP FUNCTION IF EXISTS public.submit_pre_service_survey(uuid, text, text, text, text, jsonb, jsonb, int, int, text, text, text);

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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_count integer := 0;
  v_id uuid;
  v_seq integer := 1;
  v_existing_id uuid;
BEGIN
  IF p_booking_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'missing_booking', 'error_message', 'booking_id is required');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = p_booking_id) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'booking_not_found', 'error_message', 'appointment not found');
  END IF;

  -- Duplicate-safe: if already submitted for this booking, return duplicate success
  SELECT s.id INTO v_existing_id
  FROM public.appointment_pre_service_surveys s
  WHERE s.booking_id = p_booking_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'survey_id', v_existing_id);
  END IF;

  IF p_uic_hash IS NOT NULL AND length(p_uic_hash) > 0 THEN
    SELECT COUNT(*) INTO v_prev_count
    FROM public.appointment_pre_service_surveys s
    WHERE s.uic_hash = p_uic_hash;
    v_seq := COALESCE(v_prev_count, 0) + 1;
  END IF;

  BEGIN
    INSERT INTO public.appointment_pre_service_surveys (
      booking_id, uic_code, uic_hash, language, channel,
      knowledge, behavior, confidence, safety, recommend,
      mental_health_interest, suggestions,
      visit_sequence, linked_previous_count
    ) VALUES (
      p_booking_id, p_uic_code, p_uic_hash, COALESCE(p_language, 'th'), COALESCE(p_channel, 'clinic'),
      COALESCE(p_knowledge, '{}'::jsonb), COALESCE(p_behavior, '{}'::jsonb),
      p_confidence, p_safety, p_recommend,
      p_mental_health_interest, NULLIF(btrim(COALESCE(p_suggestions, '')), ''),
      COALESCE(v_seq, 1), COALESCE(v_prev_count, 0)
    )
    RETURNING appointment_pre_service_surveys.id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT s.id INTO v_existing_id
      FROM public.appointment_pre_service_surveys s
      WHERE s.booking_id = p_booking_id
      LIMIT 1;
      RETURN jsonb_build_object('success', true, 'duplicate', true, 'survey_id', v_existing_id);
  END;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'survey_id', v_id,
    'visit_sequence', v_seq,
    'linked_previous_count', v_prev_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_pre_service_survey(
  uuid, text, text, text, text, jsonb, jsonb, int, int, text, text, text
) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can join session" ON public.partner_test_session_participants;

CREATE POLICY "No direct participant inserts"
ON public.partner_test_session_participants
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.join_partner_session(p_session_code text, p_participant_sid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session record;
  v_join_count int;
  v_existing boolean;
  v_participant_sid text;
BEGIN
  v_participant_sid := nullif(trim(p_participant_sid), '');
  IF v_participant_sid IS NULL OR length(v_participant_sid) < 12 OR length(v_participant_sid) > 128 THEN
    RAISE EXCEPTION 'invalid_participant_session';
  END IF;

  SELECT pts.* INTO v_session
  FROM public.partner_test_sessions pts
  JOIN public.partner_invites pi ON pi.id = pts.host_invite_id
  WHERE pts.session_code = p_session_code
    AND pi.is_active = true
    AND pi.expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.partner_test_session_participants
    WHERE session_id = v_session.id
      AND participant_session_id = v_participant_sid
  ) INTO v_existing;
  
  IF v_existing THEN
    RETURN jsonb_build_object('status', 'already_joined', 'session_id', v_session.id);
  END IF;

  IF v_session.status <> 'waiting' THEN
    RAISE EXCEPTION 'session_not_waiting';
  END IF;

  SELECT COUNT(*) INTO v_join_count
  FROM public.partner_test_session_participants
  WHERE session_id = v_session.id;
  IF v_join_count >= v_session.max_participants THEN
    RAISE EXCEPTION 'session_full';
  END IF;

  -- Rate limit: max 3 session joins per visitor per hour.
  SELECT COUNT(*) INTO v_join_count
  FROM public.partner_test_session_participants
  WHERE participant_session_id = v_participant_sid
    AND joined_at > now() - interval '1 hour';
  IF v_join_count >= 3 THEN
    RAISE EXCEPTION 'join_rate_limited';
  END IF;

  INSERT INTO public.partner_test_session_participants (session_id, participant_session_id)
  VALUES (v_session.id, v_participant_sid);

  UPDATE public.partner_test_sessions
  SET status = 'accepted'
  WHERE id = v_session.id
    AND status = 'waiting';

  RETURN jsonb_build_object('status', 'joined', 'session_id', v_session.id);
END;
$$;

-- Add status column to partner_invites if missing
ALTER TABLE public.partner_invites ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.partner_invites ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE public.partner_invites ADD COLUMN IF NOT EXISTS max_opens int DEFAULT 50;

-- Set status for existing invites
UPDATE public.partner_invites SET status = 'active' WHERE status IS NULL AND is_active = true;
UPDATE public.partner_invites SET status = 'expired' WHERE status IS NULL AND NOT is_active;

-- Update default expiry to 7 days
ALTER TABLE public.partner_invites ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Add pair flow status constraint to partner_test_sessions
ALTER TABLE public.partner_test_sessions DROP CONSTRAINT IF EXISTS partner_test_sessions_status_check;
ALTER TABLE public.partner_test_sessions ADD CONSTRAINT partner_test_sessions_status_check 
  CHECK (status IN ('waiting', 'accepted', 'plans_to_test', 'booking_started', 'booked', 'active', 'completed'));

-- Recreate create_partner_invite with 7-day expiry (24h for sessions)
CREATE OR REPLACE FUNCTION public.create_partner_invite(p_invite_type text, p_tone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_code text;
  v_session_code text;
  v_invite_id uuid;
  v_session_id uuid;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i int;
  v_attempts int := 0;
  v_daily_count int;
  v_expiry_interval interval;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_invite_type NOT IN ('link', 'qr', 'session') THEN
    RAISE EXCEPTION 'Invalid invite type';
  END IF;
  IF p_tone NOT IN ('routine', 'risk', 'urgent') THEN
    RAISE EXCEPTION 'Invalid tone';
  END IF;

  -- Daily limit
  SELECT COUNT(*) INTO v_daily_count
  FROM partner_invites WHERE created_by = v_user_id AND created_at > now() - interval '1 day';
  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'daily_invite_limit';
  END IF;

  -- Session invites 24h, others 7 days
  v_expiry_interval := CASE WHEN p_invite_type = 'session' THEN interval '24 hours' ELSE interval '7 days' END;

  LOOP
    v_code := '';
    FOR v_i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM partner_invites WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;

  INSERT INTO partner_invites (created_by, code, invite_type, tone, expires_at, status)
  VALUES (v_user_id, v_code, p_invite_type, p_tone, now() + v_expiry_interval, 'active')
  RETURNING id INTO v_invite_id;

  IF p_invite_type = 'session' THEN
    v_attempts := 0;
    LOOP
      v_session_code := '';
      FOR v_i IN 1..6 LOOP
        v_session_code := v_session_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM partner_test_sessions WHERE session_code = v_session_code);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique session code'; END IF;
    END LOOP;

    INSERT INTO partner_test_sessions (host_invite_id, session_code)
    VALUES (v_invite_id, v_session_code)
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('code', v_code, 'invite_id', v_invite_id, 'session_code', v_session_code, 'session_id', v_session_id);
  END IF;

  RETURN jsonb_build_object('code', v_code, 'invite_id', v_invite_id);
END;
$$;

-- Revoke function
CREATE OR REPLACE FUNCTION public.revoke_partner_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE partner_invites 
  SET status = 'revoked', is_active = false, revoked_at = now()
  WHERE id = p_invite_id AND created_by = auth.uid();
END;
$$;

-- Update get_partner_invite_stats with response counts
DROP FUNCTION IF EXISTS public.get_partner_invite_stats();
CREATE OR REPLACE FUNCTION public.get_partner_invite_stats()
RETURNS TABLE(
  invites_created bigint,
  invites_opened bigint,
  unique_opens bigint,
  kit_cta bigint,
  booking_cta bigint,
  sessions_joined bigint,
  timer_completed bigint,
  bookings_completed bigint,
  selftest_requests bigint,
  conversion_rate numeric,
  accepted_count bigint,
  plans_to_test_count bigint,
  booked_count bigint,
  completed_count bigint,
  active_invites bigint,
  expired_invites bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_unique bigint;
  v_bookings_done bigint;
  v_timer_done bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT COUNT(DISTINCT piv.visitor_session_id) INTO v_unique
  FROM partner_invite_visits piv JOIN partner_invites pi ON pi.id = piv.invite_id WHERE pi.created_by = v_user_id;

  SELECT COUNT(*) INTO v_bookings_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_completed';

  SELECT COUNT(*) INTO v_timer_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'timer_complete';

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id)::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'view')::bigint,
    v_unique,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'cta_kit')::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type IN ('cta_booking', 'booking_started'))::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'join_session')::bigint,
    v_timer_done,
    v_bookings_done,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'selftest_requested')::bigint,
    CASE WHEN v_unique > 0 THEN ROUND((v_bookings_done + v_timer_done)::numeric / v_unique * 100, 1) ELSE 0::numeric END,
    (SELECT COUNT(*) FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'accepted')::bigint,
    (SELECT COUNT(*) FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'plans_to_test')::bigint,
    (SELECT COUNT(*) FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'booked')::bigint,
    (SELECT COUNT(*) FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'completed')::bigint,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND is_active = true AND expires_at > now())::bigint,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND (NOT is_active OR expires_at <= now()))::bigint;
END;
$$;

-- Update admin report with response counts
DROP FUNCTION IF EXISTS public.get_admin_partner_invite_report(date, date);
CREATE OR REPLACE FUNCTION public.get_admin_partner_invite_report(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  invite_id uuid, created_at timestamptz, invite_type text, tone text, expires_at timestamptz,
  is_active boolean, status text, opens bigint, kit_cta bigint, booking_cta bigint,
  sessions_joined bigint, timer_completed bigint, bookings_completed bigint, selftest_requests bigint,
  accepted_count bigint, plans_to_test_count bigint, booked_count bigint, completed_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Permission denied'; END IF;
  RETURN QUERY
  SELECT pi.id, pi.created_at, pi.invite_type, pi.tone, pi.expires_at, pi.is_active, pi.status,
    (SELECT COUNT(DISTINCT piv.visitor_session_id) FROM partner_invite_visits piv WHERE piv.invite_id = pi.id),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'cta_kit'),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type IN ('cta_booking', 'booking_started')),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'join_session'),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'timer_complete'),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'booking_completed'),
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'selftest_requested'),
    (SELECT COUNT(*) FROM partner_invite_responses pir WHERE pir.invite_id = pi.id AND pir.response_state = 'accepted'),
    (SELECT COUNT(*) FROM partner_invite_responses pir WHERE pir.invite_id = pi.id AND pir.response_state = 'plans_to_test'),
    (SELECT COUNT(*) FROM partner_invite_responses pir WHERE pir.invite_id = pi.id AND pir.response_state = 'booked'),
    (SELECT COUNT(*) FROM partner_invite_responses pir WHERE pir.invite_id = pi.id AND pir.response_state = 'completed')
  FROM partner_invites pi
  WHERE (p_start_date IS NULL OR pi.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR pi.created_at::date <= p_end_date)
  ORDER BY pi.created_at DESC;
END;
$$;

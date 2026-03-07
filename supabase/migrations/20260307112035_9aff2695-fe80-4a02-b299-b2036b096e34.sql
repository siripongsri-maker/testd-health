
-- ============================================================
-- Phase 2: Pair Booking + Anonymous Relay Expansion
-- ============================================================

-- 0. Create booking_attributions table if missing
CREATE TABLE IF NOT EXISTS public.booking_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text,
  invite_id uuid REFERENCES public.partner_invites(id) ON DELETE SET NULL,
  session_id text,
  visitor_session_id text,
  attribution_type text CHECK (attribution_type IN ('invite_link', 'invite_qr', 'pair_session')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_attribution" ON public.booking_attributions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admins_view_attributions" ON public.booking_attributions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 1. Create partner_invite_relays table (prep for future SMS/email)
CREATE TABLE IF NOT EXISTS public.partner_invite_relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.partner_invites(id) ON DELETE CASCADE NOT NULL,
  relay_type text NOT NULL CHECK (relay_type IN ('sms', 'email', 'platform')),
  recipient_hash text NOT NULL,
  relay_status text NOT NULL DEFAULT 'pending' CHECK (relay_status IN ('pending', 'sent', 'failed', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invite_relays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_relays" ON public.partner_invite_relays
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add pair_booking_count to partner_test_sessions
ALTER TABLE public.partner_test_sessions ADD COLUMN IF NOT EXISTS pair_booking_count int DEFAULT 0;

-- 3. Session join limit enforcement via RPC wrapper
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
BEGIN
  SELECT pts.* INTO v_session
  FROM partner_test_sessions pts
  WHERE pts.session_code = p_session_code;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM partner_test_session_participants
    WHERE session_id = v_session.id AND participant_session_id = p_participant_sid
  ) INTO v_existing;
  
  IF v_existing THEN
    RETURN jsonb_build_object('status', 'already_joined', 'session_id', v_session.id);
  END IF;

  SELECT COUNT(*) INTO v_join_count
  FROM partner_test_session_participants WHERE session_id = v_session.id;
  IF v_join_count >= v_session.max_participants THEN RAISE EXCEPTION 'session_full'; END IF;

  -- Rate limit: max 3 session joins per visitor per hour
  SELECT COUNT(*) INTO v_join_count
  FROM partner_test_session_participants
  WHERE participant_session_id = p_participant_sid AND joined_at > now() - interval '1 hour';
  IF v_join_count >= 3 THEN RAISE EXCEPTION 'join_rate_limited'; END IF;

  INSERT INTO partner_test_session_participants (session_id, participant_session_id)
  VALUES (v_session.id, p_participant_sid);

  UPDATE partner_test_sessions SET status = 'accepted'
  WHERE id = v_session.id AND status = 'waiting';

  RETURN jsonb_build_object('status', 'joined', 'session_id', v_session.id);
END;
$$;

-- 4. Trigger to update session pair status from booking attributions
CREATE OR REPLACE FUNCTION public.update_session_pair_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id uuid;
  v_booking_count int;
BEGIN
  IF NEW.invite_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT pts.id INTO v_session_id
  FROM partner_test_sessions pts WHERE pts.host_invite_id = NEW.invite_id;

  IF v_session_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_booking_count
    FROM booking_attributions ba WHERE ba.invite_id = NEW.invite_id;

    UPDATE partner_test_sessions
    SET pair_booking_count = v_booking_count,
        status = CASE
          WHEN v_booking_count >= 2 THEN 'booked'
          WHEN v_booking_count >= 1 AND status IN ('waiting', 'accepted', 'plans_to_test', 'booking_started') THEN 'booking_started'
          ELSE status
        END
    WHERE id = v_session_id AND status NOT IN ('active', 'completed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_session_pair_status ON public.booking_attributions;
CREATE TRIGGER trg_update_session_pair_status
  AFTER INSERT ON public.booking_attributions
  FOR EACH ROW EXECUTE FUNCTION public.update_session_pair_status();

-- 5. Upgrade get_partner_invite_stats with pair_completed and booking_started
DROP FUNCTION IF EXISTS public.get_partner_invite_stats();
CREATE OR REPLACE FUNCTION public.get_partner_invite_stats()
RETURNS TABLE(
  invites_created bigint, invites_opened bigint, unique_opens bigint,
  kit_cta bigint, booking_cta bigint, sessions_joined bigint,
  timer_completed bigint, bookings_completed bigint, selftest_requests bigint,
  conversion_rate numeric,
  accepted_count bigint, plans_to_test_count bigint, booked_count bigint, completed_count bigint,
  active_invites bigint, expired_invites bigint,
  pair_completed bigint, booking_started_count bigint
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
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND (NOT is_active OR expires_at <= now()))::bigint,
    (SELECT COUNT(*) FROM partner_test_sessions pts JOIN partner_invites pi ON pi.id = pts.host_invite_id WHERE pi.created_by = v_user_id AND pts.status = 'completed')::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_started')::bigint;
END;
$$;

-- 6. Upgrade admin report with pair_status and pair_booking_count
DROP FUNCTION IF EXISTS public.get_admin_partner_invite_report(date, date);
CREATE OR REPLACE FUNCTION public.get_admin_partner_invite_report(
  p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  invite_id uuid, created_at timestamptz, invite_type text, tone text, expires_at timestamptz,
  is_active boolean, status text, opens bigint, kit_cta bigint, booking_cta bigint,
  sessions_joined bigint, timer_completed bigint, bookings_completed bigint, selftest_requests bigint,
  accepted_count bigint, plans_to_test_count bigint, booked_count bigint, completed_count bigint,
  pair_status text, pair_booking_count int
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
    (SELECT COUNT(*) FROM partner_invite_responses pir WHERE pir.invite_id = pi.id AND pir.response_state = 'completed'),
    (SELECT pts.status FROM partner_test_sessions pts WHERE pts.host_invite_id = pi.id LIMIT 1),
    (SELECT pts.pair_booking_count FROM partner_test_sessions pts WHERE pts.host_invite_id = pi.id LIMIT 1)
  FROM partner_invites pi
  WHERE (p_start_date IS NULL OR pi.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR pi.created_at::date <= p_end_date)
  ORDER BY pi.created_at DESC;
END;
$$;

-- 7. Enable realtime for partner_test_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'partner_test_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_test_sessions;
  END IF;
END;
$$;

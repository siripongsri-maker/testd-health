
-- Drop old get_partner_invite_stats with different return type
DROP FUNCTION IF EXISTS public.get_partner_invite_stats();

-- Recreated with extended return type including fraud-adjusted scores
CREATE OR REPLACE FUNCTION public.get_partner_invite_stats()
RETURNS TABLE(
  invites_created bigint, invites_opened bigint, unique_opens bigint,
  kit_cta bigint, booking_cta bigint, sessions_joined bigint,
  timer_completed bigint, bookings_completed bigint, selftest_requests bigint,
  conversion_rate numeric,
  accepted_count bigint, plans_to_test_count bigint, booked_count bigint, completed_count bigint,
  active_invites bigint, expired_invites bigint, pair_completed bigint, booking_started_count bigint,
  raw_impact_score bigint, adjusted_impact_score bigint, suspicious_events_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_unique bigint;
  v_bookings_done bigint;
  v_timer_done bigint;
  v_accepted bigint;
  v_plans bigint;
  v_booked bigint;
  v_completed bigint;
  v_pair_done bigint;
  v_suspicious bigint;
  v_raw_score bigint;
  v_adj_score bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT COUNT(DISTINCT piv.visitor_session_id) INTO v_unique
  FROM partner_invite_visits piv JOIN partner_invites pi ON pi.id = piv.invite_id WHERE pi.created_by = v_user_id;

  SELECT COUNT(*) INTO v_bookings_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_completed';

  SELECT COUNT(*) INTO v_timer_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'timer_complete';

  SELECT COUNT(*) INTO v_accepted FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'accepted';
  SELECT COUNT(*) INTO v_plans FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'plans_to_test';
  SELECT COUNT(*) INTO v_booked FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'booked';
  SELECT COUNT(*) INTO v_completed FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'completed';

  SELECT COUNT(*) INTO v_pair_done FROM partner_test_sessions pts JOIN partner_invites pi ON pi.id = pts.host_invite_id WHERE pi.created_by = v_user_id AND pts.status = 'completed';

  SELECT COALESCE(SUM(score), 0) INTO v_suspicious FROM partner_invite_abuse_flags WHERE user_id = v_user_id AND status IN ('open','reviewing');

  v_raw_score := v_unique * 1 + v_accepted * 1 + v_plans * 2 + v_booked * 4 + v_completed * 6 + v_bookings_done * 6 + v_timer_done * 6 + v_pair_done * 8;
  v_adj_score := GREATEST(0, v_raw_score - v_suspicious);

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
    CASE WHEN v_unique > 0 THEN ROUND((v_bookings_done + v_timer_done + v_booked + v_completed)::numeric / v_unique * 100, 1) ELSE 0::numeric END,
    v_accepted, v_plans, v_booked, v_completed,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND is_active = true AND expires_at > now())::bigint,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND (NOT is_active OR expires_at <= now()))::bigint,
    v_pair_done,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_started')::bigint,
    v_raw_score,
    v_adj_score,
    v_suspicious;
END;
$$;

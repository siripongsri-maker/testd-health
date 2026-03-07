
-- ============================================
-- Phase 3.1: Admin Testing + SMS Relay + Missing Tables
-- ============================================

-- 1. Create partner_invite_abuse_flags (was referenced but never created)
CREATE TABLE IF NOT EXISTS public.partner_invite_abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.partner_invites(id) ON DELETE SET NULL,
  user_id uuid,
  visitor_session_id text,
  phone_hash text,
  abuse_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  score integer NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','ignored')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invite_abuse_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage abuse flags" ON public.partner_invite_abuse_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_abuse_flags_status ON public.partner_invite_abuse_flags(status);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON public.partner_invite_abuse_flags(user_id);

-- 2. Create partner_invite_responses (was referenced but never created)
CREATE TABLE IF NOT EXISTS public.partner_invite_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.partner_invites(id) ON DELETE CASCADE,
  visitor_session_id text NOT NULL,
  response_state text NOT NULL CHECK (response_state IN ('accepted','plans_to_test','booked','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_id, visitor_session_id)
);

ALTER TABLE public.partner_invite_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert responses" ON public.partner_invite_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read own responses" ON public.partner_invite_responses
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update own responses" ON public.partner_invite_responses
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Add trust_tier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_tier text NOT NULL DEFAULT 'new' CHECK (trust_tier IN ('new','standard','trusted','admin'));

-- 4. Add is_test_mode to partner_invites
ALTER TABLE public.partner_invites ADD COLUMN IF NOT EXISTS is_test_mode boolean NOT NULL DEFAULT false;

-- 5. Add is_test_mode to partner_invite_events
ALTER TABLE public.partner_invite_events ADD COLUMN IF NOT EXISTS is_test_mode boolean NOT NULL DEFAULT false;

-- 6. Add is_test_mode to partner_test_sessions
ALTER TABLE public.partner_test_sessions ADD COLUMN IF NOT EXISTS is_test_mode boolean NOT NULL DEFAULT false;

-- 7. Add is_test_mode to booking_attributions
ALTER TABLE public.booking_attributions ADD COLUMN IF NOT EXISTS is_test_mode boolean NOT NULL DEFAULT false;

-- 8. Extend partner_invite_relays with SMS fields
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS block_reason text;
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.partner_invite_relays ADD COLUMN IF NOT EXISTS is_test_mode boolean NOT NULL DEFAULT false;

-- 9. Create upsert_partner_invite_response RPC (forward-only response progression)
CREATE OR REPLACE FUNCTION public.upsert_partner_invite_response(
  p_code text,
  p_visitor_session_id text,
  p_response_state text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id uuid;
  v_current text;
  v_order_map jsonb := '{"accepted":1,"plans_to_test":2,"booked":3,"completed":4}'::jsonb;
  v_new_order int;
  v_cur_order int;
BEGIN
  IF p_response_state NOT IN ('accepted','plans_to_test','booked','completed') THEN
    RAISE EXCEPTION 'Invalid response state';
  END IF;

  SELECT id INTO v_invite_id FROM partner_invites WHERE code = p_code AND is_active = true AND expires_at > now();
  IF v_invite_id IS NULL THEN RAISE EXCEPTION 'Invite not found or expired'; END IF;

  v_new_order := (v_order_map->>p_response_state)::int;

  SELECT response_state INTO v_current FROM partner_invite_responses
  WHERE invite_id = v_invite_id AND visitor_session_id = p_visitor_session_id;

  IF v_current IS NOT NULL THEN
    v_cur_order := (v_order_map->>v_current)::int;
    IF v_new_order <= v_cur_order THEN RETURN v_current; END IF;
    UPDATE partner_invite_responses SET response_state = p_response_state, updated_at = now()
    WHERE invite_id = v_invite_id AND visitor_session_id = p_visitor_session_id;
  ELSE
    INSERT INTO partner_invite_responses (invite_id, visitor_session_id, response_state)
    VALUES (v_invite_id, p_visitor_session_id, p_response_state);
  END IF;

  RETURN p_response_state;
END;
$$;

-- 10. Create update_abuse_flag_status RPC
CREATE OR REPLACE FUNCTION public.update_abuse_flag_status(
  p_flag_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('open','reviewing','resolved','ignored') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE partner_invite_abuse_flags SET status = p_status, admin_note = COALESCE(p_note, admin_note), reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_flag_id;
END;
$$;

-- 11. Create update_user_trust_tier RPC
CREATE OR REPLACE FUNCTION public.update_user_trust_tier(
  p_user_id uuid,
  p_trust_tier text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_trust_tier NOT IN ('new','standard','trusted','admin') THEN RAISE EXCEPTION 'Invalid tier'; END IF;
  UPDATE profiles SET trust_tier = p_trust_tier, updated_at = now() WHERE id = p_user_id;
END;
$$;

-- 12. Replace create_partner_invite with admin bypass + SMS support + test mode
CREATE OR REPLACE FUNCTION public.create_partner_invite(
  p_invite_type text,
  p_tone text,
  p_is_test_mode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_daily_limit int;
  v_expiry_interval interval;
  v_is_admin boolean;
  v_trust_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF p_invite_type NOT IN ('link', 'qr', 'session', 'sms') THEN RAISE EXCEPTION 'Invalid invite type'; END IF;
  IF p_tone NOT IN ('routine', 'risk', 'urgent') THEN RAISE EXCEPTION 'Invalid tone'; END IF;

  v_is_admin := has_role(v_user_id, 'admin');

  -- Only allow test mode for admins
  IF p_is_test_mode AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Test mode is admin-only';
  END IF;

  -- Get trust tier
  SELECT COALESCE(trust_tier, 'new') INTO v_trust_tier FROM profiles WHERE id = v_user_id;
  IF v_trust_tier IS NULL THEN v_trust_tier := 'new'; END IF;

  -- Admin bypass: no daily limit in test mode or as admin
  IF NOT v_is_admin THEN
    v_daily_limit := CASE v_trust_tier
      WHEN 'trusted' THEN 15
      WHEN 'standard' THEN 10
      ELSE 5
    END;

    SELECT COUNT(*) INTO v_daily_count
    FROM partner_invites WHERE created_by = v_user_id AND created_at > now() - interval '1 day' AND NOT is_test_mode;
    IF v_daily_count >= v_daily_limit THEN RAISE EXCEPTION 'daily_invite_limit'; END IF;

    -- SMS restricted to trusted+ for non-admins
    IF p_invite_type = 'sms' AND v_trust_tier NOT IN ('trusted', 'admin') THEN
      RAISE EXCEPTION 'sms_not_available';
    END IF;
  END IF;

  v_expiry_interval := CASE WHEN p_invite_type = 'session' THEN interval '24 hours' ELSE interval '7 days' END;

  LOOP
    v_code := '';
    FOR v_i IN 1..8 LOOP v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM partner_invites WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;

  INSERT INTO partner_invites (created_by, code, invite_type, tone, expires_at, status, is_test_mode)
  VALUES (v_user_id, v_code, p_invite_type, p_tone, now() + v_expiry_interval, 'active', COALESCE(p_is_test_mode, false))
  RETURNING id INTO v_invite_id;

  IF p_invite_type = 'session' THEN
    v_attempts := 0;
    LOOP
      v_session_code := '';
      FOR v_i IN 1..6 LOOP v_session_code := v_session_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1); END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM partner_test_sessions WHERE session_code = v_session_code);
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique session code'; END IF;
    END LOOP;

    INSERT INTO partner_test_sessions (host_invite_id, session_code, is_test_mode)
    VALUES (v_invite_id, v_session_code, COALESCE(p_is_test_mode, false))
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('code', v_code, 'invite_id', v_invite_id, 'session_code', v_session_code, 'session_id', v_session_id);
  END IF;

  RETURN jsonb_build_object('code', v_code, 'invite_id', v_invite_id);
END;
$$;

-- 13. Replace get_partner_invite_stats to handle missing tables gracefully
CREATE OR REPLACE FUNCTION public.get_partner_invite_stats()
RETURNS TABLE (
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
  expired_invites bigint,
  pair_completed bigint,
  booking_started_count bigint,
  raw_impact_score bigint,
  adjusted_impact_score bigint,
  suspicious_events_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM partner_invite_visits piv JOIN partner_invites pi ON pi.id = piv.invite_id WHERE pi.created_by = v_user_id AND NOT pi.is_test_mode;

  SELECT COUNT(*) INTO v_bookings_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_completed' AND NOT pi.is_test_mode;

  SELECT COUNT(*) INTO v_timer_done
  FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'timer_complete' AND NOT pi.is_test_mode;

  SELECT COUNT(*) INTO v_accepted FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'accepted' AND NOT pi.is_test_mode;
  SELECT COUNT(*) INTO v_plans FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'plans_to_test' AND NOT pi.is_test_mode;
  SELECT COUNT(*) INTO v_booked FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'booked' AND NOT pi.is_test_mode;
  SELECT COUNT(*) INTO v_completed FROM partner_invite_responses pir JOIN partner_invites pi ON pi.id = pir.invite_id WHERE pi.created_by = v_user_id AND pir.response_state = 'completed' AND NOT pi.is_test_mode;

  SELECT COUNT(*) INTO v_pair_done FROM partner_test_sessions pts JOIN partner_invites pi ON pi.id = pts.host_invite_id WHERE pi.created_by = v_user_id AND pts.status = 'completed' AND NOT pi.is_test_mode;

  SELECT COALESCE(SUM(score), 0) INTO v_suspicious FROM partner_invite_abuse_flags WHERE user_id = v_user_id AND status IN ('open','reviewing');

  v_raw_score := v_unique * 1 + v_accepted * 1 + v_plans * 2 + v_booked * 4 + v_completed * 6 + v_bookings_done * 6 + v_timer_done * 6 + v_pair_done * 8;
  v_adj_score := GREATEST(0, v_raw_score - v_suspicious);

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND NOT is_test_mode)::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'view' AND NOT pi.is_test_mode)::bigint,
    v_unique,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'cta_kit' AND NOT pi.is_test_mode)::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type IN ('cta_booking', 'booking_started') AND NOT pi.is_test_mode)::bigint,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'join_session' AND NOT pi.is_test_mode)::bigint,
    v_timer_done,
    v_bookings_done,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'selftest_requested' AND NOT pi.is_test_mode)::bigint,
    CASE WHEN v_unique > 0 THEN ROUND((v_bookings_done + v_timer_done + v_booked + v_completed)::numeric / v_unique * 100, 1) ELSE 0::numeric END,
    v_accepted, v_plans, v_booked, v_completed,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND is_active = true AND expires_at > now() AND NOT is_test_mode)::bigint,
    (SELECT COUNT(*) FROM partner_invites WHERE created_by = v_user_id AND (NOT is_active OR expires_at <= now()) AND NOT is_test_mode)::bigint,
    v_pair_done,
    (SELECT COUNT(*) FROM partner_invite_events pie JOIN partner_invites pi ON pi.id = pie.invite_id WHERE pi.created_by = v_user_id AND pie.event_type = 'booking_started' AND NOT pi.is_test_mode)::bigint,
    v_raw_score,
    v_adj_score,
    v_suspicious;
END;
$$;

-- 14. Create SMS relay creation RPC
CREATE OR REPLACE FUNCTION public.create_partner_sms_relay(
  p_invite_id uuid,
  p_phone_hash text,
  p_is_test_mode boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_relay_id uuid;
  v_cooldown_count int;
  v_trust_tier text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  v_is_admin := has_role(v_user_id, 'admin');

  -- Verify invite belongs to user
  IF NOT EXISTS (SELECT 1 FROM partner_invites WHERE id = p_invite_id AND created_by = v_user_id) THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Non-admin: check trust tier for relay access
  IF NOT v_is_admin THEN
    SELECT COALESCE(trust_tier, 'new') INTO v_trust_tier FROM profiles WHERE id = v_user_id;
    IF v_trust_tier NOT IN ('trusted', 'admin') THEN
      RAISE EXCEPTION 'relay_not_available';
    END IF;

    -- Cooldown: same recipient_hash within 24h
    SELECT COUNT(*) INTO v_cooldown_count
    FROM partner_invite_relays
    WHERE recipient_hash = p_phone_hash AND created_at > now() - interval '24 hours';
    IF v_cooldown_count > 0 THEN
      RAISE EXCEPTION 'relay_cooldown';
    END IF;
  END IF;

  INSERT INTO partner_invite_relays (invite_id, relay_type, recipient_hash, relay_status, is_test_mode)
  VALUES (p_invite_id, 'sms', p_phone_hash, 'pending', COALESCE(p_is_test_mode, false))
  RETURNING id INTO v_relay_id;

  RETURN v_relay_id;
END;
$$;

-- 15. Admin report with test_mode filter
CREATE OR REPLACE FUNCTION public.get_admin_partner_invite_report(
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_include_test_mode boolean DEFAULT false
)
RETURNS TABLE (
  invite_id uuid,
  created_at timestamptz,
  invite_type text,
  tone text,
  expires_at timestamptz,
  is_active boolean,
  status text,
  is_test_mode boolean,
  opens bigint,
  kit_cta bigint,
  booking_cta bigint,
  sessions_joined bigint,
  timer_completed bigint,
  bookings_completed bigint,
  selftest_requests bigint,
  accepted_count bigint,
  plans_to_test_count bigint,
  booked_count bigint,
  completed_count bigint,
  pair_status text,
  pair_booking_count integer,
  inviter_trust_tier text,
  abuse_flag_count bigint,
  sms_sent bigint,
  sms_failed bigint,
  sms_blocked bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;

  RETURN QUERY
  SELECT
    pi.id AS invite_id,
    pi.created_at,
    pi.invite_type,
    pi.tone,
    pi.expires_at,
    pi.is_active,
    pi.status,
    pi.is_test_mode,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'view'), 0) AS opens,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'cta_kit'), 0) AS kit_cta,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type IN ('cta_booking','booking_started')), 0) AS booking_cta,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'join_session'), 0) AS sessions_joined,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'timer_complete'), 0) AS timer_completed,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'booking_completed'), 0) AS bookings_completed,
    COALESCE((SELECT COUNT(*) FROM partner_invite_events e WHERE e.invite_id = pi.id AND e.event_type = 'selftest_requested'), 0) AS selftest_requests,
    COALESCE((SELECT COUNT(*) FROM partner_invite_responses r WHERE r.invite_id = pi.id AND r.response_state = 'accepted'), 0) AS accepted_count,
    COALESCE((SELECT COUNT(*) FROM partner_invite_responses r WHERE r.invite_id = pi.id AND r.response_state = 'plans_to_test'), 0) AS plans_to_test_count,
    COALESCE((SELECT COUNT(*) FROM partner_invite_responses r WHERE r.invite_id = pi.id AND r.response_state = 'booked'), 0) AS booked_count,
    COALESCE((SELECT COUNT(*) FROM partner_invite_responses r WHERE r.invite_id = pi.id AND r.response_state = 'completed'), 0) AS completed_count,
    pts.status AS pair_status,
    pts.pair_booking_count,
    COALESCE(prof.trust_tier, 'new') AS inviter_trust_tier,
    COALESCE((SELECT COUNT(*) FROM partner_invite_abuse_flags af WHERE af.invite_id = pi.id), 0) AS abuse_flag_count,
    COALESCE((SELECT COUNT(*) FROM partner_invite_relays rl WHERE rl.invite_id = pi.id AND rl.relay_status = 'sent'), 0) AS sms_sent,
    COALESCE((SELECT COUNT(*) FROM partner_invite_relays rl WHERE rl.invite_id = pi.id AND rl.relay_status = 'failed'), 0) AS sms_failed,
    COALESCE((SELECT COUNT(*) FROM partner_invite_relays rl WHERE rl.invite_id = pi.id AND rl.relay_status = 'blocked'), 0) AS sms_blocked
  FROM partner_invites pi
  LEFT JOIN partner_test_sessions pts ON pts.host_invite_id = pi.id
  LEFT JOIN profiles prof ON prof.id = pi.created_by
  WHERE (p_include_test_mode OR NOT pi.is_test_mode)
    AND (p_start_date IS NULL OR pi.created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR pi.created_at <= (p_end_date::date + interval '1 day'))
  ORDER BY pi.created_at DESC;
END;
$$;

-- 16. Realtime for partner_invite_relays
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_invite_relays;

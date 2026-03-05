
-- Partner Invites
CREATE TABLE public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  invite_type text NOT NULL DEFAULT 'link',
  tone text NOT NULL DEFAULT 'routine',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_invites_code ON public.partner_invites(code);
CREATE INDEX idx_partner_invites_created_by ON public.partner_invites(created_by);

-- Partner Invite Visits
CREATE TABLE public.partner_invite_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.partner_invites(id) ON DELETE CASCADE,
  visitor_session_id text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);

CREATE INDEX idx_partner_invite_visits_invite ON public.partner_invite_visits(invite_id);

-- Partner Invite Events
CREATE TABLE public.partner_invite_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.partner_invites(id) ON DELETE CASCADE,
  visitor_session_id text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_invite_events_invite ON public.partner_invite_events(invite_id, event_type, created_at);

-- Partner Test Sessions
CREATE TABLE public.partner_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_invite_id uuid NOT NULL REFERENCES public.partner_invites(id) ON DELETE CASCADE,
  session_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting',
  max_participants int NOT NULL DEFAULT 2,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_test_sessions_code ON public.partner_test_sessions(session_code);

-- Partner Test Session Participants
CREATE TABLE public.partner_test_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.partner_test_sessions(id) ON DELETE CASCADE,
  participant_session_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invite_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invite_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_test_session_participants ENABLE ROW LEVEL SECURITY;

-- partner_invites policies
CREATE POLICY "Public can read active invites by code" ON public.partner_invites
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can insert own invites" ON public.partner_invites
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can read own invites" ON public.partner_invites
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can read all invites" ON public.partner_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- partner_invite_visits: public insert, no public select
CREATE POLICY "Anyone can insert visit" ON public.partner_invite_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read visits" ON public.partner_invite_visits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- partner_invite_events: public insert, no public select
CREATE POLICY "Anyone can insert event" ON public.partner_invite_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read events" ON public.partner_invite_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- partner_test_sessions: public read by code
CREATE POLICY "Public can read sessions by code" ON public.partner_test_sessions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage sessions" ON public.partner_test_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert sessions" ON public.partner_test_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update session status" ON public.partner_test_sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- partner_test_session_participants: public insert + read
CREATE POLICY "Anyone can join session" ON public.partner_test_session_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read participants" ON public.partner_test_session_participants
  FOR SELECT TO anon, authenticated
  USING (true);

-- RPC: create_partner_invite
CREATE OR REPLACE FUNCTION public.create_partner_invite(
  p_invite_type text,
  p_tone text
)
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

  -- Generate unique code
  LOOP
    v_code := '';
    FOR v_i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM partner_invites WHERE code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
  END LOOP;

  INSERT INTO partner_invites (created_by, code, invite_type, tone)
  VALUES (v_user_id, v_code, p_invite_type, p_tone)
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

-- RPC: record_partner_invite_event (SECURITY DEFINER, rate-limited)
CREATE OR REPLACE FUNCTION public.record_partner_invite_event(
  p_code text,
  p_visitor_session_id text,
  p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite_id uuid;
  v_count int;
BEGIN
  IF p_event_type NOT IN ('view', 'cta_kit', 'cta_booking', 'join_session', 'timer_start', 'timer_complete') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  SELECT id INTO v_invite_id FROM partner_invites
  WHERE code = p_code AND is_active = true AND expires_at > now();

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found or expired';
  END IF;

  -- Rate limit: max 30 events per session per hour
  SELECT COUNT(*) INTO v_count FROM partner_invite_events
  WHERE invite_id = v_invite_id AND visitor_session_id = p_visitor_session_id
    AND created_at > now() - interval '1 hour';

  IF v_count >= 30 THEN
    RETURN; -- silently drop
  END IF;

  INSERT INTO partner_invite_events (invite_id, visitor_session_id, event_type)
  VALUES (v_invite_id, p_visitor_session_id, p_event_type);

  -- Record visit if first time
  IF NOT EXISTS (
    SELECT 1 FROM partner_invite_visits
    WHERE invite_id = v_invite_id AND visitor_session_id = p_visitor_session_id
  ) THEN
    INSERT INTO partner_invite_visits (invite_id, visitor_session_id, user_agent)
    VALUES (v_invite_id, p_visitor_session_id, NULL);
  END IF;
END;
$$;

-- RPC: get_partner_invite_stats (for current user)
CREATE OR REPLACE FUNCTION public.get_partner_invite_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_invites_created int;
  v_invites_opened int;
  v_kit_cta int;
  v_booking_cta int;
  v_sessions_joined int;
  v_timer_completed int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COUNT(*) INTO v_invites_created FROM partner_invites WHERE created_by = v_user_id;

  SELECT COUNT(DISTINCT piv.invite_id) INTO v_invites_opened
  FROM partner_invite_visits piv
  JOIN partner_invites pi ON pi.id = piv.invite_id
  WHERE pi.created_by = v_user_id;

  SELECT COUNT(*) INTO v_kit_cta FROM partner_invite_events pie
  JOIN partner_invites pi ON pi.id = pie.invite_id
  WHERE pi.created_by = v_user_id AND pie.event_type = 'cta_kit';

  SELECT COUNT(*) INTO v_booking_cta FROM partner_invite_events pie
  JOIN partner_invites pi ON pi.id = pie.invite_id
  WHERE pi.created_by = v_user_id AND pie.event_type = 'cta_booking';

  SELECT COUNT(*) INTO v_sessions_joined FROM partner_invite_events pie
  JOIN partner_invites pi ON pi.id = pie.invite_id
  WHERE pi.created_by = v_user_id AND pie.event_type = 'join_session';

  SELECT COUNT(*) INTO v_timer_completed FROM partner_invite_events pie
  JOIN partner_invites pi ON pi.id = pie.invite_id
  WHERE pi.created_by = v_user_id AND pie.event_type = 'timer_complete';

  RETURN jsonb_build_object(
    'invites_created', v_invites_created,
    'invites_opened', v_invites_opened,
    'kit_cta', v_kit_cta,
    'booking_cta', v_booking_cta,
    'sessions_joined', v_sessions_joined,
    'timer_completed', v_timer_completed
  );
END;
$$;

-- RPC: get_admin_partner_invite_report (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_partner_invite_report(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  invite_id uuid,
  created_at timestamptz,
  invite_type text,
  tone text,
  expires_at timestamptz,
  is_active boolean,
  opens bigint,
  kit_cta bigint,
  booking_cta bigint,
  sessions_joined bigint,
  timer_completed bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    pi.id AS invite_id,
    pi.created_at,
    pi.invite_type,
    pi.tone,
    pi.expires_at,
    pi.is_active,
    (SELECT COUNT(DISTINCT piv.id) FROM partner_invite_visits piv WHERE piv.invite_id = pi.id) AS opens,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'cta_kit') AS kit_cta,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'cta_booking') AS booking_cta,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'join_session') AS sessions_joined,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'timer_complete') AS timer_completed
  FROM partner_invites pi
  WHERE (p_start_date IS NULL OR pi.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR pi.created_at::date <= p_end_date)
  ORDER BY pi.created_at DESC;
END;
$$;

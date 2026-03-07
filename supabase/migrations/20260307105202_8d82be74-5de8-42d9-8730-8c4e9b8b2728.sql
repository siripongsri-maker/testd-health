
-- Drop and recreate admin report function with new return type
DROP FUNCTION IF EXISTS public.get_admin_partner_invite_report(date, date);

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
  status text,
  opens bigint,
  kit_cta bigint,
  booking_cta bigint,
  sessions_joined bigint,
  timer_completed bigint,
  bookings_completed bigint,
  selftest_requests bigint
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
    pi.status,
    (SELECT COUNT(DISTINCT piv.visitor_session_id) FROM partner_invite_visits piv WHERE piv.invite_id = pi.id) AS opens,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'cta_kit') AS kit_cta,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type IN ('cta_booking', 'booking_started')) AS booking_cta,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'join_session') AS sessions_joined,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'timer_complete') AS timer_completed,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'booking_completed') AS bookings_completed,
    (SELECT COUNT(*) FROM partner_invite_events pie WHERE pie.invite_id = pi.id AND pie.event_type = 'selftest_requested') AS selftest_requests
  FROM partner_invites pi
  WHERE (p_start_date IS NULL OR pi.created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR pi.created_at::date <= p_end_date)
  ORDER BY pi.created_at DESC;
END;
$$;

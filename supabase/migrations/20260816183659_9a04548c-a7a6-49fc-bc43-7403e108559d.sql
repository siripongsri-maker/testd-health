
CREATE OR REPLACE FUNCTION public.get_ops_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_now_time time := (now() AT TIME ZONE 'Asia/Bangkok')::time;
  v_week_start date := v_today - ((EXTRACT(ISODOW FROM v_today)::int) - 1);
  v_prev_week_start date := v_week_start - 7;
  v_result jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.has_role(auth.uid(), 'me_analyst'::app_role)
    OR public.has_role(auth.uid(), 'outreach_staff'::app_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'today_date', v_today,

    'today', (
      SELECT jsonb_build_object(
        'total', count(*),
        'remaining', count(*) FILTER (WHERE a.status = 'booked' AND a.start_time >= v_now_time),
        'overdue', count(*) FILTER (WHERE a.status = 'booked' AND a.start_time < v_now_time),
        'in_service', count(*) FILTER (WHERE a.arrived_at IS NOT NULL AND a.checked_out_at IS NULL AND a.status NOT IN ('cancelled','no_show')),
        'done', count(*) FILTER (WHERE a.status IN ('completed','checked_out')),
        'cancelled', count(*) FILTER (WHERE a.status = 'cancelled'),
        'no_show', count(*) FILTER (WHERE a.status = 'no_show'),
        'walkins', count(*) FILTER (WHERE a.source = 'walkin')
      )
      FROM appointments a WHERE a.appointment_date = v_today
    ),

    'next7', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'date')
      FROM (
        SELECT jsonb_build_object(
          'date', d::date,
          'dow', EXTRACT(ISODOW FROM d)::int,
          'total', COALESCE(t.total, 0),
          'morning', COALESCE(t.morning, 0),
          'afternoon', COALESCE(t.afternoon, 0),
          'evening', COALESCE(t.evening, 0),
          'peak_hour', t.peak_hour,
          'blocked', EXISTS (
            SELECT 1 FROM booking_blackouts bb
            WHERE d::date BETWEEN (bb.start_at AT TIME ZONE 'Asia/Bangkok')::date
                              AND (COALESCE(bb.end_at, bb.start_at) AT TIME ZONE 'Asia/Bangkok')::date
          )
        ) AS x
        FROM generate_series(v_today, v_today + 6, interval '1 day') d
        LEFT JOIN LATERAL (
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE a.start_time < time '12:00') AS morning,
                 count(*) FILTER (WHERE a.start_time >= time '12:00' AND a.start_time < time '16:00') AS afternoon,
                 count(*) FILTER (WHERE a.start_time >= time '16:00') AS evening,
                 (SELECT to_char(a2.start_time, 'HH24:MI') FROM appointments a2
                   WHERE a2.appointment_date = d::date AND a2.status <> 'cancelled'
                   GROUP BY a2.start_time ORDER BY count(*) DESC, a2.start_time LIMIT 1) AS peak_hour
          FROM appointments a
          WHERE a.appointment_date = d::date AND a.status <> 'cancelled'
        ) t ON TRUE
      ) s
    ), '[]'::jsonb),

    'branch_load', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'branch_id', b.id,
        'name_th', b.name_th,
        'name_en', b.name_en,
        'today', COALESCE(c.today, 0),
        'next7', COALESCE(c.next7, 0)
      ) ORDER BY COALESCE(c.next7,0) DESC)
      FROM booking_branches b
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE a.appointment_date = v_today) AS today,
               count(*) FILTER (WHERE a.appointment_date BETWEEN v_today AND v_today + 6) AS next7
        FROM appointments a
        WHERE a.branch_id = b.id AND a.status <> 'cancelled'
      ) c ON TRUE
      WHERE COALESCE(b.is_active, true)
    ), '[]'::jsonb),

    'week', jsonb_build_object(
      'start', v_week_start,
      'current', (
        SELECT jsonb_build_object(
          'bookings', count(*),
          'done', count(*) FILTER (WHERE a.status IN ('completed','checked_out')),
          'no_show', count(*) FILTER (WHERE a.status = 'no_show'),
          'cancelled', count(*) FILTER (WHERE a.status = 'cancelled'),
          'walkins', count(*) FILTER (WHERE a.source = 'walkin')
        ) FROM appointments a
        WHERE a.appointment_date BETWEEN v_week_start AND v_week_start + 6
      ),
      'previous', (
        SELECT jsonb_build_object(
          'bookings', count(*),
          'done', count(*) FILTER (WHERE a.status IN ('completed','checked_out')),
          'no_show', count(*) FILTER (WHERE a.status = 'no_show'),
          'cancelled', count(*) FILTER (WHERE a.status = 'cancelled'),
          'walkins', count(*) FILTER (WHERE a.source = 'walkin')
        ) FROM appointments a
        WHERE a.appointment_date BETWEEN v_prev_week_start AND v_prev_week_start + 6
      ),
      'kits_current', (SELECT count(*) FROM hiv_selftest_requests r
        WHERE (r.created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN v_week_start AND v_week_start + 6),
      'kits_previous', (SELECT count(*) FROM hiv_selftest_requests r
        WHERE (r.created_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN v_prev_week_start AND v_prev_week_start + 6)
    ),

    'daily_series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', d::date,
        'booked', COALESCE(a.cnt, 0),
        'done', COALESCE(a.done, 0),
        'no_show', COALESCE(a.ns, 0),
        'kits', COALESCE(k.cnt, 0)
      ) ORDER BY d)
      FROM generate_series(v_today - 13, v_today, interval '1 day') d
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt,
               count(*) FILTER (WHERE ap.status IN ('completed','checked_out')) AS done,
               count(*) FILTER (WHERE ap.status = 'no_show') AS ns
        FROM appointments ap WHERE ap.appointment_date = d::date
      ) a ON TRUE
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt FROM hiv_selftest_requests r
        WHERE (r.created_at AT TIME ZONE 'Asia/Bangkok')::date = d::date
      ) k ON TRUE
    ), '[]'::jsonb),

    'kits', (
      SELECT jsonb_build_object(
        'pending', count(*) FILTER (WHERE r.status IN ('pending','approved','requested')),
        'shipped', count(*) FILTER (WHERE r.status IN ('shipped','out_for_delivery')),
        'delivered_waiting_result', count(*) FILTER (WHERE r.status IN ('delivered','received','confirmed')),
        'result_submitted_7d', count(*) FILTER (WHERE r.status = 'result_submitted' AND r.updated_at > now() - interval '7 days'),
        'new_today', count(*) FILTER (WHERE (r.created_at AT TIME ZONE 'Asia/Bangkok')::date = v_today)
      ) FROM hiv_selftest_requests r
    ),

    'actions', jsonb_build_object(
      'kits_to_pack', (SELECT count(*) FROM hiv_selftest_requests WHERE status IN ('pending','approved','requested')),
      'kits_stuck_shipped', (SELECT count(*) FROM hiv_selftest_requests WHERE status IN ('shipped','out_for_delivery') AND updated_at < now() - interval '7 days'),
      'payouts_pending', (SELECT count(*) FROM counseling_payout_claims WHERE status IN ('pending','submitted','approved')),
      'open_chats', (SELECT count(*) FROM direct_chat_threads WHERE COALESCE(status,'open') = 'open'),
      'tomorrow_bookings', (SELECT count(*) FROM appointments WHERE appointment_date = v_today + 1 AND status = 'booked')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

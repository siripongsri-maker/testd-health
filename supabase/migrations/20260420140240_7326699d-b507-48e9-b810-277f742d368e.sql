CREATE OR REPLACE FUNCTION public.get_forecast_signals(
  p_branch_id uuid DEFAULT NULL,
  p_history_days int DEFAULT 120,
  p_source_filter text DEFAULT 'all' -- 'all' | 'appointment' | 'walkin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_today_bkk date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_since date := v_today_bkk - p_history_days;
BEGIN
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'moderator') OR has_role(v_user_id, 'outreach_staff')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH base AS (
    SELECT
      a.id,
      a.branch_id,
      a.appointment_date,
      a.start_time,
      a.status,
      a.source,
      a.checkout_method,
      a.completed_at,
      a.checked_out_at,
      a.cancelled_at,
      EXTRACT(ISODOW FROM a.appointment_date)::int AS dow,
      EXTRACT(HOUR FROM a.start_time)::int AS appt_hour
    FROM appointments a
    WHERE a.appointment_date >= v_since
      AND a.appointment_date <= v_today_bkk + 14 -- include near-future appointments (backlog)
      AND (p_branch_id IS NULL OR a.branch_id = p_branch_id)
      AND (
        p_source_filter = 'all'
        OR (p_source_filter = 'appointment' AND a.source = 'appointment')
        OR (p_source_filter = 'walkin' AND a.source IN ('walkin','walk_in'))
      )
  ),
  daily_history AS (
    SELECT
      appointment_date AS d,
      dow,
      count(*) FILTER (WHERE status NOT IN ('cancelled')) AS arrivals,
      count(*) FILTER (WHERE status IN ('completed','checked_out')) AS completed,
      count(*) FILTER (WHERE status = 'no_show') AS no_show,
      count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      count(*) FILTER (WHERE source IN ('walkin','walk_in') AND status NOT IN ('cancelled')) AS walkins,
      count(*) FILTER (WHERE source = 'appointment' AND status NOT IN ('cancelled')) AS appts
    FROM base
    WHERE appointment_date <= v_today_bkk
    GROUP BY appointment_date, dow
  ),
  weekday_baseline AS (
    SELECT
      dow,
      ROUND(AVG(arrivals)::numeric, 2) AS avg_arrivals,
      ROUND(AVG(completed)::numeric, 2) AS avg_completed,
      ROUND(STDDEV_SAMP(arrivals)::numeric, 2) AS std_arrivals,
      MAX(arrivals) AS max_arrivals,
      count(*) AS sample_size
    FROM daily_history
    WHERE d < v_today_bkk -- exclude today
    GROUP BY dow
  ),
  hourly_baseline AS (
    SELECT
      dow,
      appt_hour AS hour,
      count(*) AS n
    FROM base
    WHERE appointment_date < v_today_bkk
      AND appointment_date >= v_today_bkk - 60
      AND status NOT IN ('cancelled')
    GROUP BY dow, appt_hour
  ),
  -- Future backlog: appointments already booked for today and forward
  future_backlog AS (
    SELECT
      appointment_date AS d,
      count(*) AS booked
    FROM base
    WHERE appointment_date >= v_today_bkk
      AND status NOT IN ('cancelled')
      AND source = 'appointment'
    GROUP BY appointment_date
  ),
  rolling_stats AS (
    SELECT
      ROUND(AVG(arrivals) FILTER (WHERE d >= v_today_bkk - 7 AND d < v_today_bkk)::numeric, 2) AS ma7_arrivals,
      ROUND(AVG(arrivals) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk)::numeric, 2) AS ma30_arrivals,
      ROUND(AVG(arrivals) FILTER (WHERE d >= v_today_bkk - 90 AND d < v_today_bkk)::numeric, 2) AS ma90_arrivals,
      ROUND(AVG(completed) FILTER (WHERE d >= v_today_bkk - 7 AND d < v_today_bkk)::numeric, 2) AS ma7_completed,
      ROUND(AVG(completed) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk)::numeric, 2) AS ma30_completed,
      -- completion rate = completed / arrivals
      ROUND(
        (SUM(completed) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk)::numeric
         / NULLIF(SUM(arrivals) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk), 0))
      , 3) AS completion_rate_30d,
      -- no-show rate
      ROUND(
        (SUM(no_show) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk)::numeric
         / NULLIF(SUM(arrivals + no_show) FILTER (WHERE d >= v_today_bkk - 30 AND d < v_today_bkk), 0))
      , 3) AS no_show_rate_30d,
      -- walk-in mix
      ROUND(
        (SUM(walkins) FILTER (WHERE d >= v_today_bkk - 14 AND d < v_today_bkk)::numeric
         / NULLIF(SUM(arrivals) FILTER (WHERE d >= v_today_bkk - 14 AND d < v_today_bkk), 0))
      , 3) AS walkin_share_14d,
      count(*) FILTER (WHERE d < v_today_bkk) AS history_days_count
    FROM daily_history
  )
  SELECT jsonb_build_object(
    'today_bkk', v_today_bkk,
    'history_days_count', (SELECT history_days_count FROM rolling_stats),
    'rolling', (SELECT to_jsonb(rs) FROM rolling_stats rs),
    'daily_history', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'date', d,
          'dow', dow,
          'arrivals', arrivals,
          'completed', completed,
          'no_show', no_show,
          'cancelled', cancelled,
          'walkins', walkins,
          'appts', appts
        ) ORDER BY d)
      FROM daily_history),
      '[]'::jsonb
    ),
    'weekday_baseline', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'dow', dow,
          'avg_arrivals', avg_arrivals,
          'avg_completed', avg_completed,
          'std_arrivals', std_arrivals,
          'max_arrivals', max_arrivals,
          'sample_size', sample_size
        ) ORDER BY dow)
      FROM weekday_baseline),
      '[]'::jsonb
    ),
    'hourly_baseline', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'n', n))
      FROM hourly_baseline),
      '[]'::jsonb
    ),
    'future_backlog', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('date', d, 'booked', booked) ORDER BY d)
      FROM future_backlog),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
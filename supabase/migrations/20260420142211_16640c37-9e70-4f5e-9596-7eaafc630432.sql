-- Create lightweight public-safe RPC returning weekday×hour demand patterns
-- and busy day rankings per branch. Used by /booking frontend Smart Forecast.
-- No PII, no operational data — only aggregate booking counts from last 90 days.

CREATE OR REPLACE FUNCTION public.get_public_demand_hints(
  p_branch_id uuid,
  p_horizon_days int DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_history_start date := v_today - INTERVAL '90 days';
  v_result jsonb;
  v_weekday_hour jsonb;
  v_weekday_totals jsonb;
  v_hour_totals jsonb;
  v_future_load jsonb;
  v_sample_size int;
BEGIN
  IF p_branch_id IS NULL THEN
    RETURN jsonb_build_object('error', 'branch_required');
  END IF;

  -- 1. Aggregate counts by weekday (1=Mon..7=Sun) × hour
  SELECT jsonb_agg(jsonb_build_object(
    'dow', dow,
    'hour', hour_bucket,
    'n', n
  ))
  INTO v_weekday_hour
  FROM (
    SELECT
      EXTRACT(ISODOW FROM appointment_date)::int AS dow,
      EXTRACT(HOUR FROM start_time)::int AS hour_bucket,
      COUNT(*)::int AS n
    FROM appointments
    WHERE branch_id = p_branch_id
      AND appointment_date >= v_history_start
      AND appointment_date < v_today
      AND status NOT IN ('cancelled', 'no_show')
    GROUP BY dow, hour_bucket
  ) sub;

  -- 2. Total per weekday (for ranking busy days)
  SELECT jsonb_agg(jsonb_build_object(
    'dow', dow,
    'avg_per_day', avg_per_day,
    'sample_days', sample_days
  ))
  INTO v_weekday_totals
  FROM (
    SELECT
      EXTRACT(ISODOW FROM appointment_date)::int AS dow,
      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT appointment_date), 0), 2) AS avg_per_day,
      COUNT(DISTINCT appointment_date)::int AS sample_days
    FROM appointments
    WHERE branch_id = p_branch_id
      AND appointment_date >= v_history_start
      AND appointment_date < v_today
      AND status NOT IN ('cancelled', 'no_show')
    GROUP BY dow
  ) sub;

  -- 3. Hour totals across all weekdays (overall peak hours)
  SELECT jsonb_agg(jsonb_build_object(
    'hour', hour_bucket,
    'n', n
  ))
  INTO v_hour_totals
  FROM (
    SELECT
      EXTRACT(HOUR FROM start_time)::int AS hour_bucket,
      COUNT(*)::int AS n
    FROM appointments
    WHERE branch_id = p_branch_id
      AND appointment_date >= v_history_start
      AND appointment_date < v_today
      AND status NOT IN ('cancelled', 'no_show')
    GROUP BY hour_bucket
  ) sub;

  -- 4. Forward-looking booking load per future date (for calendar hints)
  SELECT jsonb_agg(jsonb_build_object(
    'date', appointment_date,
    'booked', n
  ))
  INTO v_future_load
  FROM (
    SELECT
      appointment_date,
      COUNT(*)::int AS n
    FROM appointments
    WHERE branch_id = p_branch_id
      AND appointment_date >= v_today
      AND appointment_date <= v_today + (p_horizon_days || ' days')::interval
      AND status NOT IN ('cancelled', 'no_show')
    GROUP BY appointment_date
  ) sub;

  -- 5. Sample size sanity (used to lower confidence)
  SELECT COUNT(*)::int INTO v_sample_size
  FROM appointments
  WHERE branch_id = p_branch_id
    AND appointment_date >= v_history_start
    AND appointment_date < v_today
    AND status NOT IN ('cancelled', 'no_show');

  v_result := jsonb_build_object(
    'today_bkk', v_today,
    'history_window_days', 90,
    'sample_size', v_sample_size,
    'weekday_hour', COALESCE(v_weekday_hour, '[]'::jsonb),
    'weekday_totals', COALESCE(v_weekday_totals, '[]'::jsonb),
    'hour_totals', COALESCE(v_hour_totals, '[]'::jsonb),
    'future_load', COALESCE(v_future_load, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- Allow anonymous + authenticated to call (public-safe payload only)
GRANT EXECUTE ON FUNCTION public.get_public_demand_hints(uuid, int) TO anon, authenticated;
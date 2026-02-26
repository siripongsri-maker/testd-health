
-- Drop wrapper first, then the underlying function, then recreate both
DROP FUNCTION IF EXISTS public.get_available_slots(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_available_slots_dbg(UUID, DATE, BOOLEAN);

-- Recreate get_available_slots_dbg with today-filtering
CREATE OR REPLACE FUNCTION public.get_available_slots_dbg(
  p_branch_id UUID,
  p_date DATE,
  p_debug BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT,
  day_is_closed BOOLEAN,
  closure_title TEXT,
  closure_reason TEXT,
  dbg_slot_start TIMESTAMPTZ,
  dbg_slot_end TIMESTAMPTZ,
  dbg_blackout_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_open_time TIME;
  v_close_time TIME;
  v_slot_minutes INTEGER;
  v_capacity INTEGER;
  v_is_open BOOLEAN;
  v_day_start_ts TIMESTAMPTZ;
  v_day_end_ts TIMESTAMPTZ;
  v_working_start_ts TIMESTAMPTZ;
  v_working_end_ts TIMESTAMPTZ;
  v_current_local_ts TIMESTAMP;
  v_end_local_ts TIMESTAMP;
  v_next_local_ts TIMESTAMP;
  v_slot_start_ts TIMESTAMPTZ;
  v_slot_end_ts TIMESTAMPTZ;
  v_booked INTEGER;
  v_blackout_title TEXT;
  v_blackout_id UUID;
  v_closure_title TEXT;
  v_closure_reason TEXT;
  v_bangkok_now TIMESTAMP;
  v_bangkok_today DATE;
  v_is_today BOOLEAN;
BEGIN
  v_bangkok_now := (now() AT TIME ZONE 'Asia/Bangkok');
  v_bangkok_today := v_bangkok_now::DATE;
  v_is_today := (p_date = v_bangkok_today);

  -- Block past dates entirely
  IF p_date < v_bangkok_today THEN
    RETURN;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- 1) Working hours
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM public.branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_day_of_week;

  IF NOT FOUND THEN
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes, bb.counselor_count
    INTO v_open_time, v_close_time, v_slot_minutes, v_capacity
    FROM public.booking_branches bb
    WHERE bb.id = p_branch_id AND bb.is_active = true;

    IF NOT FOUND THEN RETURN; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.booking_branches bb
      WHERE bb.id = p_branch_id AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN QUERY SELECT NULL::TIME, 0, COALESCE(v_capacity, 0), FALSE, NULL::TEXT, TRUE, 'Closed day'::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
      RETURN;
    END IF;
    v_is_open := TRUE;
  ELSIF NOT v_is_open THEN
    SELECT bb.counselor_count INTO v_capacity FROM public.booking_branches bb WHERE bb.id = p_branch_id;
    RETURN QUERY SELECT NULL::TIME, 0, COALESCE(v_capacity, 0), FALSE, NULL::TEXT, TRUE, 'Closed day'::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  SELECT bb.counselor_count INTO v_capacity FROM public.booking_branches bb WHERE bb.id = p_branch_id;
  IF v_capacity IS NULL THEN RETURN; END IF;

  v_day_start_ts := ((p_date::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_day_end_ts := v_day_start_ts + INTERVAL '1 day';
  v_working_start_ts := ((p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_working_end_ts := ((p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  IF v_working_end_ts <= v_working_start_ts THEN v_working_end_ts := v_working_end_ts + INTERVAL '1 day'; END IF;

  -- 2) Full-day closure check
  SELECT bo.title, bo.reason INTO v_closure_title, v_closure_reason
  FROM public.booking_blackouts bo
  WHERE (bo.scope = 'global' OR (bo.scope = 'branch' AND bo.applies_to_branch_ids IS NOT NULL AND p_branch_id = ANY(bo.applies_to_branch_ids)))
    AND ((bo.is_all_day = TRUE AND bo.start_at < v_day_end_ts AND bo.end_at > v_day_start_ts) OR (bo.start_at <= v_working_start_ts AND bo.end_at >= v_working_end_ts))
  ORDER BY bo.start_at ASC LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT NULL::TIME, 0, v_capacity, FALSE, v_closure_title, TRUE, v_closure_title, v_closure_reason, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  -- 3) Generate slots
  v_current_local_ts := (p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP;
  v_end_local_ts := (p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP;
  IF v_end_local_ts <= v_current_local_ts THEN v_end_local_ts := v_end_local_ts + INTERVAL '1 day'; END IF;

  WHILE v_current_local_ts < v_end_local_ts LOOP
    v_next_local_ts := v_current_local_ts + make_interval(mins => COALESCE(v_slot_minutes, 60));

    -- Skip past slots on today
    IF v_is_today AND v_current_local_ts::TIME <= v_bangkok_now::TIME THEN
      v_current_local_ts := v_next_local_ts;
      CONTINUE;
    END IF;

    v_slot_start_ts := (v_current_local_ts AT TIME ZONE 'Asia/Bangkok');
    v_slot_end_ts := v_slot_start_ts + make_interval(mins => COALESCE(v_slot_minutes, 60));

    v_blackout_title := NULL;
    v_blackout_id := NULL;

    SELECT bo.id, bo.title INTO v_blackout_id, v_blackout_title
    FROM public.booking_blackouts bo
    WHERE (bo.scope = 'global' OR (bo.scope = 'branch' AND bo.applies_to_branch_ids IS NOT NULL AND p_branch_id = ANY(bo.applies_to_branch_ids)))
      AND bo.start_at < v_slot_end_ts AND bo.end_at > v_slot_start_ts
    ORDER BY bo.start_at ASC LIMIT 1;

    SELECT COUNT(*)::INTEGER INTO v_booked
    FROM public.appointments a
    WHERE a.branch_id = p_branch_id AND a.appointment_date = p_date
      AND a.start_time = v_current_local_ts::TIME AND a.status NOT IN ('cancelled', 'no_show');

    RETURN QUERY SELECT
      v_current_local_ts::TIME, v_booked, v_capacity,
      (v_blackout_title IS NULL AND v_booked < v_capacity),
      v_blackout_title, FALSE, NULL::TEXT, NULL::TEXT,
      CASE WHEN p_debug THEN v_slot_start_ts ELSE NULL::TIMESTAMPTZ END,
      CASE WHEN p_debug THEN v_slot_end_ts ELSE NULL::TIMESTAMPTZ END,
      CASE WHEN p_debug THEN v_blackout_id ELSE NULL::UUID END;

    v_current_local_ts := v_next_local_ts;
  END LOOP;
END;
$$;

-- Recreate the wrapper
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_branch_id UUID,
  p_date DATE
) RETURNS TABLE (
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT,
  day_is_closed BOOLEAN,
  closure_title TEXT,
  closure_reason TEXT,
  dbg_slot_start TIMESTAMPTZ,
  dbg_slot_end TIMESTAMPTZ,
  dbg_blackout_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.get_available_slots_dbg(p_branch_id, p_date, FALSE);
END;
$$;

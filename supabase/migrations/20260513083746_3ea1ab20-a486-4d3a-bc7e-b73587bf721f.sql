CREATE OR REPLACE FUNCTION public.get_available_slots_dbg(p_branch_id uuid, p_date date, p_debug boolean DEFAULT false)
 RETURNS TABLE(slot_time time without time zone, booked_count integer, capacity integer, is_available boolean, blackout_title text, day_is_closed boolean, closure_title text, closure_reason text, dbg_slot_start timestamp with time zone, dbg_slot_end timestamp with time zone, dbg_blackout_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_opens_on DATE;
  v_daily_cap INTEGER;
  v_daily_cap_reason TEXT;
  v_day_total_booked INTEGER;
BEGIN
  -- Daily cap gate (soft-launch limited capacity).
  -- Count every appointment that consumed a slot today (only true cancellations free a seat).
  -- No-shows still count toward the daily cap so the day stays closed once the limit is reached.
  SELECT max_bookings, reason INTO v_daily_cap, v_daily_cap_reason
  FROM public.booking_daily_caps
  WHERE branch_id = p_branch_id AND cap_date = p_date
  LIMIT 1;

  IF v_daily_cap IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_day_total_booked
    FROM public.appointments a
    WHERE a.branch_id = p_branch_id
      AND a.appointment_date = p_date
      AND a.status <> 'cancelled';

    IF v_day_total_booked >= v_daily_cap THEN
      RETURN QUERY SELECT NULL::TIME, v_day_total_booked, v_daily_cap, FALSE, NULL::TEXT, TRUE,
        'เต็มแล้ว / Fully booked'::TEXT,
        COALESCE(v_daily_cap_reason, 'Limited capacity event')::TEXT,
        NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  -- Branch-level opens_on gate
  SELECT bb.opens_on INTO v_opens_on FROM public.booking_branches bb WHERE bb.id = p_branch_id;
  IF v_opens_on IS NOT NULL AND p_date < v_opens_on THEN
    RETURN QUERY SELECT NULL::TIME, 0, 0, FALSE, NULL::TEXT, TRUE,
      ('Opens ' || to_char(v_opens_on, 'DD Mon YYYY'))::TEXT,
      NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

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
  ELSE
    IF NOT v_is_open THEN
      RETURN QUERY SELECT NULL::TIME, 0, 0, FALSE, NULL::TEXT, TRUE, 'Closed day'::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
      RETURN;
    END IF;
    SELECT bb.counselor_count INTO v_capacity FROM public.booking_branches bb WHERE bb.id = p_branch_id;
  END IF;

  v_bangkok_now := (now() AT TIME ZONE 'Asia/Bangkok');
  v_bangkok_today := v_bangkok_now::DATE;
  v_is_today := (p_date = v_bangkok_today);

  v_working_start_ts := ((p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');
  v_working_end_ts := ((p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok');

  v_current_local_ts := (p_date::TEXT || ' ' || v_open_time::TEXT)::TIMESTAMP;
  v_end_local_ts := (p_date::TEXT || ' ' || v_close_time::TEXT)::TIMESTAMP;

  WHILE v_current_local_ts < v_end_local_ts LOOP
    v_next_local_ts := v_current_local_ts + make_interval(mins => v_slot_minutes);
    v_slot_start_ts := (v_current_local_ts::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    v_slot_end_ts := (v_next_local_ts::TEXT)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';

    v_blackout_title := NULL;
    v_blackout_id := NULL;

    SELECT bo.title, bo.id INTO v_blackout_title, v_blackout_id
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
$function$;
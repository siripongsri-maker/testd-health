-- Fix timezone handling in get_available_slots and check_slot_available RPCs
-- The issue: blackout times are stored in UTC (TIMESTAMPTZ), but slot comparisons
-- were using (p_date + time)::TIMESTAMPTZ which interprets in UTC session timezone.
-- Since this app operates in Asia/Bangkok (UTC+7), we need to compare correctly.

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_branch_id UUID,
  p_date DATE
)
RETURNS TABLE(
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT
)
LANGUAGE plpgsql
STABLE
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
  v_current_slot TIME;
  v_slot_end TIME;
  v_booked INTEGER;
  v_blackout_title TEXT;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Get working hours for this branch + day
  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_day_of_week;

  -- If no working hours configured, fall back to branch defaults
  IF NOT FOUND THEN
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes, bb.counselor_count
    INTO v_open_time, v_close_time, v_slot_minutes, v_capacity
    FROM booking_branches bb
    WHERE bb.id = p_branch_id AND bb.is_active = true;

    IF NOT FOUND THEN RETURN; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM booking_branches bb
      WHERE bb.id = p_branch_id AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN;
    END IF;

    v_is_open := true;
  ELSE
    IF NOT v_is_open THEN RETURN; END IF;
  END IF;

  -- Get capacity
  SELECT bb.counselor_count INTO v_capacity
  FROM booking_branches bb WHERE bb.id = p_branch_id;

  IF v_capacity IS NULL THEN RETURN; END IF;

  -- Generate slots
  v_current_slot := v_open_time;
  WHILE v_current_slot < v_close_time LOOP
    v_slot_end := v_current_slot + (v_slot_minutes || ' minutes')::INTERVAL;

    -- Check blackout overlap using Asia/Bangkok timezone
    v_blackout_title := NULL;
    SELECT bo.title INTO v_blackout_title
    FROM booking_blackouts bo
    WHERE bo.start_at < ((p_date || ' ' || v_slot_end)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok')
      AND bo.end_at > ((p_date || ' ' || v_current_slot)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok')
      AND (
        bo.scope = 'global'
        OR (bo.scope = 'branch' AND p_branch_id = ANY(bo.applies_to_branch_ids))
      )
    LIMIT 1;

    -- Count booked
    SELECT COUNT(*)::INTEGER INTO v_booked
    FROM appointments a
    WHERE a.branch_id = p_branch_id
      AND a.appointment_date = p_date
      AND a.start_time = v_current_slot
      AND a.status NOT IN ('cancelled', 'no_show');

    RETURN QUERY SELECT
      v_current_slot,
      v_booked,
      v_capacity,
      (v_blackout_title IS NULL AND v_booked < v_capacity),
      v_blackout_title;

    v_current_slot := v_current_slot + (v_slot_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;

-- Fix check_slot_available with same timezone fix
CREATE OR REPLACE FUNCTION public.check_slot_available(
  p_branch_id UUID,
  p_date DATE,
  p_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_of_week INTEGER;
  v_is_open BOOLEAN;
  v_open_time TIME;
  v_close_time TIME;
  v_slot_minutes INTEGER;
  v_slot_end TIME;
  v_has_blackout BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  SELECT bwh.is_open, bwh.open_time, bwh.close_time, bwh.slot_minutes
  INTO v_is_open, v_open_time, v_close_time, v_slot_minutes
  FROM branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_day_of_week;

  IF FOUND THEN
    IF NOT v_is_open THEN RETURN FALSE; END IF;
    IF p_time < v_open_time OR p_time >= v_close_time THEN RETURN FALSE; END IF;
  ELSE
    SELECT bb.open_time, bb.close_time, bb.slot_duration_minutes
    INTO v_open_time, v_close_time, v_slot_minutes
    FROM booking_branches bb WHERE bb.id = p_branch_id AND bb.is_active = true;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM booking_branches bb
      WHERE bb.id = p_branch_id AND v_day_of_week = ANY(bb.open_days)
    ) THEN
      RETURN FALSE;
    END IF;

    IF p_time < v_open_time OR p_time >= v_close_time THEN RETURN FALSE; END IF;
  END IF;

  v_slot_end := p_time + (COALESCE(v_slot_minutes, 60) || ' minutes')::INTERVAL;

  SELECT EXISTS (
    SELECT 1 FROM booking_blackouts bo
    WHERE bo.start_at < ((p_date || ' ' || v_slot_end)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok')
      AND bo.end_at > ((p_date || ' ' || p_time)::TIMESTAMP AT TIME ZONE 'Asia/Bangkok')
      AND (
        bo.scope = 'global'
        OR (bo.scope = 'branch' AND p_branch_id = ANY(bo.applies_to_branch_ids))
      )
  ) INTO v_has_blackout;

  IF v_has_blackout THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_cap_status(p_branch_id uuid, p_date date)
RETURNS TABLE (
  max_bookings integer,
  total_booked integer,
  remaining integer,
  reason text,
  open_time time,
  close_time time,
  is_open boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max integer;
  v_reason text;
  v_total integer;
  v_dow integer;
  v_open time;
  v_close time;
  v_is_open boolean;
BEGIN
  SELECT bdc.max_bookings, bdc.reason INTO v_max, v_reason
  FROM public.booking_daily_caps bdc
  WHERE bdc.branch_id = p_branch_id AND bdc.cap_date = p_date
  LIMIT 1;

  IF v_max IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::int INTO v_total
  FROM public.appointments a
  WHERE a.branch_id = p_branch_id
    AND a.appointment_date = p_date
    AND a.status NOT IN ('cancelled', 'no_show');

  v_dow := EXTRACT(DOW FROM p_date)::int;
  SELECT bwh.is_open, bwh.open_time, bwh.close_time
  INTO v_is_open, v_open, v_close
  FROM public.branch_working_hours bwh
  WHERE bwh.branch_id = p_branch_id AND bwh.day_of_week = v_dow;

  IF NOT FOUND THEN
    SELECT bb.open_time, bb.close_time INTO v_open, v_close
    FROM public.booking_branches bb WHERE bb.id = p_branch_id;
    v_is_open := true;
  END IF;

  RETURN QUERY SELECT v_max, v_total, GREATEST(v_max - v_total, 0), v_reason, v_open, v_close, v_is_open;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_cap_status(uuid, date) TO anon, authenticated;

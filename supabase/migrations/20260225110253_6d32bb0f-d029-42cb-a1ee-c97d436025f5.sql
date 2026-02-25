-- Fix ambiguous overloaded get_available_slots function signatures
-- Existing function with default param caused ambiguous resolution for (uuid, date)

ALTER FUNCTION public.get_available_slots(uuid, date, boolean)
RENAME TO get_available_slots_dbg;

DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date);

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_branch_id UUID,
  p_date DATE
)
RETURNS TABLE(
  slot_time TIME,
  booked_count INTEGER,
  capacity INTEGER,
  is_available BOOLEAN,
  blackout_title TEXT,
  day_is_closed BOOLEAN,
  closure_title TEXT,
  closure_reason TEXT,
  slot_start_ts TIMESTAMPTZ,
  slot_end_ts TIMESTAMPTZ,
  matched_blackout_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.get_available_slots_dbg(p_branch_id, p_date, FALSE)
$function$;
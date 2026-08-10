DROP VIEW IF EXISTS public.public_queue_visits;
DROP VIEW IF EXISTS public.public_queue_steps;

CREATE OR REPLACE FUNCTION public.get_public_queue_board(p_branch_id uuid)
RETURNS TABLE (
  step_id uuid,
  visit_id uuid,
  visit_code text,
  step_code text,
  step_status text,
  queue_code text,
  room_number integer,
  called_at timestamptz,
  entered_at timestamptz,
  is_completed boolean,
  is_cancelled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id, v.id, v.visit_code, s.step_code, s.step_status, s.queue_code,
         s.room_number, s.called_at, s.entered_at, v.is_completed, v.is_cancelled
  FROM public.client_visit_flow_steps s
  JOIN public.client_visit_flows v ON v.id = s.visit_id
  WHERE v.branch_id = p_branch_id
    AND s.branch_id = p_branch_id
    AND v.visit_date = ((now() AT TIME ZONE 'Asia/Bangkok'))::date
  ORDER BY s.entered_at DESC
$function$;

REVOKE ALL ON FUNCTION public.get_public_queue_board(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_queue_board(uuid) TO anon, authenticated;

-- Fix security definer view by dropping and recreating as security invoker
DROP VIEW IF EXISTS public.queue_tv_display;
CREATE VIEW public.queue_tv_display WITH (security_invoker = on) AS
SELECT
  s.id AS step_id,
  s.visit_id,
  s.branch_id,
  s.step_code,
  s.queue_code,
  s.room_number,
  s.step_status,
  s.called_at,
  v.visit_code,
  v.current_step,
  v.current_status
FROM client_visit_flow_steps s
JOIN client_visit_flows v ON v.id = s.visit_id
WHERE v.visit_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
  AND v.is_cancelled = false
  AND s.step_status IN ('waiting', 'called', 'in_service');

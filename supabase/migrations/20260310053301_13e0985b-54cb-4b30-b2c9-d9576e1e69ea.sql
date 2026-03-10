
-- Queue visit flow tables for branch service routing

-- 1. Branch queue flow settings
CREATE TABLE public.branch_queue_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.booking_branches(id) ON DELETE CASCADE,
  counselor_room_count integer NOT NULL DEFAULT 2,
  payment_enabled boolean NOT NULL DEFAULT false,
  queue_prefix text NOT NULL DEFAULT 'Q',
  tv_display_name text,
  active_steps text[] NOT NULL DEFAULT ARRAY['register','counselor','blood_collecting','specimen_collecting','waiting_result','notification_later','medicine','treatment','payment','completed'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- 2. Client visit flows
CREATE TABLE public.client_visit_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.booking_branches(id),
  appointment_id uuid REFERENCES public.appointments(id),
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_number integer NOT NULL,
  visit_code text NOT NULL,
  current_step text NOT NULL DEFAULT 'register',
  current_status text NOT NULL DEFAULT 'waiting',
  is_completed boolean NOT NULL DEFAULT false,
  is_cancelled boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_flows_branch_date ON public.client_visit_flows(branch_id, visit_date);
CREATE INDEX idx_visit_flows_code ON public.client_visit_flows(visit_code);

-- 3. Client visit flow steps
CREATE TABLE public.client_visit_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.client_visit_flows(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.booking_branches(id),
  step_code text NOT NULL,
  queue_number integer,
  queue_code text,
  room_number integer,
  assigned_staff_id uuid,
  step_status text NOT NULL DEFAULT 'waiting',
  entered_at timestamptz NOT NULL DEFAULT now(),
  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  routed_to_step_code text,
  route_note text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_steps_visit ON public.client_visit_flow_steps(visit_id);
CREATE INDEX idx_visit_steps_branch_step ON public.client_visit_flow_steps(branch_id, step_code, step_status);

-- 4. Queue number generator (atomic, per branch per day)
CREATE OR REPLACE FUNCTION public.generate_visit_queue_number(p_branch_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_branch_id::text || p_date::text || 'queue'));
  SELECT COALESCE(MAX(visit_number), 0) + 1 INTO v_next
  FROM client_visit_flows
  WHERE branch_id = p_branch_id AND visit_date = p_date;
  RETURN v_next;
END;
$$;

-- 5. Register visit RPC
CREATE OR REPLACE FUNCTION public.register_queue_visit(
  p_branch_id uuid,
  p_appointment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid;
  v_number integer;
  v_prefix text;
  v_code text;
  v_visit_id uuid;
  v_today date;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  
  v_today := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  
  SELECT COALESCE(queue_prefix, 'Q') INTO v_prefix
  FROM branch_queue_settings WHERE branch_id = p_branch_id;
  IF NOT FOUND THEN v_prefix := 'Q'; END IF;

  v_number := generate_visit_queue_number(p_branch_id, v_today);
  v_code := v_prefix || LPAD(v_number::text, 3, '0');

  INSERT INTO client_visit_flows (branch_id, appointment_id, visit_date, visit_number, visit_code, current_step, current_status, created_by)
  VALUES (p_branch_id, p_appointment_id, v_today, v_number, v_code, 'register', 'waiting', v_actor)
  RETURNING id INTO v_visit_id;

  INSERT INTO client_visit_flow_steps (visit_id, branch_id, step_code, queue_number, queue_code, step_status, created_by)
  VALUES (v_visit_id, p_branch_id, 'register', v_number, v_code, 'completed', v_actor);

  -- Auto-route to counselor
  UPDATE client_visit_flows SET current_step = 'counselor', updated_by = v_actor, updated_at = now() WHERE id = v_visit_id;

  INSERT INTO client_visit_flow_steps (visit_id, branch_id, step_code, queue_number, queue_code, step_status, created_by)
  VALUES (v_visit_id, p_branch_id, 'counselor', v_number, v_code, 'waiting', v_actor);

  RETURN jsonb_build_object('visit_id', v_visit_id, 'visit_code', v_code, 'visit_number', v_number);
END;
$$;

-- 6. Route visit step RPC
CREATE OR REPLACE FUNCTION public.route_visit_step(
  p_visit_id uuid,
  p_current_step_id uuid,
  p_action text, -- 'call', 'start', 'complete', 'cancel'
  p_next_step text DEFAULT NULL,
  p_room_number integer DEFAULT NULL,
  p_route_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid;
  v_visit record;
  v_step record;
  v_branch_id uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_visit FROM client_visit_flows WHERE id = p_visit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visit not found'; END IF;
  IF v_visit.is_completed OR v_visit.is_cancelled THEN RAISE EXCEPTION 'Visit already ended'; END IF;

  SELECT * INTO v_step FROM client_visit_flow_steps WHERE id = p_current_step_id AND visit_id = p_visit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Step not found'; END IF;

  v_branch_id := v_visit.branch_id;

  IF p_action = 'call' THEN
    UPDATE client_visit_flow_steps SET called_at = now(), step_status = 'called', room_number = COALESCE(p_room_number, room_number), assigned_staff_id = v_actor, updated_by = v_actor, updated_at = now() WHERE id = p_current_step_id;
    UPDATE client_visit_flows SET current_status = 'called', updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;

  ELSIF p_action = 'start' THEN
    UPDATE client_visit_flow_steps SET started_at = now(), step_status = 'in_service', updated_by = v_actor, updated_at = now() WHERE id = p_current_step_id;
    UPDATE client_visit_flows SET current_status = 'in_service', updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;

  ELSIF p_action = 'complete' THEN
    UPDATE client_visit_flow_steps SET completed_at = now(), step_status = 'completed', routed_to_step_code = p_next_step, route_note = p_route_note, updated_by = v_actor, updated_at = now() WHERE id = p_current_step_id;
    
    IF p_next_step IS NULL OR p_next_step = 'completed' THEN
      UPDATE client_visit_flows SET current_step = 'completed', current_status = 'completed', is_completed = true, completed_at = now(), updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;
    ELSIF p_next_step = 'cancelled' THEN
      UPDATE client_visit_flows SET current_step = 'cancelled', current_status = 'cancelled', is_cancelled = true, cancelled_at = now(), cancel_reason = p_route_note, updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;
    ELSE
      INSERT INTO client_visit_flow_steps (visit_id, branch_id, step_code, queue_number, queue_code, step_status, created_by)
      VALUES (p_visit_id, v_branch_id, p_next_step, v_visit.visit_number, v_visit.visit_code, 'waiting', v_actor);
      UPDATE client_visit_flows SET current_step = p_next_step, current_status = 'waiting', updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;
    END IF;

  ELSIF p_action = 'cancel' THEN
    UPDATE client_visit_flow_steps SET completed_at = now(), step_status = 'cancelled', route_note = p_route_note, updated_by = v_actor, updated_at = now() WHERE id = p_current_step_id;
    UPDATE client_visit_flows SET current_step = 'cancelled', current_status = 'cancelled', is_cancelled = true, cancelled_at = now(), cancel_reason = p_route_note, updated_by = v_actor, updated_at = now() WHERE id = p_visit_id;
  END IF;
END;
$$;

-- 7. TV display view (privacy-safe, public readable)
CREATE OR REPLACE VIEW public.queue_tv_display AS
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

-- 8. RLS policies
ALTER TABLE public.branch_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_visit_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_visit_flow_steps ENABLE ROW LEVEL SECURITY;

-- branch_queue_settings: admin full, staff read own branch
CREATE POLICY "admin_manage_queue_settings" ON public.branch_queue_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff_read_queue_settings" ON public.branch_queue_settings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = auth.uid() AND bb.id = branch_queue_settings.branch_id
  )
);

-- client_visit_flows: admin full, staff own branch
CREATE POLICY "admin_manage_visits" ON public.client_visit_flows FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff_manage_visits" ON public.client_visit_flows FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = auth.uid() AND bb.id = client_visit_flows.branch_id
  )
);

-- client_visit_flow_steps: admin full, staff own branch
CREATE POLICY "admin_manage_steps" ON public.client_visit_flow_steps FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff_manage_steps" ON public.client_visit_flow_steps FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = auth.uid() AND bb.id = client_visit_flow_steps.branch_id
  )
);

-- TV display: public read (anon + authenticated)
CREATE POLICY "public_read_tv_display" ON public.client_visit_flow_steps FOR SELECT TO anon
USING (
  step_status IN ('waiting', 'called', 'in_service')
  AND EXISTS (
    SELECT 1 FROM client_visit_flows v
    WHERE v.id = client_visit_flow_steps.visit_id
    AND v.visit_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
    AND v.is_cancelled = false
  )
);

CREATE POLICY "public_read_visits_tv" ON public.client_visit_flows FOR SELECT TO anon
USING (
  visit_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
  AND is_cancelled = false
);

-- Enable realtime for queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_visit_flows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_visit_flow_steps;

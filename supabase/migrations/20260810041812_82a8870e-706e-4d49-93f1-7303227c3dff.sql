-- 1. case_notes insert: real branch scoping
DROP POLICY IF EXISTS "Staff insert own case_notes" ON public.case_notes;
CREATE POLICY "Staff insert own case_notes"
ON public.case_notes FOR INSERT TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (branch_id IS NOT NULL AND public.user_can_access_branch(auth.uid(), branch_id))
  )
);

-- 2. Tighten is_branch_counselor to real counseling staff
CREATE OR REPLACE FUNCTION public.is_branch_counselor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'counselor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.counselor_profiles cp
      WHERE cp.user_id = _user_id AND cp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = _user_id
        AND sp.is_active = true
        AND sp.branch_id IS NOT NULL
        AND (lower(coalesce(sp.role,'')) LIKE '%counselor%' OR lower(coalesce(sp.staff_role,'')) LIKE '%counselor%')
    )
$function$;

-- 3. Public TV display: minimal-field views instead of full anon row access
DROP POLICY IF EXISTS "public_read_visits_tv" ON public.client_visit_flows;
DROP POLICY IF EXISTS "public_read_tv_display" ON public.client_visit_flow_steps;

CREATE OR REPLACE VIEW public.public_queue_visits AS
SELECT v.id, v.branch_id, v.visit_code, v.visit_date, v.is_completed, v.is_cancelled
FROM public.client_visit_flows v
WHERE v.visit_date = ((now() AT TIME ZONE 'Asia/Bangkok'))::date;

CREATE OR REPLACE VIEW public.public_queue_steps AS
SELECT s.id, s.visit_id, s.branch_id, s.step_code, s.step_status,
       s.queue_code, s.room_number, s.called_at, s.entered_at
FROM public.client_visit_flow_steps s
JOIN public.client_visit_flows v ON v.id = s.visit_id
WHERE v.visit_date = ((now() AT TIME ZONE 'Asia/Bangkok'))::date;

GRANT SELECT ON public.public_queue_visits TO anon, authenticated;
GRANT SELECT ON public.public_queue_steps TO anon, authenticated;

-- 4. Payout settings should not be world-readable
DROP POLICY IF EXISTS "payout settings readable" ON public.counseling_payout_settings;
CREATE POLICY "Staff read payout settings"
ON public.counseling_payout_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR public.is_branch_counselor(auth.uid()));
REVOKE SELECT ON public.counseling_payout_settings FROM anon;
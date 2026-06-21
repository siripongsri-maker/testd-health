
-- 1) appointment_logs: drop overly broad authenticated INSERT
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.appointment_logs;

-- 2) msw_rapid_assessments: restrict INSERT to staff roles
DROP POLICY IF EXISTS "Authenticated users can submit assessments" ON public.msw_rapid_assessments;
CREATE POLICY "Staff can submit assessments"
  ON public.msw_rapid_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
      OR public.has_role(auth.uid(), 'me_analyst')
      OR public.has_role(auth.uid(), 'outreach_staff')
    )
  );

-- 3) reward_points_monthly: remove user direct write policies (SECURITY DEFINER RPCs bypass RLS)
DROP POLICY IF EXISTS "System can insert/update monthly points" ON public.reward_points_monthly;
DROP POLICY IF EXISTS "System can update own monthly points" ON public.reward_points_monthly;

-- 4) partner_invites: remove broad public enumeration, add scoped lookup RPC
DROP POLICY IF EXISTS "Public can read active invites by code" ON public.partner_invites;

CREATE OR REPLACE FUNCTION public.get_partner_invite_by_code(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  invite_type text,
  tone text,
  expires_at timestamptz,
  is_active boolean,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.id, pi.code, pi.invite_type, pi.tone, pi.expires_at, pi.is_active, pi.status
  FROM public.partner_invites pi
  WHERE pi.code = _code
    AND pi.is_active = true
    AND pi.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_invite_by_code(text) TO anon, authenticated;

-- 5) pdpa_audit_logs: force actor_id + actor_role server-side
CREATE OR REPLACE FUNCTION public.pdpa_audit_logs_stamp_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := 'user';
BEGIN
  -- service_role can write freely
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Force actor_id to the signed-in user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'pdpa_audit_logs: authentication required';
  END IF;
  NEW.actor_id := auth.uid();

  -- Derive verified actor_role from has_role
  IF public.has_role(auth.uid(), 'admin') THEN v_role := 'admin';
  ELSIF public.has_role(auth.uid(), 'moderator') THEN v_role := 'moderator';
  ELSIF public.has_role(auth.uid(), 'me_analyst') THEN v_role := 'me_analyst';
  ELSIF public.has_role(auth.uid(), 'outreach_staff') THEN v_role := 'outreach_staff';
  ELSE v_role := 'user';
  END IF;
  NEW.actor_role := v_role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pdpa_audit_logs_stamp_actor ON public.pdpa_audit_logs;
CREATE TRIGGER trg_pdpa_audit_logs_stamp_actor
  BEFORE INSERT ON public.pdpa_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.pdpa_audit_logs_stamp_actor();

-- 6) profiles: block self-elevation of xp/level/streak/badges/trust_tier
CREATE OR REPLACE FUNCTION public.profiles_block_reward_field_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role and SECURITY DEFINER RPCs bypass this check
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Admins can adjust reward fields on any profile
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.streak IS DISTINCT FROM OLD.streak
     OR NEW.badges IS DISTINCT FROM OLD.badges
     OR NEW.trust_tier IS DISTINCT FROM OLD.trust_tier THEN
    RAISE EXCEPTION 'profiles: xp/level/streak/badges/trust_tier may only be modified by admin or server-side reward functions';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_block_reward_field_self_edit ON public.profiles;
CREATE TRIGGER trg_profiles_block_reward_field_self_edit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_block_reward_field_self_edit();

-- 7) hiv_selftest_requests: lock assigned_branch to admins only
CREATE OR REPLACE FUNCTION public.hiv_selftest_requests_lock_assigned_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_branch IS DISTINCT FROM OLD.assigned_branch THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'hiv_selftest_requests: only admins can change assigned_branch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hiv_selftest_requests_lock_assigned_branch ON public.hiv_selftest_requests;
CREATE TRIGGER trg_hiv_selftest_requests_lock_assigned_branch
  BEFORE UPDATE ON public.hiv_selftest_requests
  FOR EACH ROW EXECUTE FUNCTION public.hiv_selftest_requests_lock_assigned_branch();

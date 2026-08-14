
-- Helper: is the current actor staff/admin (any privileged role)?
CREATE OR REPLACE FUNCTION public.is_privileged_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin','moderator')
  );
$$;

-- ── appointments ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_appointments_protect_staff_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / internal jobs and privileged staff may change anything.
  IF auth.uid() IS NULL OR public.is_privileged_staff(auth.uid())
     OR public.staff_can_access_appointment(NEW.id) THEN
    RETURN NEW;
  END IF;

  NEW.status              := OLD.status;
  NEW.staff_notes         := OLD.staff_notes;
  NEW.completed_at        := OLD.completed_at;
  NEW.cancellation_reason := OLD.cancellation_reason;
  NEW.checkout_method     := OLD.checkout_method;
  NEW.guest_access_hash   := OLD.guest_access_hash;
  NEW.guest_access_expires_at := OLD.guest_access_expires_at;
  NEW.user_id             := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_protect_staff_columns ON public.appointments;
CREATE TRIGGER appointments_protect_staff_columns
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.tg_appointments_protect_staff_columns();

-- ── hiv_selftest_requests ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_selftest_requests_protect_staff_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_privileged_staff(auth.uid())
     OR public.is_branch_staff(auth.uid(), NEW.assigned_branch) THEN
    RETURN NEW;
  END IF;

  NEW.status              := OLD.status;
  NEW.tracking_number     := OLD.tracking_number;
  NEW.test_result         := OLD.test_result;
  NEW.staff_notes         := OLD.staff_notes;
  NEW.abuse_flag          := OLD.abuse_flag;
  NEW.rejection_reason    := OLD.rejection_reason;
  NEW.reactive_notified_at := OLD.reactive_notified_at;
  NEW.assigned_branch     := OLD.assigned_branch;
  NEW.user_id             := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS selftest_requests_protect_staff_columns ON public.hiv_selftest_requests;
CREATE TRIGGER selftest_requests_protect_staff_columns
BEFORE UPDATE ON public.hiv_selftest_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_selftest_requests_protect_staff_columns();

-- ── hr_referrals ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_hr_referrals_protect_staff_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_privileged_staff(auth.uid())
     OR public.is_branch_counselor(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.status          := OLD.status;
  NEW.risk_level      := OLD.risk_level;
  NEW.handled_by      := OLD.handled_by;
  NEW.handled_at      := OLD.handled_at;
  NEW.counselor_notes := OLD.counselor_notes;
  NEW.user_id         := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr_referrals_protect_staff_columns ON public.hr_referrals;
CREATE TRIGGER hr_referrals_protect_staff_columns
BEFORE UPDATE ON public.hr_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_hr_referrals_protect_staff_columns();

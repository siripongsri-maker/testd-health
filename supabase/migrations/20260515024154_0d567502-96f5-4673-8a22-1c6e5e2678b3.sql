
CREATE TABLE IF NOT EXISTS public.hiv_selftest_case_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.hiv_selftest_requests(id) ON DELETE CASCADE,
  changed_by UUID,
  changed_by_name TEXT,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_selftest_case_history_request ON public.hiv_selftest_case_history(request_id, created_at DESC);

ALTER TABLE public.hiv_selftest_case_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view selftest case history"
ON public.hiv_selftest_case_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'outreach_staff')
  OR public.has_role(auth.uid(), 'me_analyst')
);

CREATE POLICY "Staff can insert selftest case history"
ON public.hiv_selftest_case_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'outreach_staff')
);

CREATE OR REPLACE FUNCTION public.log_selftest_case_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT display_name INTO actor_name FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  IF NEW.care_action IS DISTINCT FROM OLD.care_action THEN
    INSERT INTO public.hiv_selftest_case_history (request_id, changed_by, changed_by_name, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), actor_name, 'care_action', OLD.care_action, NEW.care_action);
  END IF;

  IF NEW.staff_notes IS DISTINCT FROM OLD.staff_notes THEN
    INSERT INTO public.hiv_selftest_case_history (request_id, changed_by, changed_by_name, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), actor_name, 'staff_notes', OLD.staff_notes, NEW.staff_notes);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_selftest_case_change ON public.hiv_selftest_requests;
CREATE TRIGGER trg_log_selftest_case_change
AFTER UPDATE OF care_action, staff_notes ON public.hiv_selftest_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_selftest_case_change();

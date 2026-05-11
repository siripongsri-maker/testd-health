-- ============ hiv_selftest_requests: lean v2 columns ============
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS self_reported_result text,
  ADD COLUMN IF NOT EXISTS photo_provided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_path text,
  ADD COLUMN IF NOT EXISTS result_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS care_action text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS last_tracking_check_at timestamptz;

-- value validation via trigger (avoid CHECK constraints for flexibility)
CREATE OR REPLACE FUNCTION public.validate_selftest_lean_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.self_reported_result IS NOT NULL
     AND NEW.self_reported_result NOT IN ('negative','reactive','invalid') THEN
    RAISE EXCEPTION 'invalid self_reported_result: %', NEW.self_reported_result;
  END IF;
  IF NEW.submission_path IS NOT NULL
     AND NEW.submission_path NOT IN ('lean_no_photo','lean_with_photo','legacy_full') THEN
    RAISE EXCEPTION 'invalid submission_path: %', NEW.submission_path;
  END IF;
  IF NEW.care_action IS NOT NULL
     AND NEW.care_action NOT IN (
       'requested_callback','booked_clinic','chose_line_chat',
       'declined','requested_new_kit','subscribe_reminder'
     ) THEN
    RAISE EXCEPTION 'invalid care_action: %', NEW.care_action;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_selftest_lean_fields ON public.hiv_selftest_requests;
CREATE TRIGGER trg_validate_selftest_lean_fields
  BEFORE INSERT OR UPDATE ON public.hiv_selftest_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_selftest_lean_fields();

CREATE INDEX IF NOT EXISTS idx_selftest_submission_path
  ON public.hiv_selftest_requests(submission_path, result_submitted_at);
CREATE INDEX IF NOT EXISTS idx_selftest_reactive
  ON public.hiv_selftest_requests(self_reported_result)
  WHERE self_reported_result = 'reactive';
CREATE INDEX IF NOT EXISTS idx_selftest_pending_delivery
  ON public.hiv_selftest_requests(status, last_tracking_check_at)
  WHERE status IN ('shipped','delivered');

-- ============ selftest_magic_tokens ============
CREATE TABLE IF NOT EXISTS public.selftest_magic_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.hiv_selftest_requests(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL DEFAULT 'submit_result',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_request ON public.selftest_magic_tokens(request_id);

ALTER TABLE public.selftest_magic_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read magic tokens" ON public.selftest_magic_tokens;
CREATE POLICY "Admins read magic tokens"
  ON public.selftest_magic_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ selftest_tracking_events ============
CREATE TABLE IF NOT EXISTS public.selftest_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.hiv_selftest_requests(id) ON DELETE CASCADE,
  tracking_number text,
  carrier text,
  event_code text,
  event_description text,
  event_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_request ON public.selftest_tracking_events(request_id, event_at DESC);

ALTER TABLE public.selftest_tracking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read tracking events" ON public.selftest_tracking_events;
CREATE POLICY "Admins read tracking events"
  ON public.selftest_tracking_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ selftest_result_reminders ============
CREATE TABLE IF NOT EXISTS public.selftest_result_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.hiv_selftest_requests(id) ON DELETE CASCADE,
  template text NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);
CREATE INDEX IF NOT EXISTS idx_reminders_request ON public.selftest_result_reminders(request_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_template ON public.selftest_result_reminders(template, sent_at DESC);

ALTER TABLE public.selftest_result_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read reminders" ON public.selftest_result_reminders;
CREATE POLICY "Admins read reminders"
  ON public.selftest_result_reminders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
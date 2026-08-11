-- 1) Queue the post-service evaluation + travel allowance link when a case is completed/closed
CREATE OR REPLACE FUNCTION public.queue_post_eval_sms_on_case_close()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_appt public.appointments;
  v_branch uuid;
BEGIN
  IF NEW.status NOT IN ('counseling_completed','case_closed') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- already queued/sent for this case?
  IF EXISTS (
    SELECT 1 FROM public.post_eval_sms_dispatches d
    WHERE d.note_id = NEW.id AND d.status IN ('queued','sent')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT a.* INTO v_appt
  FROM public.appointments a
  JOIN public.appointment_pre_service_surveys s ON s.booking_id = a.id
  WHERE s.id = NEW.survey_id
  LIMIT 1;

  IF v_appt.id IS NULL OR coalesce(btrim(v_appt.contact_phone), '') = '' THEN
    RETURN NEW;
  END IF;

  v_branch := coalesce(NEW.branch_id, v_appt.branch_id);

  INSERT INTO public.post_eval_sms_dispatches (note_id, branch_id, appointment_id, status, auto_queued, scheduled_for)
  VALUES (NEW.id, v_branch, v_appt.id, 'queued', true, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_post_eval_sms_on_case_close_trg ON public.pre_service_counseling_notes;
CREATE TRIGGER queue_post_eval_sms_on_case_close_trg
AFTER INSERT OR UPDATE OF status ON public.pre_service_counseling_notes
FOR EACH ROW EXECUTE FUNCTION public.queue_post_eval_sms_on_case_close();

-- 2) Per-case travel allowance status for the daily branch brief (no bank/PII details)
DROP FUNCTION IF EXISTS public.get_case_payout_status(uuid[]);
CREATE OR REPLACE FUNCTION public.get_case_payout_status(_survey_ids uuid[])
RETURNS TABLE(
  survey_id uuid,
  note_id uuid,
  branch_id uuid,
  appointment_id uuid,
  has_phone boolean,
  sms_status text,
  sms_sent_at timestamptz,
  sms_scheduled_for timestamptz,
  has_evaluation boolean,
  claim_status text,
  claim_amount numeric,
  claim_submitted_at timestamptz,
  claim_paid_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    n.survey_id,
    n.id,
    coalesce(n.branch_id, a.branch_id),
    a.id,
    coalesce(btrim(a.contact_phone), '') <> '',
    d.status,
    d.sent_at,
    d.scheduled_for,
    e.id IS NOT NULL,
    c.status,
    c.amount,
    c.created_at,
    c.paid_at
  FROM public.pre_service_counseling_notes n
  LEFT JOIN public.appointment_pre_service_surveys s ON s.id = n.survey_id
  LEFT JOIN public.appointments a ON a.id = s.booking_id
  LEFT JOIN LATERAL (
    SELECT dd.* FROM public.post_eval_sms_dispatches dd
    WHERE dd.note_id = n.id ORDER BY dd.created_at DESC LIMIT 1
  ) d ON true
  LEFT JOIN public.post_counseling_evaluations e ON e.note_id = n.id
  LEFT JOIN public.counseling_payout_claims c ON c.note_id = n.id
  WHERE n.survey_id = ANY(_survey_ids)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active AND sp.branch_id = coalesce(n.branch_id, a.branch_id))
      OR EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.user_id = auth.uid() AND cp.is_active AND cp.branch_id = coalesce(n.branch_id, a.branch_id))
    );
$$;
REVOKE ALL ON FUNCTION public.get_case_payout_status(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_case_payout_status(uuid[]) TO authenticated, service_role;
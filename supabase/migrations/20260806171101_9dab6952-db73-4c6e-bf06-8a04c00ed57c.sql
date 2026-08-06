CREATE TABLE IF NOT EXISTS public.client_status_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  note_id uuid,
  claim_id uuid,
  appointment_id uuid,
  branch_id uuid,
  channel text NOT NULL DEFAULT 'sms',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  phone_last4 text,
  phone_hash text,
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_status_notifications TO authenticated;
GRANT ALL ON public.client_status_notifications TO service_role;

ALTER TABLE public.client_status_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csn_admin_read ON public.client_status_notifications;
CREATE POLICY csn_admin_read ON public.client_status_notifications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS csn_queue_idx
  ON public.client_status_notifications(status, scheduled_for)
  WHERE status = 'queued';

DROP TRIGGER IF EXISTS csn_updated_at ON public.client_status_notifications;
CREATE TRIGGER csn_updated_at BEFORE UPDATE ON public.client_status_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.note_appointment_id(_note_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.booking_id
  FROM public.pre_service_counseling_notes n
  JOIN public.appointment_pre_service_surveys s ON s.id = n.survey_id
  WHERE n.id = _note_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.queue_claim_status_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
  v_msg text;
  v_appt uuid;
  v_token uuid;
  v_link text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'claim_received';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status
      WHEN 'approved' THEN 'claim_approved'
      WHEN 'paid' THEN 'claim_paid'
      WHEN 'rejected' THEN 'claim_rejected'
      ELSE NULL END;
  END IF;

  IF v_event IS NULL THEN RETURN NEW; END IF;

  SELECT n.post_eval_token INTO v_token
  FROM public.pre_service_counseling_notes n WHERE n.id = NEW.note_id;
  v_appt := public.note_appointment_id(NEW.note_id);
  v_link := CASE WHEN v_token IS NULL THEN '' ELSE ' https://testd.website/post-counseling/' || v_token::text END;

  v_msg := CASE v_event
    WHEN 'claim_received' THEN 'testD: รับคำขอค่าเดินทาง ' || round(coalesce(NEW.amount,200)) || ' บาทแล้ว กำลังตรวจสอบ ติดตามสถานะได้ที่' || v_link
    WHEN 'claim_approved' THEN 'testD: คำขอค่าเดินทาง ' || round(coalesce(NEW.amount,200)) || ' บาท ได้รับการอนุมัติแล้ว รอโอนเงินภายใน 3-5 วันทำการ' || v_link
    WHEN 'claim_paid' THEN 'testD: โอนค่าเดินทาง ' || round(coalesce(NEW.amount,200)) || ' บาท เรียบร้อยแล้ว ขอบคุณที่ใช้บริการ' || v_link
    ELSE 'testD: คำขอค่าเดินทางไม่ผ่านการอนุมัติ' ||
         coalesce(' เหตุผล: ' || nullif(btrim(NEW.rejection_reason), ''), '') ||
         ' สอบถาม 02 632 9501' END;

  INSERT INTO public.client_status_notifications (event_type, note_id, claim_id, appointment_id, branch_id, message)
  VALUES (v_event, NEW.note_id, NEW.id, v_appt, NEW.branch_id, v_msg);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_claim_status_notification_trg ON public.counseling_payout_claims;
CREATE TRIGGER queue_claim_status_notification_trg
AFTER INSERT OR UPDATE OF status ON public.counseling_payout_claims
FOR EACH ROW EXECUTE FUNCTION public.queue_claim_status_notification();

CREATE OR REPLACE FUNCTION public.log_post_eval_sms_notification()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
    INSERT INTO public.client_status_notifications (
      event_type, note_id, appointment_id, branch_id, message, status, sent_at, phone_last4, phone_hash, provider_message_id
    ) VALUES (
      'eval_sms_sent', NEW.note_id, NEW.appointment_id, NEW.branch_id,
      'testD: ส่งลิงก์แบบประเมินหลังรับบริการให้ผู้รับบริการแล้ว',
      'sent', coalesce(NEW.sent_at, now()), NEW.phone_last4, NEW.phone_hash, NEW.provider_message_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_post_eval_sms_notification_trg ON public.post_eval_sms_dispatches;
CREATE TRIGGER log_post_eval_sms_notification_trg
AFTER UPDATE OF status ON public.post_eval_sms_dispatches
FOR EACH ROW EXECUTE FUNCTION public.log_post_eval_sms_notification();
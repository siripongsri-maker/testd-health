
CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.hiv_selftest_requests(id) ON DELETE SET NULL,
  recipient_name text,
  phone text NOT NULL,
  template_key text,
  template_label text,
  message text NOT NULL,
  sender text,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  sms_provider_id text,
  http_status integer,
  error_message text,
  provider_response jsonb,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  tracking_token text UNIQUE,
  original_url text,
  click_count integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  last_click_user_agent text,
  last_click_ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_send_log_sent_at ON public.sms_send_log (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_request_id ON public.sms_send_log (request_id);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_token ON public.sms_send_log (tracking_token);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_status ON public.sms_send_log (status);

GRANT SELECT ON public.sms_send_log TO authenticated;
GRANT ALL ON public.sms_send_log TO service_role;

ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view SMS send log"
ON public.sms_send_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'me_analyst')
  OR public.has_role(auth.uid(), 'outreach_staff')
);

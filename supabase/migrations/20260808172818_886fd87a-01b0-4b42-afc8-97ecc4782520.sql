CREATE TABLE public.seo_outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  direction text NOT NULL DEFAULT 'sent',
  channel text NOT NULL DEFAULT 'email',
  subject text,
  summary text,
  sent_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  replied_on date,
  key_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_outreach_messages TO authenticated;
GRANT ALL ON public.seo_outreach_messages TO service_role;

ALTER TABLE public.seo_outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage outreach messages"
ON public.seo_outreach_messages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_seo_outreach_messages_domain ON public.seo_outreach_messages (domain, sent_on DESC);

CREATE TRIGGER update_seo_outreach_messages_updated_at
BEFORE UPDATE ON public.seo_outreach_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
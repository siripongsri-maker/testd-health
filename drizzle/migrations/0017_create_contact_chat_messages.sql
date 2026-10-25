CREATE TABLE public.contact_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_chat_messages_session ON public.contact_chat_messages (session_id, created_at);

GRANT SELECT ON public.contact_chat_messages TO authenticated;
GRANT ALL ON public.contact_chat_messages TO service_role;

ALTER TABLE public.contact_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read contact chat messages"
ON public.contact_chat_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'counselor'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
);
CREATE TABLE public.appointment_reminder_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'push',
  delivered INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, kind, channel)
);

GRANT SELECT ON public.appointment_reminder_sends TO authenticated;
GRANT ALL ON public.appointment_reminder_sends TO service_role;

ALTER TABLE public.appointment_reminder_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminder sends"
ON public.appointment_reminder_sends FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_appointment_reminder_sends_appt
ON public.appointment_reminder_sends (appointment_id);
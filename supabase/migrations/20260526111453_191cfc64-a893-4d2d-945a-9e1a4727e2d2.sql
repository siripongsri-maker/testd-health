CREATE TABLE public.appointment_pre_service_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  uic_code text,
  language text DEFAULT 'th',
  channel text,
  knowledge jsonb,
  behavior jsonb,
  confidence int,
  safety int,
  recommend text,
  mental_health_interest text,
  suggestions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apss_booking_id ON public.appointment_pre_service_surveys(booking_id);
CREATE INDEX idx_apss_created_at ON public.appointment_pre_service_surveys(created_at DESC);

ALTER TABLE public.appointment_pre_service_surveys ENABLE ROW LEVEL SECURITY;

-- Anyone can insert as long as the booking_id corresponds to a real appointment
CREATE POLICY "Anyone can submit pre-service survey for a real booking"
ON public.appointment_pre_service_surveys
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = booking_id)
);

-- Logged-in user can read their own survey
CREATE POLICY "Users can read their own pre-service survey"
ON public.appointment_pre_service_surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = booking_id AND a.user_id = auth.uid()
  )
);

-- Admins / analysts can read all
CREATE POLICY "Admins can read all pre-service surveys"
ON public.appointment_pre_service_surveys
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
);
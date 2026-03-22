-- Appointment verification codes for email-based actions
CREATE TABLE IF NOT EXISTS public.appointment_action_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  action_type text NOT NULL DEFAULT 'multi', -- multi = supports check-in/confirm/reschedule/cancel
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_action text, -- which action was taken
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_appointment_action_codes_code ON public.appointment_action_codes(code);
CREATE INDEX idx_appointment_action_codes_appointment ON public.appointment_action_codes(appointment_id);

-- RLS
ALTER TABLE public.appointment_action_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role only (edge functions use service role)
CREATE POLICY "Service role full access on appointment_action_codes"
  ON public.appointment_action_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Track whether review follow-up email was sent
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS review_email_sent_at timestamptz;

-- Track review responses
CREATE TABLE IF NOT EXISTS public.appointment_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
  rating text NOT NULL, -- 'great', 'okay', 'need_support'
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on appointment_reviews"
  ON public.appointment_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert their own reviews
CREATE POLICY "Users can insert own reviews"
  ON public.appointment_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.user_id = auth.uid()
    )
  );

-- Public select for codes (needed for guest access via edge function)
CREATE POLICY "Public read appointment_action_codes"
  ON public.appointment_action_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);
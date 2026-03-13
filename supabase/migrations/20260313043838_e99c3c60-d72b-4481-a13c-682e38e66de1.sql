-- Clinic settings table (admin-editable)
CREATE TABLE public.clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_key text UNIQUE NOT NULL,
  clinic_name text NOT NULL DEFAULT 'SWING Clinic',
  clinic_phone text NOT NULL DEFAULT '+66 2 632 9501',
  clinic_address text,
  internal_booking_path text NOT NULL DEFAULT '/booking',
  clinic_hours text DEFAULT 'Mon-Fri 10:00-18:00',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clinic settings"
  ON public.clinic_settings FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage clinic settings"
  ON public.clinic_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default
INSERT INTO public.clinic_settings (clinic_key, clinic_name, clinic_phone, clinic_address, internal_booking_path, clinic_hours)
VALUES ('swing_main', 'SWING Clinic', '+66 2 632 9501', 'Multiple branches in Bangkok and Pattaya', '/booking', 'Mon-Fri 10:00-18:00');

-- Clinic link audit table
CREATE TABLE public.clinic_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  original_link text NOT NULL,
  action_taken text NOT NULL DEFAULT 'redirected_internal',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_link_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read clinic link audit"
  ON public.clinic_link_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert clinic link audit"
  ON public.clinic_link_audit FOR INSERT TO authenticated, anon
  WITH CHECK (true);
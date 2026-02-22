
-- =============================================
-- BOOKING SYSTEM SCHEMA
-- =============================================

-- Branches table
CREATE TABLE public.booking_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_th text NOT NULL,
  name_en text NOT NULL,
  counselor_count integer NOT NULL DEFAULT 1,
  open_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun..6=Sat
  open_time time NOT NULL DEFAULT '11:00',
  close_time time NOT NULL DEFAULT '17:00',
  slot_duration_minutes integer NOT NULL DEFAULT 5,
  address_th text,
  address_en text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active branches"
  ON public.booking_branches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage branches"
  ON public.booking_branches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Services table
CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_th text NOT NULL,
  name_en text NOT NULL,
  description_th text,
  description_en text,
  is_free_thai boolean NOT NULL DEFAULT true,
  is_free_global_fund boolean NOT NULL DEFAULT true,
  external_price_url text,
  icon text NOT NULL DEFAULT '🩺',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON public.booking_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON public.booking_services FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.booking_branches(id),
  service_id uuid NOT NULL REFERENCES public.booking_services(id),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  status text NOT NULL DEFAULT 'booked',
  notes text,
  staff_notes text,
  attended_by uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can manage their own appointments
CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Branch staff can view/update their branch appointments
CREATE POLICY "Branch staff can view branch appointments"
  ON public.appointments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = auth.uid() AND bb.id = appointments.branch_id
  ));

CREATE POLICY "Branch staff can update branch appointments"
  ON public.appointments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM staff_branch_assignments sba
    JOIN booking_branches bb ON bb.slug = sba.branch
    WHERE sba.user_id = auth.uid() AND bb.id = appointments.branch_id
  ));

-- Appointment history/log
CREATE TABLE public.appointment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their appointment logs"
  ON public.appointment_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = appointment_logs.appointment_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all logs"
  ON public.appointment_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert logs"
  ON public.appointment_logs FOR INSERT
  WITH CHECK (true);

-- Branch staff can view logs
CREATE POLICY "Branch staff can view branch logs"
  ON public.appointment_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments a
    JOIN staff_branch_assignments sba ON EXISTS (
      SELECT 1 FROM booking_branches bb WHERE bb.slug = sba.branch AND bb.id = a.branch_id
    )
    WHERE a.id = appointment_logs.appointment_id AND sba.user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_branches_updated_at
  BEFORE UPDATE ON public.booking_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to count booked slots for a branch/date/time
CREATE OR REPLACE FUNCTION public.count_booked_slots(
  p_branch_id uuid,
  p_date date,
  p_time time
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM appointments
  WHERE branch_id = p_branch_id
    AND appointment_date = p_date
    AND start_time = p_time
    AND status NOT IN ('cancelled');
$$;

-- Seed branches
INSERT INTO public.booking_branches (slug, name_th, name_en, counselor_count, open_days, open_time, close_time) VALUES
  ('silom', 'สาขาสีลม', 'Silom', 4, '{1,2,3,4,5}', '11:00', '17:00'),
  ('petchakasem', 'สาขาเพชรเกษม', 'Petchakasem', 1, '{0,3,4,5,6}', '13:00', '19:00'),
  ('saphankwai', 'สาขาสะพานควาย', 'Saphankwai', 2, '{0,3,4,5,6}', '13:00', '19:00'),
  ('pattaya', 'สาขาพัทยา', 'Pattaya', 3, '{1,2,3,4,5}', '11:00', '17:00');

-- Seed services
INSERT INTO public.booking_services (slug, name_th, name_en, description_th, description_en, icon, display_order, is_free_thai, is_free_global_fund, external_price_url) VALUES
  ('hiv-testing', 'ตรวจ HIV', 'HIV Testing', 'ตรวจหาเชื้อ HIV แบบรวดเร็ว ฟรีสำหรับคนไทยภายใต้ สปสช.', 'Rapid HIV testing. Free for Thai nationals under NHSO Universal Coverage.', '🔬', 1, true, true, NULL),
  ('prep-consultation', 'ปรึกษา PrEP', 'PrEP Consultation', 'ปรึกษาและเริ่มต้นใช้ PrEP ป้องกัน HIV', 'PrEP initiation and follow-up consultation.', '💊', 2, true, true, NULL),
  ('syphilis-testing', 'ตรวจซิฟิลิส', 'Syphilis Testing', 'ตรวจหาเชื้อซิฟิลิส', 'Syphilis screening test.', '🧪', 3, true, true, NULL),
  ('hepc-testing', 'ตรวจไวรัสตับอักเสบซี', 'Hepatitis C Testing', 'ตรวจหาเชื้อไวรัสตับอักเสบซี', 'Hepatitis C virus screening.', '🏥', 4, true, true, NULL),
  ('pep', 'PEP ยาป้องกันหลังสัมผัสเชื้อ', 'PEP (Post-Exposure Prophylaxis)', 'ยาต้านไวรัสหลังสัมผัสเชื้อ HIV ภายใน 72 ชั่วโมง', 'Emergency HIV prevention medication within 72 hours of exposure.', '🚨', 5, true, true, NULL);

-- Add index for fast slot lookups
CREATE INDEX idx_appointments_slot_lookup 
  ON public.appointments (branch_id, appointment_date, start_time, status);

-- Add index for user appointments
CREATE INDEX idx_appointments_user 
  ON public.appointments (user_id, appointment_date);

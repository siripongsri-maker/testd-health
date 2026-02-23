
-- ============================================================
-- Phase 1: Booking System Enhancements Migration
-- ============================================================

-- 1.1 appointment_services join table (multi-service per booking)
CREATE TABLE public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.booking_services(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, service_id)
);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointment services"
  ON public.appointment_services FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_services.appointment_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own appointment services"
  ON public.appointment_services FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_services.appointment_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Staff can view branch appointment services"
  ON public.appointment_services FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.staff_branch_assignments sba ON sba.user_id = auth.uid()
    JOIN public.booking_branches bb ON bb.slug = sba.branch
    WHERE a.id = appointment_services.appointment_id AND bb.id = a.branch_id
  ));

CREATE POLICY "Admins can manage all appointment services"
  ON public.appointment_services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.2 staff_profiles table
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.booking_branches(id),
  name_th text NOT NULL,
  name_en text NOT NULL,
  role text NOT NULL DEFAULT 'counselor' CHECK (role IN ('counselor', 'medical_registration', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active staff profiles"
  ON public.staff_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage staff profiles"
  ON public.staff_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed 13 counselors (user_id will be linked later via edge function)
INSERT INTO public.staff_profiles (branch_id, name_th, name_en, role)
VALUES
  -- Saphankwai (3)
  ((SELECT id FROM public.booking_branches WHERE slug = 'saphankwai'), 'ฝนทิพย์ สุวรรณ์', 'Fonthip Suwan', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'saphankwai'), 'วสวัตติ์ ครุฑคง', 'Wasawat Kukong', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'saphankwai'), 'อรรถพล คำศิลา', 'Autthapon Kamsila', 'counselor'),
  -- Silom (4)
  ((SELECT id FROM public.booking_branches WHERE slug = 'silom'), 'อัฐชัย พันธุ์กร', 'Atachai Phunkorn', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'silom'), 'ชัชชญา วุฒิจิรกาล', 'Chatchaya Wuttijirakan', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'silom'), 'กรณ์ธนพงศ์ บัวเกิดเพชร', 'Kornthanaphong Buagerdpech', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'silom'), 'ธีระรัตน์ ทองจันทร์มูล', 'Teerarat Tongjanmool', 'counselor'),
  -- Petchakasem (1)
  ((SELECT id FROM public.booking_branches WHERE slug = 'petchakasem'), 'ฐิติธนภูมิ พ่อกุล', 'Thitithanapoom Phogul', 'counselor'),
  -- Pattaya (4)
  ((SELECT id FROM public.booking_branches WHERE slug = 'pattaya'), 'อัญชณาภรณ์ พิลาสุตา', 'Aunchanaporn Pilasuta', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'pattaya'), 'พรพิพัฒน์ อินตา', 'Pornpipat Inta', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'pattaya'), 'พรพิชิต บุตรราช', 'Pornpichit Brutrat', 'counselor'),
  ((SELECT id FROM public.booking_branches WHERE slug = 'pattaya'), 'ณัฐวัตร ธรรมารักษ์', 'Nutthawat Thanmarak', 'counselor');

-- 1.3 Service pricing: add is_free_pep_thai column for PEP-specific logic
ALTER TABLE public.booking_services ADD COLUMN IF NOT EXISTS is_free_pep_thai boolean NOT NULL DEFAULT false;

-- PEP: free only for Thai (not CLVM)
UPDATE public.booking_services SET is_free_pep_thai = true, is_free_global_fund = false WHERE slug = 'pep';

-- 1.4 notification_logs table
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  email_masked text,
  notification_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = notification_logs.appointment_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.5 risk_assessment_questions table
CREATE TABLE public.risk_assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_th text NOT NULL,
  question_en text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  recommended_services text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active risk questions"
  ON public.risk_assessment_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage risk questions"
  ON public.risk_assessment_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed deterministic risk assessment questions
INSERT INTO public.risk_assessment_questions (question_th, question_en, options, recommended_services, display_order) VALUES
(
  'คุณมีการสัมผัสเชื้อ HIV ที่ไม่ได้ป้องกัน (เช่น มีเพศสัมพันธ์โดยไม่ใช้ถุงยาง) ภายใน 72 ชั่วโมงที่ผ่านมาหรือไม่?',
  'Have you had unprotected exposure to HIV (e.g., condomless sex) within the last 72 hours?',
  '[{"value":"yes","label_th":"ใช่","label_en":"Yes"},{"value":"no","label_th":"ไม่ใช่","label_en":"No"}]',
  ARRAY['pep', 'hiv-testing'],
  1
),
(
  'คุณเคยตรวจ HIV ในช่วง 3 เดือนที่ผ่านมาหรือไม่?',
  'Have you been tested for HIV in the last 3 months?',
  '[{"value":"yes","label_th":"ใช่","label_en":"Yes"},{"value":"no","label_th":"ไม่ใช่","label_en":"No"}]',
  ARRAY['hiv-testing'],
  2
),
(
  'คุณสนใจการป้องกัน HIV ด้วยยา PrEP หรือไม่?',
  'Are you interested in HIV prevention with PrEP medication?',
  '[{"value":"yes","label_th":"ใช่","label_en":"Yes"},{"value":"no","label_th":"ไม่ใช่","label_en":"No"}]',
  ARRAY['prep-consultation'],
  3
),
(
  'คุณต้องการตรวจโรคติดต่อทางเพศสัมพันธ์ (ซิฟิลิส / ไวรัสตับอักเสบ C) หรือไม่?',
  'Would you like to get tested for STIs (Syphilis / Hepatitis C)?',
  '[{"value":"syphilis","label_th":"ซิฟิลิส","label_en":"Syphilis"},{"value":"hepc","label_th":"ไวรัสตับอักเสบ C","label_en":"Hepatitis C"},{"value":"both","label_th":"ทั้งสอง","label_en":"Both"},{"value":"no","label_th":"ไม่","label_en":"No"}]',
  ARRAY['syphilis-testing', 'hepc-testing'],
  4
);

-- 1.6 Add contact_email to appointments for optional email collection
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS contact_email text;

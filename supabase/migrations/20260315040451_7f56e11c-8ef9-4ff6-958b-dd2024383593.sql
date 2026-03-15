
-- ============================================
-- Phase 3: Data Retention, Deletion, Incidents
-- ============================================

-- 1. Retention policies (configurable per data type)
CREATE TABLE public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL UNIQUE,
  display_name_en text NOT NULL DEFAULT '',
  display_name_th text NOT NULL DEFAULT '',
  classification text NOT NULL DEFAULT 'internal',
  retention_days integer NOT NULL DEFAULT 365,
  action text NOT NULL DEFAULT 'anonymize' CHECK (action IN ('delete', 'anonymize', 'archive')),
  is_active boolean NOT NULL DEFAULT true,
  applies_to_table text,
  description_en text,
  description_th text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retention policies"
  ON public.retention_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ME analysts can view retention policies"
  ON public.retention_policies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'me_analyst'));

-- 2. Deletion / DSAR requests
CREATE TABLE public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL DEFAULT 'deletion' CHECK (request_type IN ('deletion', 'correction', 'access', 'portability', 'restriction')),
  requester_id uuid,
  requester_email text,
  requester_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'in_progress', 'completed', 'rejected', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  data_categories text[] NOT NULL DEFAULT '{}',
  reason text,
  admin_notes text,
  assigned_to uuid,
  verified_at timestamptz,
  verified_by uuid,
  completed_at timestamptz,
  completed_by uuid,
  deadline_at timestamptz,
  evidence_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deletion requests"
  ON public.deletion_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
  ON public.deletion_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- 3. Anonymization job log
CREATE TABLE public.anonymization_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.retention_policies(id),
  target_table text NOT NULL,
  records_processed integer NOT NULL DEFAULT 0,
  records_anonymized integer NOT NULL DEFAULT 0,
  records_deleted integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anonymization_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage anonymization jobs"
  ON public.anonymization_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Security / privacy incidents
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  incident_type text NOT NULL DEFAULT 'security' CHECK (incident_type IN ('security', 'privacy', 'breach', 'policy_violation', 'system_error')),
  description text,
  affected_data_categories text[] DEFAULT '{}',
  affected_records_count integer DEFAULT 0,
  suspected_cause text,
  containment_actions text,
  resolution_summary text,
  notification_status text DEFAULT 'not_required' CHECK (notification_status IN ('not_required', 'pending', 'notified', 'waived')),
  timeline_events jsonb DEFAULT '[]',
  internal_notes text,
  evidence_urls text[] DEFAULT '{}',
  reported_by uuid,
  assigned_to uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security incidents"
  ON public.security_incidents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Seed default retention policies
INSERT INTO public.retention_policies (data_type, display_name_en, display_name_th, classification, retention_days, action, applies_to_table, description_en, description_th) VALUES
  ('selftest_images', 'HIV Self-test Images', 'รูปภาพตรวจ HIV', 'highly_restricted', 30, 'delete', 'hiv_selftest_requests', 'Uploaded result photos — delete after analysis', 'รูปถ่ายผลตรวจ — ลบหลังวิเคราะห์'),
  ('export_files', 'Temporary Export Files', 'ไฟล์ส่งออกชั่วคราว', 'sensitive', 7, 'delete', NULL, 'CSV/PDF exports — short-lived', 'ไฟล์ส่งออก CSV/PDF — อายุสั้น'),
  ('consultation_notes', 'Consultation Notes', 'บันทึกการปรึกษา', 'sensitive', 180, 'anonymize', 'clinic_encounters', 'Clinical notes — anonymize after 6 months', 'บันทึกคลินิก — ลบข้อมูลระบุตัวตนหลัง 6 เดือน'),
  ('security_logs', 'Security Audit Logs', 'บันทึกตรวจสอบความปลอดภัย', 'internal', 730, 'archive', 'pdpa_audit_logs', 'Security logs — retain 2 years', 'บันทึกความปลอดภัย — เก็บ 2 ปี'),
  ('analytics_events', 'Analytics Events', 'ข้อมูลวิเคราะห์', 'internal', 365, 'delete', 'analytics_events', 'Page views — delete after 1 year', 'ข้อมูลเข้าชม — ลบหลัง 1 ปี'),
  ('inactive_accounts', 'Inactive User Accounts', 'บัญชีที่ไม่ได้ใช้งาน', 'personal', 730, 'anonymize', 'profiles', 'Accounts inactive 2+ years', 'บัญชีที่ไม่ได้ใช้งาน 2 ปีขึ้นไป'),
  ('chat_messages', 'Chat Messages', 'ข้อความแชท', 'personal', 365, 'delete', 'chat_messages', 'Chat history — delete after 1 year', 'ประวัติแชท — ลบหลัง 1 ปี'),
  ('consent_records', 'Consent Records', 'บันทึกความยินยอม', 'internal', 1825, 'archive', 'consent_records', 'Consent evidence — retain 5 years', 'หลักฐานความยินยอม — เก็บ 5 ปี')
ON CONFLICT DO NOTHING;

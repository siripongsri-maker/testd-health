
-- ============================================================
-- PDPA Phase 2: Permission Matrix + Staff Governance
-- ============================================================

-- 1. Permission matrix — defines what each role can do per module
CREATE TABLE public.permission_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  can_reveal_pii BOOLEAN NOT NULL DEFAULT false,
  field_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  branch_scoped BOOLEAN NOT NULL DEFAULT false,
  requires_reason BOOLEAN NOT NULL DEFAULT false,
  data_classification TEXT NOT NULL DEFAULT 'internal',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (role, module)
);

ALTER TABLE public.permission_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage permission matrix"
  ON public.permission_matrix FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow all authenticated to read (needed for permission checks)
CREATE POLICY "Authenticated read permission matrix"
  ON public.permission_matrix FOR SELECT
  TO authenticated
  USING (true);

-- 2. Staff access sessions — track active staff sessions for governance
CREATE TABLE public.staff_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  branch TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  device_info TEXT,
  ip_hint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_token_hash TEXT,
  force_logout BOOLEAN NOT NULL DEFAULT false,
  force_logout_reason TEXT
);

ALTER TABLE public.staff_access_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff sessions"
  ON public.staff_access_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff see own sessions"
  ON public.staff_access_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Suspicious activity alerts
CREATE TABLE public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  actor_id UUID,
  actor_role TEXT,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  branch TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage security alerts"
  ON public.security_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Seed default permission matrix for all roles
INSERT INTO public.permission_matrix (role, module, can_view, can_create, can_update, can_delete, can_export, can_reveal_pii, field_visibility, branch_scoped, requires_reason, data_classification) VALUES
-- Admin: full access
('admin', 'users', true, true, true, true, true, true, '{"email":true,"phone":true,"national_id":true,"address":true}'::jsonb, false, false, 'personal'),
('admin', 'kit_orders', true, true, true, true, true, true, '{"full_name":true,"address":true,"phone":true,"national_id":true,"result_image":true}'::jsonb, false, false, 'sensitive'),
('admin', 'appointments', true, true, true, true, true, true, '{"contact_email":true,"contact_phone":true,"staff_notes":true}'::jsonb, false, false, 'personal'),
('admin', 'health_profiles', true, false, false, false, true, true, '{"hiv_status":true,"prep_status":true,"test_results":true}'::jsonb, false, true, 'highly_restricted'),
('admin', 'audit_logs', true, false, false, false, true, false, '{}'::jsonb, false, false, 'restricted'),
('admin', 'consent_records', true, false, false, false, true, false, '{}'::jsonb, false, false, 'restricted'),
('admin', 'blog', true, true, true, true, true, false, '{}'::jsonb, false, false, 'public'),
('admin', 'surveys', true, true, true, true, true, false, '{}'::jsonb, false, false, 'internal'),
('admin', 'analytics', true, false, false, false, true, false, '{}'::jsonb, false, false, 'internal'),
('admin', 'harm_reduction', true, true, true, true, true, false, '{}'::jsonb, false, false, 'sensitive'),
('admin', 'pdpa_compliance', true, true, true, false, true, false, '{}'::jsonb, false, false, 'restricted'),

-- Moderator: branch-scoped operations
('moderator', 'kit_orders', true, true, true, false, false, false, '{"full_name":true,"address":true,"phone":false,"national_id":false,"result_image":true}'::jsonb, true, false, 'sensitive'),
('moderator', 'appointments', true, true, true, false, false, false, '{"contact_email":true,"contact_phone":true,"staff_notes":true}'::jsonb, true, false, 'personal'),
('moderator', 'users', false, false, false, false, false, false, '{}'::jsonb, true, false, 'personal'),
('moderator', 'blog', true, false, false, false, false, false, '{}'::jsonb, false, false, 'public'),

-- M&E Analyst: read-only aggregated
('me_analyst', 'analytics', true, false, false, false, true, false, '{}'::jsonb, false, false, 'internal'),
('me_analyst', 'kit_orders', true, false, false, false, true, false, '{"full_name":false,"address":false,"phone":false,"national_id":false,"result_image":false}'::jsonb, false, false, 'sensitive'),
('me_analyst', 'appointments', true, false, false, false, true, false, '{"contact_email":false,"contact_phone":false,"staff_notes":false}'::jsonb, false, false, 'personal'),
('me_analyst', 'harm_reduction', true, false, false, false, true, false, '{}'::jsonb, false, false, 'sensitive'),
('me_analyst', 'audit_logs', true, false, false, false, false, false, '{}'::jsonb, false, false, 'restricted'),
('me_analyst', 'consent_records', true, false, false, false, false, false, '{}'::jsonb, false, false, 'restricted'),
('me_analyst', 'blog', true, false, false, false, false, false, '{}'::jsonb, false, false, 'public'),
('me_analyst', 'surveys', true, false, false, false, true, false, '{}'::jsonb, false, false, 'internal')
ON CONFLICT (role, module) DO NOTHING;

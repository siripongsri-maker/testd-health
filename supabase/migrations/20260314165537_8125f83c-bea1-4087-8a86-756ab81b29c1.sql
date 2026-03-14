
-- ============================================================
-- PDPA Phase 1: Consent Management + Audit Logging
-- ============================================================

-- 1. Consent versions — tracks each published policy version
CREATE TABLE public.consent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_th TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  full_text_th TEXT NOT NULL,
  full_text_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  requires_re_consent BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (consent_type, version)
);

ALTER TABLE public.consent_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active consent versions
CREATE POLICY "Anyone can read active consent versions"
  ON public.consent_versions FOR SELECT
  USING (is_active = true);

-- Admins can manage all consent versions
CREATE POLICY "Admins manage consent versions"
  ON public.consent_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Enhance consent_records — add version tracking and snapshots
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS consent_version_id UUID REFERENCES public.consent_versions(id),
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS consent_text_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS source_page TEXT,
  ADD COLUMN IF NOT EXISTS staff_actor_id UUID,
  ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 3. PDPA Audit Logs — immutable trail for all sensitive actions
CREATE TABLE public.pdpa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL DEFAULT 'user',
  actor_id UUID,
  actor_role TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_classification TEXT,
  reason TEXT,
  branch TEXT,
  ip_hint TEXT,
  device_info TEXT,
  result TEXT NOT NULL DEFAULT 'allowed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdpa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins read audit logs"
  ON public.pdpa_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System and authenticated users can insert audit logs
CREATE POLICY "Authenticated users insert audit logs"
  ON public.pdpa_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Data classification registry
CREATE TABLE public.data_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT,
  classification TEXT NOT NULL DEFAULT 'internal',
  description TEXT,
  requires_consent_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (table_name, column_name)
);

ALTER TABLE public.data_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage data classifications"
  ON public.data_classifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. PDPA feature flag
INSERT INTO public.app_feature_flags (flag_key, enabled)
VALUES ('pdpa_compliance', false)
ON CONFLICT (flag_key) DO NOTHING;

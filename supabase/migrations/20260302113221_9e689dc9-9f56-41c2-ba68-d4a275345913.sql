
-- App release controls table for admin-managed update config
CREATE TABLE public.app_release_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  latest_version text NOT NULL DEFAULT '1.0.0',
  build_time text,
  hard_update_min_version text,
  is_hard_update boolean NOT NULL DEFAULT false,
  message_th text DEFAULT 'มีเวอร์ชันใหม่พร้อมใช้งาน',
  message_en text DEFAULT 'A new version is available',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_release_controls ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage release controls"
  ON public.app_release_controls
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous read for version checking (public endpoint)
CREATE POLICY "Anyone can read latest release info"
  ON public.app_release_controls
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Audit log for release control changes
CREATE TABLE public.release_control_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb
);

ALTER TABLE public.release_control_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON public.release_control_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.release_control_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

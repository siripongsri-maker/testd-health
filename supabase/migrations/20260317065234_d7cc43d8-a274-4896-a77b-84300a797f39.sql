
CREATE TABLE IF NOT EXISTS public.mel_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL CHECK (action_type IN ('single_delete', 'clear_all')),
  source_table TEXT NOT NULL,
  record_id TEXT,
  record_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.mel_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage mel_deletion_audit"
  ON public.mel_deletion_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ME analyst can read mel_deletion_audit"
  ON public.mel_deletion_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'me_analyst'));

CREATE POLICY "Moderator can manage mel_deletion_audit"
  ON public.mel_deletion_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

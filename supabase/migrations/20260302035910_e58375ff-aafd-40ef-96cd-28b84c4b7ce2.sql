
-- Import batch history
CREATE TABLE public.selftest_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  filename text NOT NULL,
  source_type text NOT NULL DEFAULT 'unknown',
  total_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  notes text,
  is_dry_run boolean NOT NULL DEFAULT false
);

ALTER TABLE public.selftest_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import batches"
  ON public.selftest_import_batches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Import row-level results
CREATE TABLE public.selftest_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.selftest_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  outcome text NOT NULL DEFAULT 'inserted',
  error_message text,
  external_ref text
);

ALTER TABLE public.selftest_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import rows"
  ON public.selftest_import_rows FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Export audit log
CREATE TABLE public.export_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  export_type text NOT NULL,
  batch_id uuid REFERENCES public.selftest_import_batches(id),
  filters jsonb,
  row_count integer,
  is_full_export boolean NOT NULL DEFAULT false
);

ALTER TABLE public.export_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage export logs"
  ON public.export_audit_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_import_rows_batch ON public.selftest_import_rows(batch_id);
CREATE INDEX idx_import_batches_branch ON public.selftest_import_batches(branch);
CREATE INDEX idx_import_batches_uploaded_at ON public.selftest_import_batches(uploaded_at DESC);

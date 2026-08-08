CREATE TABLE public.seo_outreach_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  task_type text NOT NULL DEFAULT 'followup',
  title text,
  due_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  response_outcome text,
  responded_on date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_outreach_tasks TO authenticated;
GRANT ALL ON public.seo_outreach_tasks TO service_role;
ALTER TABLE public.seo_outreach_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage outreach tasks" ON public.seo_outreach_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX seo_outreach_tasks_due_idx ON public.seo_outreach_tasks (status, due_on);
CREATE INDEX seo_outreach_tasks_domain_idx ON public.seo_outreach_tasks (domain);
CREATE TRIGGER seo_outreach_tasks_updated_at BEFORE UPDATE ON public.seo_outreach_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
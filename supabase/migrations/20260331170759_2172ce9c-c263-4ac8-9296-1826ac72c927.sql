
CREATE TABLE public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous_token text,
  staff_id uuid NOT NULL,
  branch_id uuid REFERENCES public.booking_branches(id),
  note_type text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  linked_appointment_id uuid REFERENCES public.appointments(id),
  linked_service_event_id uuid REFERENCES public.service_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on case_notes"
  ON public.case_notes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff insert own case_notes"
  ON public.case_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff read case_notes for own branch"
  ON public.case_notes
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      branch_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.staff_branch_assignments sba
        JOIN public.booking_branches bb ON bb.slug = sba.branch
        WHERE sba.user_id = auth.uid()
          AND bb.id = case_notes.branch_id
      )
    )
  );


-- ============ 1. Security definer: branch access check ============
CREATE OR REPLACE FUNCTION public.user_can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _branch_id IS NOT NULL AND (
      public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'me_analyst'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.staff_profiles sp
        WHERE sp.user_id = _user_id
          AND sp.branch_id = _branch_id
          AND sp.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM public.staff_branch_assignments sba
        WHERE sba.user_id = _user_id
          AND sba.branch = _branch_id::text
      )
    )
$$;

-- Helper: is user any branch counselor (moderator / staff with a branch)?
CREATE OR REPLACE FUNCTION public.is_branch_counselor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'moderator'::app_role)
    OR EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = _user_id AND sp.is_active = true AND sp.branch_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.staff_branch_assignments sba WHERE sba.user_id = _user_id)
$$;

-- ============ 2. Extend survey read policy to branch counselors ============
DROP POLICY IF EXISTS "Branch counselors read own-branch pre-service surveys" ON public.appointment_pre_service_surveys;
CREATE POLICY "Branch counselors read own-branch pre-service surveys"
ON public.appointment_pre_service_surveys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_pre_service_surveys.booking_id
      AND a.branch_id IS NOT NULL
      AND public.user_can_access_branch(auth.uid(), a.branch_id)
  )
);

-- ============ 3. Counseling notes table ============
CREATE TABLE IF NOT EXISTS public.pre_service_counseling_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL UNIQUE REFERENCES public.appointment_pre_service_surveys(id) ON DELETE CASCADE,
  branch_id uuid,
  status text NOT NULL DEFAULT 'not_reviewed',
  notes text,
  next_step text,
  follow_up_required boolean NOT NULL DEFAULT false,
  assigned_counselor_id uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_service_counseling_notes_status_chk CHECK (
    status IN (
      'not_reviewed',
      'counseling_completed',
      'prep_pep_discussed',
      'hiv_test_recommended',
      'referred_to_clinic',
      'follow_up_needed',
      'case_closed'
    )
  )
);

CREATE INDEX IF NOT EXISTS pre_service_counseling_notes_branch_idx ON public.pre_service_counseling_notes(branch_id);
CREATE INDEX IF NOT EXISTS pre_service_counseling_notes_status_idx ON public.pre_service_counseling_notes(status);
CREATE INDEX IF NOT EXISTS pre_service_counseling_notes_survey_idx ON public.pre_service_counseling_notes(survey_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_service_counseling_notes TO authenticated;
GRANT ALL ON public.pre_service_counseling_notes TO service_role;

ALTER TABLE public.pre_service_counseling_notes ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Admins read all counseling notes"
ON public.pre_service_counseling_notes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
);

CREATE POLICY "Branch staff read own-branch counseling notes"
ON public.pre_service_counseling_notes
FOR SELECT
TO authenticated
USING (
  branch_id IS NOT NULL
  AND public.user_can_access_branch(auth.uid(), branch_id)
);

-- Insert policy — must supply a branch the user can access
CREATE POLICY "Authorized staff create counseling notes"
ON public.pre_service_counseling_notes
FOR INSERT
TO authenticated
WITH CHECK (
  branch_id IS NOT NULL
  AND public.user_can_access_branch(auth.uid(), branch_id)
  AND (updated_by IS NULL OR updated_by = auth.uid())
);

-- Update policy
CREATE POLICY "Authorized staff update own-branch counseling notes"
ON public.pre_service_counseling_notes
FOR UPDATE
TO authenticated
USING (
  branch_id IS NOT NULL
  AND public.user_can_access_branch(auth.uid(), branch_id)
)
WITH CHECK (
  branch_id IS NOT NULL
  AND public.user_can_access_branch(auth.uid(), branch_id)
);

-- Delete policy (admins only)
CREATE POLICY "Admins delete counseling notes"
ON public.pre_service_counseling_notes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.pre_service_counseling_notes_touch()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pre_service_counseling_notes_touch_trg ON public.pre_service_counseling_notes;
CREATE TRIGGER pre_service_counseling_notes_touch_trg
BEFORE UPDATE ON public.pre_service_counseling_notes
FOR EACH ROW EXECUTE FUNCTION public.pre_service_counseling_notes_touch();

-- Auto-populate branch_id from the linked appointment when not provided
CREATE OR REPLACE FUNCTION public.pre_service_counseling_notes_set_branch()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE _branch uuid;
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT a.branch_id INTO _branch
    FROM public.appointment_pre_service_surveys s
    JOIN public.appointments a ON a.id = s.booking_id
    WHERE s.id = NEW.survey_id
    LIMIT 1;
    NEW.branch_id := _branch;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pre_service_counseling_notes_set_branch_trg ON public.pre_service_counseling_notes;
CREATE TRIGGER pre_service_counseling_notes_set_branch_trg
BEFORE INSERT ON public.pre_service_counseling_notes
FOR EACH ROW EXECUTE FUNCTION public.pre_service_counseling_notes_set_branch();

-- ============ 4. Realtime ============
DO $$ BEGIN
  BEGIN EXECUTE 'ALTER TABLE public.pre_service_counseling_notes REPLICA IDENTITY FULL'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_service_counseling_notes'; EXCEPTION WHEN others THEN NULL; END;
END $$;

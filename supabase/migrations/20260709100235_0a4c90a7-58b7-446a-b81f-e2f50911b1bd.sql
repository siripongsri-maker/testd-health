
CREATE TABLE IF NOT EXISTS public.counselor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  nickname text,
  branch_id uuid REFERENCES public.booking_branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counselor_profiles_branch_idx ON public.counselor_profiles(branch_id);
CREATE INDEX IF NOT EXISTS counselor_profiles_active_idx ON public.counselor_profiles(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.counselor_profiles TO authenticated;
GRANT ALL ON public.counselor_profiles TO service_role;

ALTER TABLE public.counselor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage counselor profiles" ON public.counselor_profiles;
CREATE POLICY "Admins manage counselor profiles"
ON public.counselor_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Counselor reads own profile" ON public.counselor_profiles;
CREATE POLICY "Counselor reads own profile"
ON public.counselor_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_counselor_profiles_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_counselor_profiles_updated_at ON public.counselor_profiles;
CREATE TRIGGER trg_counselor_profiles_updated_at
BEFORE UPDATE ON public.counselor_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_counselor_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.user_can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _branch_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'me_analyst'::app_role)
    OR EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = _user_id AND sp.branch_id = _branch_id AND sp.is_active = true)
    OR EXISTS (SELECT 1 FROM public.staff_branch_assignments sba WHERE sba.user_id = _user_id AND sba.branch = _branch_id::text)
    OR EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.user_id = _user_id AND cp.branch_id = _branch_id AND cp.is_active = true)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_branch_counselor(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'moderator'::app_role)
    OR public.has_role(_user_id, 'counselor'::app_role)
    OR EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = _user_id AND sp.is_active = true AND sp.branch_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.staff_branch_assignments sba WHERE sba.user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.counselor_profiles cp WHERE cp.user_id = _user_id AND cp.is_active = true)
$$;

DROP POLICY IF EXISTS "Authorized staff update counseling notes" ON public.pre_service_counseling_notes;
CREATE POLICY "Authorized staff update counseling notes"
ON public.pre_service_counseling_notes
FOR UPDATE TO authenticated
USING (branch_id IS NOT NULL AND public.user_can_access_branch(auth.uid(), branch_id))
WITH CHECK (branch_id IS NOT NULL AND public.user_can_access_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Only admins delete counseling notes" ON public.pre_service_counseling_notes;
CREATE POLICY "Only admins delete counseling notes"
ON public.pre_service_counseling_notes
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

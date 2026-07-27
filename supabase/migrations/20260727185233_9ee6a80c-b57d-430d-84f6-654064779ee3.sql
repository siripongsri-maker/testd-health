-- 1) Blog cover image upload: remove role-less policy (admin-only policy already exists)
DROP POLICY IF EXISTS "Authors can upload blog cover images" ON storage.objects;

-- 2) Harm reduction sub-tables: restrict anon inserts to recent, in-progress anonymous screenings
CREATE OR REPLACE FUNCTION public.is_open_anon_screening(_screening_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hr_screenings s
    WHERE s.id = _screening_id
      AND s.user_id IS NULL
      AND s.anonymous_token IS NOT NULL
      AND s.completed_at IS NULL
      AND s.created_at > now() - interval '6 hours'
  )
$$;

REVOKE ALL ON FUNCTION public.is_open_anon_screening(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_open_anon_screening(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anon insert mental health" ON public.hr_mental_health;
CREATE POLICY "Anon insert mental health"
ON public.hr_mental_health FOR INSERT TO anon
WITH CHECK (public.is_open_anon_screening(screening_id));

DROP POLICY IF EXISTS "Anon insert sexual health" ON public.hr_sexual_health;
CREATE POLICY "Anon insert sexual health"
ON public.hr_sexual_health FOR INSERT TO anon
WITH CHECK (public.is_open_anon_screening(screening_id));

DROP POLICY IF EXISTS "Anon insert harm history" ON public.hr_harm_history;
CREATE POLICY "Anon insert harm history"
ON public.hr_harm_history FOR INSERT TO anon
WITH CHECK (public.is_open_anon_screening(screening_id));

DROP POLICY IF EXISTS "Anon insert substance use" ON public.hr_substance_use;
CREATE POLICY "Anon insert substance use"
ON public.hr_substance_use FOR INSERT TO anon
WITH CHECK (public.is_open_anon_screening(screening_id));
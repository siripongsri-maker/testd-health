CREATE OR REPLACE FUNCTION public.get_safe_space_session_public(p_session_id uuid)
RETURNS TABLE(id uuid, session_date date, session_title_th text, location text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.session_date::date, s.session_title_th, s.location
  FROM public.support_sessions s
  WHERE s.id = p_session_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_safe_space_session_public(uuid) TO anon, authenticated;
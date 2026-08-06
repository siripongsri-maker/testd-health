REVOKE ALL ON FUNCTION public.note_appointment_id(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.note_appointment_id(uuid) TO service_role;
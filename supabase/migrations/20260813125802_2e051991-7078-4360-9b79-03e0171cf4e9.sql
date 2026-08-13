GRANT INSERT ON public.safe_space_quiz_responses TO anon, authenticated;
GRANT SELECT ON public.safe_space_quiz_responses TO authenticated;
GRANT UPDATE ON public.safe_space_quiz_responses TO authenticated;
GRANT ALL ON public.safe_space_quiz_responses TO service_role;

GRANT INSERT ON public.safe_space_qr_scans TO anon, authenticated;
GRANT SELECT ON public.safe_space_qr_scans TO authenticated;
GRANT ALL ON public.safe_space_qr_scans TO service_role;
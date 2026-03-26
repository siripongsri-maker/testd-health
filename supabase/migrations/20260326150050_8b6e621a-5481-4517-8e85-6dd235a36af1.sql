
-- Fix function search_path for all 8 functions missing it
ALTER FUNCTION public.create_anonymous_appointment SET search_path = public;
ALTER FUNCTION public.create_appointment_atomic SET search_path = public;
ALTER FUNCTION public.delete_email SET search_path = public;
ALTER FUNCTION public.enqueue_email SET search_path = public;
ALTER FUNCTION public.get_available_slots SET search_path = public;
ALTER FUNCTION public.get_available_slots_dbg SET search_path = public;
ALTER FUNCTION public.move_to_dlq SET search_path = public;
ALTER FUNCTION public.read_email_batch SET search_path = public;

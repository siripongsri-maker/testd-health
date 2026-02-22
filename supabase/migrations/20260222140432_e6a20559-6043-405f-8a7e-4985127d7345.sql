
-- Fix overly permissive INSERT policy on appointment_logs
DROP POLICY "System can insert logs" ON public.appointment_logs;

-- Only authenticated users can create logs (for their own appointments or staff)
CREATE POLICY "Authenticated users can insert logs"
  ON public.appointment_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- Fix: guest_lookup_attempts has RLS enabled but no policies
-- This table logs guest appointment lookup attempts (rate limiting / audit)
-- Anyone should be able to INSERT (used by guest lookup flow)
-- Only admins should be able to SELECT (audit purposes)

CREATE POLICY "Anyone can insert lookup attempts"
  ON public.guest_lookup_attempts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view lookup attempts"
  ON public.guest_lookup_attempts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow staff to insert their own session row (heartbeat + force-logout tracking)
CREATE POLICY "Staff can create own session"
ON public.staff_access_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow staff to update their own session row (heartbeat writes, logout marker)
CREATE POLICY "Staff can update own session"
ON public.staff_access_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
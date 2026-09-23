DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.client_feedback_responses;

CREATE POLICY "Clients can submit unattributed feedback"
ON public.client_feedback_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  appointment_id IS NULL
  AND booking_id IS NULL
  AND staff_id IS NULL
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (created_by IS NULL OR created_by = auth.uid())
  AND (branch_id IS NULL OR EXISTS (
    SELECT 1
    FROM public.booking_branches b
    WHERE b.id = branch_id
  ))
);
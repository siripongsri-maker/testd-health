-- Allow users to update their own survey responses (to set completed_at)
CREATE POLICY "Users can update their own responses"
ON public.survey_responses
FOR UPDATE
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

-- Allow admins to update responses
CREATE POLICY "Admins can update all responses"
ON public.survey_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);
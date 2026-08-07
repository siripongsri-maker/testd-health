
CREATE POLICY "Branch counselors read own-branch appointments"
ON public.appointments FOR SELECT TO authenticated
USING (branch_id IS NOT NULL AND public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id));

CREATE POLICY "Branch counselors read own-branch visits"
ON public.client_visit_flows FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id));

CREATE POLICY "Branch counselors read own-branch visit steps"
ON public.client_visit_flow_steps FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id));

CREATE POLICY "Branch counselors update own-branch visit steps"
ON public.client_visit_flow_steps FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id))
WITH CHECK (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id));

CREATE POLICY "Branch counselors update own-branch visits"
ON public.client_visit_flows FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id))
WITH CHECK (public.has_role(auth.uid(),'counselor'::app_role) AND public.user_can_access_branch(auth.uid(), branch_id));

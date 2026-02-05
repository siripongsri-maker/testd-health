-- Add assigned_branch column to hiv_selftest_requests
ALTER TABLE public.hiv_selftest_requests 
ADD COLUMN IF NOT EXISTS assigned_branch TEXT DEFAULT 'silom';

-- Create index for efficient branch-based queries
CREATE INDEX IF NOT EXISTS idx_hiv_selftest_requests_branch 
ON public.hiv_selftest_requests(assigned_branch);

-- Create a branch staff role
-- Note: 'user' role already exists in app_role enum, we'll use user_roles with metadata

-- Create a table to store branch assignments for staff
CREATE TABLE IF NOT EXISTS public.staff_branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch)
);

-- Enable RLS on staff_branch_assignments
ALTER TABLE public.staff_branch_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all branch assignments
CREATE POLICY "Admins can manage branch assignments"
ON public.staff_branch_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can see their own branch assignments
CREATE POLICY "Users can view own branch assignments"
ON public.staff_branch_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check if user is assigned to a branch
CREATE OR REPLACE FUNCTION public.is_branch_staff(_user_id UUID, _branch TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_branch_assignments
    WHERE user_id = _user_id
      AND branch = _branch
  )
$$;

-- Update RLS policy on hiv_selftest_requests for branch-based access
-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Branch staff can view their branch requests" ON public.hiv_selftest_requests;
DROP POLICY IF EXISTS "Branch staff can update their branch requests" ON public.hiv_selftest_requests;

-- Branch staff can view requests for their assigned branch
CREATE POLICY "Branch staff can view their branch requests"
ON public.hiv_selftest_requests
FOR SELECT
USING (
  -- User owns the request
  auth.uid() = user_id
  OR 
  -- User is admin (can see all)
  public.has_role(auth.uid(), 'admin')
  OR
  -- User is branch staff for this request's branch
  EXISTS (
    SELECT 1 FROM public.staff_branch_assignments
    WHERE user_id = auth.uid()
    AND branch = hiv_selftest_requests.assigned_branch
  )
);

-- Branch staff can update requests for their assigned branch
CREATE POLICY "Branch staff can update their branch requests"
ON public.hiv_selftest_requests
FOR UPDATE
USING (
  -- User is admin (can update all)
  public.has_role(auth.uid(), 'admin')
  OR
  -- User is branch staff for this request's branch
  EXISTS (
    SELECT 1 FROM public.staff_branch_assignments
    WHERE user_id = auth.uid()
    AND branch = hiv_selftest_requests.assigned_branch
  )
);
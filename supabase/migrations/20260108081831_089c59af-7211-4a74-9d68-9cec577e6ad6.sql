-- Create admin_requests table for users who want to become admins
CREATE TABLE public.admin_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own request
CREATE POLICY "Users can create their own admin request"
ON public.admin_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own request
CREATE POLICY "Users can view their own admin request"
ON public.admin_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all admin requests"
ON public.admin_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update admin requests"
ON public.admin_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create function to auto-assign admin role to super admin email on signup
CREATE OR REPLACE FUNCTION public.check_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the super admin email
  IF NEW.email = 'siripong.sri@swingth.org' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
CREATE TRIGGER on_auth_user_created_check_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.check_super_admin();
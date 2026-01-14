-- Update the check_super_admin function to recognize the admin username
CREATE OR REPLACE FUNCTION public.check_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the super admin (either by email pattern or direct email)
  IF NEW.email = 'admin@swingth.org' OR NEW.email = 'admin_2004@swingth.local' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Make sure trigger exists for super admin check
DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_super_admin();
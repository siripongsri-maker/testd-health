
-- Enable RLS on hiv_self_test_checks
ALTER TABLE public.hiv_self_test_checks ENABLE ROW LEVEL SECURITY;

-- Users can view their own test checks
CREATE POLICY "Users can view their own test checks"
  ON public.hiv_self_test_checks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own test checks
CREATE POLICY "Users can insert their own test checks"
  ON public.hiv_self_test_checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own test checks (e.g. marking result as wrong)
CREATE POLICY "Users can update their own test checks"
  ON public.hiv_self_test_checks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all test checks
CREATE POLICY "Admins can view all test checks"
  ON public.hiv_self_test_checks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all test checks
CREATE POLICY "Admins can update all test checks"
  ON public.hiv_self_test_checks
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

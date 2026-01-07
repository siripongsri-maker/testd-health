-- Create table for HIV self-test kit requests
CREATE TABLE public.hiv_selftest_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT,
  phone TEXT,
  line_id TEXT,
  address TEXT,
  province TEXT,
  postal_code TEXT,
  last_risk_date DATE,
  days_since_risk INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  result_photo_url TEXT,
  test_result TEXT,
  staff_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hiv_selftest_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requests"
ON public.hiv_selftest_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
ON public.hiv_selftest_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
ON public.hiv_selftest_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.hiv_selftest_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Admins can update all requests
CREATE POLICY "Admins can update all requests"
ON public.hiv_selftest_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create storage bucket for result photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('selftest-results', 'selftest-results', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for result photos
CREATE POLICY "Users can upload their own result photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'selftest-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own result photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'selftest-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all result photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'selftest-results' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_hiv_selftest_requests_updated_at
BEFORE UPDATE ON public.hiv_selftest_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
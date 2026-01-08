-- Create a separate table for personally identifiable information (PII)
-- This separates identity from health status for better security
CREATE TABLE public.selftest_pii (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    full_name text,
    thai_id text,
    phone text,
    line_id text,
    address text,
    province text,
    postal_code text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on PII table
ALTER TABLE public.selftest_pii ENABLE ROW LEVEL SECURITY;

-- Users can only access their own PII
CREATE POLICY "Users can view their own PII"
ON public.selftest_pii
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PII"
ON public.selftest_pii
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PII"
ON public.selftest_pii
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view PII for support purposes (but logged)
CREATE POLICY "Admins can view PII"
ON public.selftest_pii
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add foreign key reference from hiv_selftest_requests to selftest_pii
ALTER TABLE public.hiv_selftest_requests 
ADD COLUMN pii_id uuid REFERENCES public.selftest_pii(id);

-- Create index for better performance
CREATE INDEX idx_selftest_pii_user_id ON public.selftest_pii(user_id);
CREATE INDEX idx_hiv_selftest_requests_pii_id ON public.hiv_selftest_requests(pii_id);

-- Add trigger for updated_at
CREATE TRIGGER update_selftest_pii_updated_at
BEFORE UPDATE ON public.selftest_pii
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
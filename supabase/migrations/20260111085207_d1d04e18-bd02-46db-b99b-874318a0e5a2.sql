-- Create user_personal_info table for complete health profile data
CREATE TABLE public.user_personal_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Basic demographics
  date_of_birth DATE,
  gender TEXT,
  sexual_orientation TEXT,
  province TEXT,
  
  -- Contact info
  phone TEXT,
  line_id TEXT,
  
  -- Health preferences and history
  prevention_preference TEXT, -- 'prep_daily', 'prep_on_demand', 'pep', 'art', 'none'
  currently_on_prep BOOLEAN DEFAULT false,
  currently_on_pep BOOLEAN DEFAULT false,
  currently_on_art BOOLEAN DEFAULT false,
  
  -- HIV testing
  ever_tested_hiv BOOLEAN,
  last_hiv_test_date DATE,
  last_hiv_test_result TEXT, -- 'negative', 'positive', 'unknown'
  
  -- Risk factors (optional, sensitive)
  has_multiple_partners BOOLEAN,
  uses_condoms_regularly BOOLEAN,
  uses_injection_drugs BOOLEAN,
  partner_hiv_status TEXT, -- 'negative', 'positive', 'unknown', 'multiple_partners'
  
  -- Profile completion status
  profile_completed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_personal_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own personal info"
ON public.user_personal_info
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personal info"
ON public.user_personal_info
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal info"
ON public.user_personal_info
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view for service delivery
CREATE POLICY "Admins can view all personal info"
ON public.user_personal_info
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_user_personal_info_updated_at
BEFORE UPDATE ON public.user_personal_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
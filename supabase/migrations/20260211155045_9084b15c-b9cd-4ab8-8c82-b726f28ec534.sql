
-- Table for user medicine configurations
CREATE TABLE public.user_medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  time TIME NOT NULL DEFAULT '20:00',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for daily medication check-ins
CREATE TABLE public.medication_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medicine_id UUID REFERENCES public.user_medicines(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('taken', 'skipped', 'pending')),
  taken_at TIMESTAMP WITH TIME ZONE,
  scheduled_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, medicine_id, date)
);

-- Enable RLS
ALTER TABLE public.user_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_medicines
CREATE POLICY "Users can manage own medicines" ON public.user_medicines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS policies for medication_checkins
CREATE POLICY "Users can manage own checkins" ON public.medication_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_medicines_updated_at
  BEFORE UPDATE ON public.user_medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

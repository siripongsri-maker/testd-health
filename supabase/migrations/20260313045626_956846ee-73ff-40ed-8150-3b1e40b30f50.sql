
-- Extend followup_events with pathway linkage
ALTER TABLE public.followup_events
  ADD COLUMN IF NOT EXISTS pathway_id UUID REFERENCES public.service_pathways(id) ON DELETE SET NULL;

-- Extend service_events with HR clinical fields  
ALTER TABLE public.service_events
  ADD COLUMN IF NOT EXISTS service_category TEXT,
  ADD COLUMN IF NOT EXISTS service_subtype TEXT,
  ADD COLUMN IF NOT EXISTS screening_context TEXT,
  ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS counseling_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clinic_referral_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mental_health_referral_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_due_date DATE,
  ADD COLUMN IF NOT EXISTS service_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pathway_id UUID REFERENCES public.service_pathways(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS anonymous_token TEXT;

-- Extend clinic_encounters with HR fields
ALTER TABLE public.clinic_encounters
  ADD COLUMN IF NOT EXISTS pathway_id UUID REFERENCES public.service_pathways(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS distress_level TEXT,
  ADD COLUMN IF NOT EXISTS referral_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS referral_destination TEXT,
  ADD COLUMN IF NOT EXISTS mental_health_screened BOOLEAN DEFAULT false;

-- Enable realtime for service_pathways
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_pathways;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

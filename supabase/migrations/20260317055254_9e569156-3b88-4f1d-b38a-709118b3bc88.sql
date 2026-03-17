
ALTER TABLE public.outreach_situational_forms
  ADD COLUMN IF NOT EXISTS area_notes text,
  ADD COLUMN IF NOT EXISTS map_lat double precision,
  ADD COLUMN IF NOT EXISTS map_lng double precision,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS msw_estimated_range text,
  ADD COLUMN IF NOT EXISTS offsite_proportion text,
  ADD COLUMN IF NOT EXISTS offsite_nationalities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offsite_nationalities_other text,
  ADD COLUMN IF NOT EXISTS health_languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS health_languages_other text,
  ADD COLUMN IF NOT EXISTS population_groups text[] DEFAULT '{}';

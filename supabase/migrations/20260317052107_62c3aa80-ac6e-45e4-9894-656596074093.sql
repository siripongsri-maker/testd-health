ALTER TABLE public.outreach_situational_forms
  ADD COLUMN IF NOT EXISTS informant_type text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS informant_type_other text,
  ADD COLUMN IF NOT EXISTS nationality_other text,
  ADD COLUMN IF NOT EXISTS thai_proficiency text,
  ADD COLUMN IF NOT EXISTS primary_languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_languages_other text,
  ADD COLUMN IF NOT EXISTS comm_channels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comm_channels_other text;
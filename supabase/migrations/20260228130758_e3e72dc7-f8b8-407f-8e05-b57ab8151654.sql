
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS starts_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_responses integer DEFAULT NULL;

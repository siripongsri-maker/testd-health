-- Allow UIC values in addition to 13-digit Thai HNID.
-- UIC pattern: 2 letters (Thai or A-Z) followed by 6 digits (DDMMYY).
ALTER TABLE public.client_feedback_responses DROP CONSTRAINT IF EXISTS chk_uic_hnid_format;
ALTER TABLE public.client_feedback_responses
  ADD CONSTRAINT chk_uic_hnid_format
  CHECK (
    uic IS NULL
    OR uic ~ '^[0-9]{13}$'
    OR uic ~ '^[A-Z]{2}[0-9]{6}$'
    OR uic ~ '^[\u0E00-\u0E7F]{2}[0-9]{6}$'
  );

ALTER TABLE public.client_seed_visits DROP CONSTRAINT IF EXISTS chk_csv_uic_format;
ALTER TABLE public.client_seed_visits
  ADD CONSTRAINT chk_csv_uic_format
  CHECK (
    uic IS NULL
    OR uic ~ '^[0-9]{13}$'
    OR uic ~ '^[A-Z]{2}[0-9]{6}$'
    OR uic ~ '^[\u0E00-\u0E7F]{2}[0-9]{6}$'
  );
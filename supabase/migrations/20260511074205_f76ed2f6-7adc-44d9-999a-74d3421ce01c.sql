ALTER TABLE public.booking_branches
  ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER NOT NULL DEFAULT 30;

ALTER TABLE public.booking_services
  ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER NOT NULL DEFAULT 30;

UPDATE public.booking_services
  SET advance_booking_days = 90
  WHERE slug = 'followup-consultation';
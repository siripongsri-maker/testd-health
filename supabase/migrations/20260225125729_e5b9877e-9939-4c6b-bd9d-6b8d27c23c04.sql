
ALTER TABLE public.appointments DROP CONSTRAINT valid_status;
ALTER TABLE public.appointments ADD CONSTRAINT valid_status CHECK (status = ANY (ARRAY['booked','confirmed','in_progress','completed','cancelled','no_show','waiting','checked_out','arrived']));

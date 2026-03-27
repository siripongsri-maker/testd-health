
ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'ship',
  ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_location_captured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_location_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_location_status text;

-- Add coordinates to branches for geofence-based auto check-in
ALTER TABLE public.booking_branches
  ADD COLUMN IF NOT EXISTS latitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9, 6);

COMMENT ON COLUMN public.booking_branches.latitude IS 'Branch latitude for geofence-based auto check-in (WGS84)';
COMMENT ON COLUMN public.booking_branches.longitude IS 'Branch longitude for geofence-based auto check-in (WGS84)';

-- Seed approximate coordinates for active SWING branches (Bangkok / Pattaya).
-- These are public clinic locations, derived from the existing google_maps_url values.
UPDATE public.booking_branches SET latitude = 13.726200, longitude = 100.534100 WHERE slug = 'silom' AND latitude IS NULL;
UPDATE public.booking_branches SET latitude = 13.717700, longitude = 100.413500 WHERE slug = 'petchakasem' AND latitude IS NULL;
UPDATE public.booking_branches SET latitude = 13.793500, longitude = 100.547500 WHERE slug = 'saphankwai' AND latitude IS NULL;
UPDATE public.booking_branches SET latitude = 12.929900, longitude = 100.881400 WHERE slug = 'pattaya' AND latitude IS NULL;
UPDATE public.booking_branches SET latitude = 13.679500, longitude = 100.611700 WHERE slug = 'udomsuk' AND latitude IS NULL;
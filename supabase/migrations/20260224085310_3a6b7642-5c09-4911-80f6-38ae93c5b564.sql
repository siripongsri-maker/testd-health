
ALTER TABLE public.booking_branches
  ADD COLUMN hero_image_url text,
  ADD COLUMN google_place_id text,
  ADD COLUMN google_maps_url text,
  ADD COLUMN google_rating numeric(2,1),
  ADD COLUMN google_review_count integer,
  ADD COLUMN google_photo_url text;

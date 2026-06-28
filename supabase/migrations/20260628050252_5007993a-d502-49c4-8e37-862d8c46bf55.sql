
-- Tighten storage upload policy for guest result photos: require unguessable token in path
DROP POLICY IF EXISTS "Guests can upload result photos under guest folder" ON storage.objects;

CREATE POLICY "Guests can upload result photos under guest folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'selftest-results'
  AND (storage.foldername(name))[1] = 'guest'
  AND array_length(storage.foldername(name), 1) >= 2
  AND length((storage.foldername(name))[2]) >= 24
  AND (storage.foldername(name))[2] ~ '^[A-Za-z0-9_-]+$'
  AND (
    lower(right(name, 4)) = ANY (ARRAY['.jpg','.png','.heic'])
    OR lower(right(name, 5)) = ANY (ARRAY['.jpeg','.webp'])
  )
);

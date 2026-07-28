DROP POLICY IF EXISTS "Authors upload own blog cover images" ON storage.objects;
CREATE POLICY "Authors upload own blog cover images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authors update own blog cover images" ON storage.objects;
CREATE POLICY "Authors update own blog cover images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authors delete own blog cover images" ON storage.objects;
CREATE POLICY "Authors delete own blog cover images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
CREATE POLICY "Users can update own selftest results"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'selftest-results' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'selftest-results' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own selftest results"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'selftest-results' AND (auth.uid())::text = (storage.foldername(name))[1]);
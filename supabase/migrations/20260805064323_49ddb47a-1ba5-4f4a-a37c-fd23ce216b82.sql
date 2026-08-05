CREATE POLICY "identity_docs_admin_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'identity-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "identity_docs_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'identity-docs' AND has_role(auth.uid(), 'admin'::app_role));

-- Create branch-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('branch-images', 'branch-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read branch images
CREATE POLICY "Branch images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-images');

-- Allow authenticated users (admins will be checked in edge function) to upload
CREATE POLICY "Authenticated users can upload branch images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update branch images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete branch images"
ON storage.objects FOR DELETE
USING (bucket_id = 'branch-images' AND auth.role() = 'authenticated');

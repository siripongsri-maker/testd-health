
-- Fix #2: gen_random_bytes lives in extensions schema, expand search_path.
CREATE OR REPLACE FUNCTION public.mint_selftest_guest_upload_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token text;
BEGIN
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.selftest_guest_upload_tokens (token) VALUES (v_token);
  RETURN v_token;
END;
$$;

-- Fix #3: WriteArticle lets any authenticated user upload a cover to blog-images/covers/,
-- but the existing INSERT policy only allowed admins, causing RLS violations. Add a
-- narrow policy for authenticated users limited to the covers/ prefix.
DROP POLICY IF EXISTS "Authors can upload blog cover images" ON storage.objects;
CREATE POLICY "Authors can upload blog cover images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND (storage.foldername(name))[1] = 'covers'
);

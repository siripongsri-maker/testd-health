-- Create table to cache product image URLs (NOT the images themselves)
CREATE TABLE public.product_image_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL UNIQUE,
  image_url text NOT NULL,
  shopee_link text NOT NULL,
  cached_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.product_image_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cache (public product images)
CREATE POLICY "Anyone can view product image cache"
ON public.product_image_cache
FOR SELECT
USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage cache"
ON public.product_image_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product images
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Service role can upload product images
CREATE POLICY "Service role can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');
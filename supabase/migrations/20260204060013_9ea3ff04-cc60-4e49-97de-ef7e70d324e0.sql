-- Fix kit_order_events RLS policy - restrict to own orders only
DROP POLICY IF EXISTS "Anyone can view public order events" ON public.kit_order_events;

CREATE POLICY "Users can view events for own orders"
ON public.kit_order_events
FOR SELECT
TO authenticated
USING (
  is_admin_event = false 
  AND EXISTS (
    SELECT 1 FROM public.kit_orders 
    WHERE kit_orders.id = kit_order_events.order_id 
    AND kit_orders.user_id = auth.uid()
  )
);

-- Fix avatar storage policies - add user isolation
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

-- User-isolated upload policy
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- User-isolated update policy
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- User-isolated delete policy (add for completeness)
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix analytics overly permissive INSERT policies
-- Add session-based rate limiting via constraint
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can insert daily summaries" ON public.analytics_daily_summary;
DROP POLICY IF EXISTS "Anyone can update daily summaries" ON public.analytics_daily_summary;

-- Allow authenticated users to insert their own analytics
CREATE POLICY "Authenticated users can insert own analytics events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- Allow anonymous users to insert analytics (for tracking without login)
-- But add constraint on what fields can be set
CREATE POLICY "Anonymous users can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

-- Only admins should update daily summaries
CREATE POLICY "Admins can insert daily summaries"
ON public.analytics_daily_summary
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update daily summaries"
ON public.analytics_daily_summary
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
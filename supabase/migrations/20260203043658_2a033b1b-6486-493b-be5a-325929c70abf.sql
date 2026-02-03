-- =================================================
-- FIX 1: kit_orders - Remove public SELECT access, create secure tracking view
-- =================================================

-- Drop the overly permissive policy that exposes all order data
DROP POLICY IF EXISTS "Anyone can view order by code" ON public.kit_orders;

-- Create a restricted view for public order tracking (only non-PII fields)
-- This allows users to track orders by code without exposing sensitive delivery info
CREATE OR REPLACE VIEW public.kit_order_tracking 
WITH (security_invoker = on) AS
SELECT 
  order_code,
  status,
  display_name,
  shipping_carrier,
  tracking_number,
  tracking_url,
  created_at,
  updated_at,
  packed_at,
  shipped_at,
  out_for_delivery_at,
  delivered_at,
  received_at
FROM public.kit_orders;
-- NOTE: This view intentionally excludes: id, user_id, recipient_name, recipient_phone, 
-- recipient_address, internal_notes, created_by, last_updated_by

-- Grant SELECT on the tracking view to everyone (for order code lookup)
GRANT SELECT ON public.kit_order_tracking TO anon, authenticated;

-- =================================================
-- FIX 2: profiles - Require authentication for leaderboard access
-- =================================================

-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;

-- Create a properly restricted policy requiring authentication
CREATE POLICY "Authenticated users can view profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Note: The leaderboard_profiles view already uses security_invoker=on,
-- so it will inherit this restriction automatically
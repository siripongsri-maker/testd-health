-- Create enum for order status
CREATE TYPE public.kit_order_status AS ENUM (
  'requested',
  'packed', 
  'shipped',
  'out_for_delivery',
  'delivered_unconfirmed',
  'received_confirmed'
);

-- Create kit_orders table
CREATE TABLE public.kit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Recipient info
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT NOT NULL,
  
  -- Order details
  order_type TEXT NOT NULL DEFAULT 'selfcare_kit',
  display_name TEXT NOT NULL DEFAULT 'Self-care kit',
  status kit_order_status NOT NULL DEFAULT 'requested',
  
  -- Shipping info
  shipping_carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  
  -- Internal notes (admin only)
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id),
  last_updated_by UUID REFERENCES auth.users(id)
);

-- Create order timeline events table
CREATE TABLE public.kit_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.kit_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_admin_event BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_order_events ENABLE ROW LEVEL SECURITY;

-- Generate order code function
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM kit_orders WHERE order_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate order code
CREATE OR REPLACE FUNCTION public.set_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
    NEW.order_code := generate_order_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_order_code
BEFORE INSERT ON public.kit_orders
FOR EACH ROW
EXECUTE FUNCTION set_order_code();

-- Trigger to update updated_at
CREATE TRIGGER update_kit_orders_updated_at
BEFORE UPDATE ON public.kit_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for kit_orders

-- Admins can do everything
CREATE POLICY "Admins can manage all kit orders"
ON public.kit_orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.kit_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view order by order_code (for anonymous tracking)
CREATE POLICY "Anyone can view order by code"
ON public.kit_orders
FOR SELECT
USING (true);

-- Users can update their own orders (for confirmation)
CREATE POLICY "Users can update their own orders"
ON public.kit_orders
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for kit_order_events

-- Admins can manage all events
CREATE POLICY "Admins can manage all order events"
ON public.kit_order_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view non-admin events for their orders
CREATE POLICY "Users can view their order events"
ON public.kit_order_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kit_orders 
    WHERE kit_orders.id = kit_order_events.order_id 
    AND (kit_orders.user_id = auth.uid() OR is_admin_event = false)
  )
);

-- Anyone can view public events by order
CREATE POLICY "Anyone can view public order events"
ON public.kit_order_events
FOR SELECT
USING (is_admin_event = false);
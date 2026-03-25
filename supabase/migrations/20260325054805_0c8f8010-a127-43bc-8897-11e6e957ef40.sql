
-- tracked_links table
CREATE TABLE public.tracked_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  destination_path text NOT NULL DEFAULT '/booking',
  campaign text,
  channel text,
  source text,
  medium text,
  content text,
  term text,
  partner_name text,
  service_focus text,
  branch_focus text,
  label text,
  expires_at timestamptz,
  click_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage tracked_links" ON public.tracked_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- visitor_attribution table
CREATE TABLE public.visitor_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  user_id uuid,
  first_touch_campaign text,
  first_touch_channel text,
  first_touch_source text,
  first_touch_medium text,
  first_touch_content text,
  first_touch_term text,
  first_touch_partner text,
  first_touch_link_id uuid REFERENCES public.tracked_links(id),
  first_touch_landing_page text,
  first_touch_referrer text,
  first_touch_at timestamptz,
  last_touch_campaign text,
  last_touch_channel text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_content text,
  last_touch_term text,
  last_touch_partner text,
  last_touch_link_id uuid REFERENCES public.tracked_links(id),
  last_touch_landing_page text,
  last_touch_referrer text,
  last_touch_at timestamptz,
  device_type text,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  total_sessions integer NOT NULL DEFAULT 1,
  UNIQUE(anonymous_id)
);

ALTER TABLE public.visitor_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitor_attribution" ON public.visitor_attribution
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can read visitor_attribution" ON public.visitor_attribution
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can update own visitor_attribution" ON public.visitor_attribution
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Extend analytics_events with attribution columns
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS anonymous_id text,
  ADD COLUMN IF NOT EXISTS event_category text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS medium text,
  ADD COLUMN IF NOT EXISTS link_id uuid,
  ADD COLUMN IF NOT EXISTS service_id text,
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS booking_id uuid;

-- RPC to increment click count (used by edge function)
CREATE OR REPLACE FUNCTION public.increment_link_click(p_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link tracked_links%ROWTYPE;
BEGIN
  UPDATE tracked_links
  SET click_count = click_count + 1
  WHERE slug = p_slug
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO v_link;

  IF v_link.id IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  RETURN json_build_object(
    'id', v_link.id,
    'destination_path', v_link.destination_path,
    'campaign', v_link.campaign,
    'channel', v_link.channel,
    'source', v_link.source,
    'medium', v_link.medium,
    'content', v_link.content,
    'term', v_link.term,
    'partner_name', v_link.partner_name
  );
END;
$$;

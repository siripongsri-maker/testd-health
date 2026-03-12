
-- Outreach contacts for backlink/authority campaign tracking
CREATE TABLE public.outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'ngo' CHECK (organization_type IN ('global_health', 'ngo', 'academic', 'media', 'community', 'government', 'other')),
  website TEXT,
  country TEXT,
  region TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_role TEXT,
  
  -- Campaign tracking
  target_asset TEXT,
  outreach_status TEXT NOT NULL DEFAULT 'identified' CHECK (outreach_status IN ('identified', 'researched', 'contacted', 'in_conversation', 'agreed', 'link_live', 'declined', 'no_response')),
  campaign_type TEXT CHECK (campaign_type IN ('resource_inclusion', 'co_branded_guide', 'data_insight', 'expert_review', 'toolkit_share', 'partnership', 'other')),
  backlink_url TEXT,
  backlink_status TEXT DEFAULT 'none' CHECK (backlink_status IN ('none', 'pending', 'live', 'removed')),
  
  -- Notes and dates
  notes TEXT,
  date_contacted TIMESTAMPTZ,
  date_responded TIMESTAMPTZ,
  date_link_live TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach contacts"
  ON public.outreach_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ME analysts can view outreach contacts"
  ON public.outreach_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'me_analyst'));

CREATE INDEX idx_outreach_contacts_status ON public.outreach_contacts(outreach_status);
CREATE INDEX idx_outreach_contacts_type ON public.outreach_contacts(organization_type);

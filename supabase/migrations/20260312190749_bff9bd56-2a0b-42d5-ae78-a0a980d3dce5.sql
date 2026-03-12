
-- Content drafts table for AI-generated harm reduction content
CREATE TABLE public.hr_content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Interaction reference
  interaction_id UUID REFERENCES public.hr_substance_interactions(id) ON DELETE SET NULL,
  substance_a_slug TEXT NOT NULL,
  substance_b_slug TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'interaction' CHECK (content_type IN ('interaction', 'substance', 'faq')),
  slug TEXT NOT NULL,
  
  -- Editorial workflow
  status TEXT NOT NULL DEFAULT 'draft_generated' CHECK (status IN ('draft_generated', 'in_review', 'needs_revision', 'approved', 'published')),
  generated_by UUID,
  reviewed_by UUID,
  approved_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  revision_note TEXT,
  
  -- Core content fields (bilingual)
  title_th TEXT,
  title_en TEXT,
  ai_summary_th TEXT,
  ai_summary_en TEXT,
  quick_facts_th JSONB DEFAULT '[]'::jsonb,
  quick_facts_en JSONB DEFAULT '[]'::jsonb,
  summary_th TEXT,
  summary_en TEXT,
  why_risky_th TEXT,
  why_risky_en TEXT,
  possible_effects_th JSONB DEFAULT '[]'::jsonb,
  possible_effects_en JSONB DEFAULT '[]'::jsonb,
  warning_signs_th JSONB DEFAULT '[]'::jsonb,
  warning_signs_en JSONB DEFAULT '[]'::jsonb,
  harm_reduction_tips_th JSONB DEFAULT '[]'::jsonb,
  harm_reduction_tips_en JSONB DEFAULT '[]'::jsonb,
  emergency_signs_th JSONB DEFAULT '[]'::jsonb,
  emergency_signs_en JSONB DEFAULT '[]'::jsonb,
  
  -- SEO fields
  seo_title_th TEXT,
  seo_title_en TEXT,
  meta_description_th TEXT,
  meta_description_en TEXT,
  faq_items_th JSONB DEFAULT '[]'::jsonb,
  faq_items_en JSONB DEFAULT '[]'::jsonb,
  
  -- Citation scaffolding
  recommended_source_types JSONB DEFAULT '[]'::jsonb,
  citation_placeholders JSONB DEFAULT '[]'::jsonb,
  authority_confidence_score NUMERIC(3,2) DEFAULT 0,
  
  -- Quality flags
  quality_flags JSONB DEFAULT '[]'::jsonb,
  validation_passed BOOLEAN DEFAULT false,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES public.hr_content_drafts(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.hr_content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content drafts"
  ON public.hr_content_drafts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ME analysts can view content drafts"
  ON public.hr_content_drafts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'me_analyst'));

-- Index
CREATE INDEX idx_hr_content_drafts_status ON public.hr_content_drafts(status);
CREATE INDEX idx_hr_content_drafts_slug ON public.hr_content_drafts(slug);

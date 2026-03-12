
-- Knowledge Graph Entity Types
CREATE TYPE public.kg_entity_type AS ENUM (
  'substance', 'substance_category', 'interaction_pair',
  'risk', 'symptom', 'withdrawal_symptom',
  'short_term_effect', 'long_term_effect', 'mental_health_effect',
  'sexual_health_concern', 'prevention_action', 'emergency_sign',
  'support_service', 'educational_topic', 'faq'
);

-- Knowledge Graph Relation Types
CREATE TYPE public.kg_relation_type AS ENUM (
  'causes', 'increases_risk_of', 'interacts_with',
  'may_lead_to', 'linked_to', 'supports',
  'treated_by', 'prevented_by', 'related_to',
  'contraindicated_with', 'category_of', 'has_symptom'
);

-- Knowledge Entities
CREATE TABLE public.hr_knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.kg_entity_type NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  summary_th TEXT,
  summary_en TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_ke_entity_type ON public.hr_knowledge_entities(entity_type);
CREATE INDEX idx_hr_ke_slug ON public.hr_knowledge_entities(slug);
CREATE INDEX idx_hr_ke_status ON public.hr_knowledge_entities(status);

-- Knowledge Relations
CREATE TABLE public.hr_knowledge_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id UUID NOT NULL REFERENCES public.hr_knowledge_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES public.hr_knowledge_entities(id) ON DELETE CASCADE,
  relation_type public.kg_relation_type NOT NULL,
  strength INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX idx_hr_kr_from ON public.hr_knowledge_relations(from_entity_id);
CREATE INDEX idx_hr_kr_to ON public.hr_knowledge_relations(to_entity_id);
CREATE INDEX idx_hr_kr_type ON public.hr_knowledge_relations(relation_type);

-- Knowledge Sources
CREATE TABLE public.hr_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  publisher TEXT,
  url TEXT,
  source_type TEXT DEFAULT 'guideline',
  authority_score INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entity-Source Links
CREATE TABLE public.hr_entity_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.hr_knowledge_entities(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.hr_knowledge_sources(id) ON DELETE CASCADE,
  citation_note TEXT,
  UNIQUE(entity_id, source_id)
);

CREATE INDEX idx_hr_esl_entity ON public.hr_entity_source_links(entity_id);

-- RLS Policies: public read, admin write
ALTER TABLE public.hr_knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_knowledge_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_entity_source_links ENABLE ROW LEVEL SECURITY;

-- Public read for all knowledge graph tables
CREATE POLICY "Public can read knowledge entities" ON public.hr_knowledge_entities FOR SELECT USING (true);
CREATE POLICY "Public can read knowledge relations" ON public.hr_knowledge_relations FOR SELECT USING (true);
CREATE POLICY "Public can read knowledge sources" ON public.hr_knowledge_sources FOR SELECT USING (true);
CREATE POLICY "Public can read entity source links" ON public.hr_entity_source_links FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admins can manage knowledge entities" ON public.hr_knowledge_entities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage knowledge relations" ON public.hr_knowledge_relations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage knowledge sources" ON public.hr_knowledge_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage entity source links" ON public.hr_entity_source_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

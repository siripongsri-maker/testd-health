
-- IP Document Sections: stores editable content for each documentation section
CREATE TABLE public.ip_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_th TEXT,
  content JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ip_document_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access ip_document_sections"
  ON public.ip_document_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- IP Contributors: creator & contributor log
CREATE TABLE public.ip_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  contribution_type TEXT,
  date_start DATE,
  date_end DATE,
  is_ip_owner BOOLEAN NOT NULL DEFAULT false,
  ownership_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ip_contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access ip_contributors"
  ON public.ip_contributors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- IP Evidence Archive: proof-of-creation materials
CREATE TABLE public.ip_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  document_date DATE,
  version TEXT,
  tags TEXT[] DEFAULT '{}',
  related_module TEXT,
  proof_relevance TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ip_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access ip_evidence"
  ON public.ip_evidence FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- IP Export Logs: track all exports
CREATE TABLE public.ip_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL,
  doc_version TEXT,
  system_version TEXT,
  exported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.ip_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access ip_export_logs"
  ON public.ip_export_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default document sections
INSERT INTO public.ip_document_sections (section_key, title_en, title_th, content, status) VALUES
  ('system_summary', 'System Summary', 'สรุประบบ', '{"product_name":"testD","tagline_th":"คนเทสต์ดีอยู่ที่นี่","purpose":"Digital sexual health and HIV prevention platform supporting self-testing access, medication adherence (PrEP/PEP), education, and community health engagement.","target_users":"MSM, transgender individuals, sex workers, migrants, and general population at risk of HIV in Thailand","public_health_use":"Supports NHSO-funded HIV self-test distribution, PrEP/PEP adherence tracking, health education delivery, and community-level health outcome monitoring","main_modules":["HIV Self-Test Kit Request & NHSO Flow","Medication Tracker (PrEP Daily, PrEP On-Demand, PEP)","Educational Content & Blog","Survey System","Gamification & Quest System","Booking & Appointment Management","Partner Invite Network","Community Chat","Analytics & Reporting","Multi-role Admin Console"],"languages":["Thai","English","Khmer","Lao","Vietnamese","Burmese"],"branches":"SWING Foundation branches (Silom, Saphan Kwai, Phetkasem, Pattaya)","privacy_approach":"Row-Level Security, encrypted PII storage, role-based access control, abuse detection, rate limiting","innovation_highlights":["AI-powered HIV test result analysis","Thai National ID OCR scanning","Gamified health adherence system","Real-time community milestones","Multi-language auto-translation engine"]}', 'draft'),
  ('feature_inventory', 'Feature Inventory', 'รายการฟีเจอร์', '{}', 'draft'),
  ('technical_summary', 'Technical Architecture', 'สรุปเทคนิค', '{"frontend":"React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui","backend":"Supabase (PostgreSQL, Auth, Edge Functions, Storage, Realtime)","database":"PostgreSQL with 50+ tables, RLS policies, database functions, triggers","authentication":"Email/password with email verification, social login support, role-based access (admin, moderator, me_analyst)","apis":["Supabase Edge Functions","Lovable AI integration (Gemini, GPT)","NHSO eligibility verification","Thai ID OCR","SMS relay"],"analytics":"Custom event tracking with session management, daily summaries, funnel visualization","notifications":"In-app notification system with read tracking, bell indicator","multilingual":"6-language support with database-backed translation cache and LLM batch translation","security":"RLS on all tables, SECURITY DEFINER functions, rate limiting, abuse detection, input validation"}', 'draft'),
  ('copyright_dossier', 'Copyright Dossier', 'เอกสารลิขสิทธิ์', '{"software_title":"testD - Digital Sexual Health Platform","creation_objective":"To create an accessible, privacy-preserving digital platform that supports HIV prevention, self-testing, medication adherence, and community health engagement in Thailand","originality_statement":"testD is an original software work combining novel approaches to gamified health adherence, AI-assisted HIV test interpretation, community milestone tracking, and multi-language health education delivery. The system architecture, user experience design, and feature integration represent original creative and technical contributions.","creator_name":"Siripong Srichau","organization":"SWING Foundation (licensee/operator)"}', 'draft'),
  ('trademark_prep', 'Trademark Preparation', 'เตรียมเครื่องหมายการค้า', '{"marks":[{"name":"testD","type":"wordmark","slogan":"คนเทสต์ดีอยู่ที่นี่","intended_use":"Digital health services platform for HIV prevention and sexual health","target_audience":"General public, healthcare seekers, community health organizations","service_category":"Class 44 (Medical services), Class 42 (Software services)","first_use_date":"2024","language_variants":["testD (English)","เทสต์ดี (Thai)"],"filing_notes":"Consider filing in both Thai and English marks separately"}]}', 'draft'),
  ('license_agreement', 'License Agreement', 'สัญญาอนุญาตใช้งาน', '{"licensor":"Siripong Srichau","licensee":"SWING Foundation","license_type":"Non-exclusive","permitted_uses":["Internal operational use","Health service delivery","Communication and outreach","Reporting and documentation"],"modification_allowed":true,"sublicensing_allowed":false,"duration":"Perpetual (subject to termination clause)","territory":"Thailand","termination_conditions":"Material breach with 30-day cure period; mutual written agreement","attribution_clause":"SWING Foundation shall acknowledge Siripong Srichau as the creator and intellectual property owner of testD in all official documentation and public communications where appropriate."}', 'draft'),
  ('version_history', 'Version History', 'ประวัติเวอร์ชัน', '{"entries":[]}', 'draft');

-- Seed default contributors
INSERT INTO public.ip_contributors (full_name, role, contribution_type, is_ip_owner, ownership_notes) VALUES
  ('Siripong Srichau', 'Creator / IP Owner', 'System design, architecture, product development', true, 'Primary creator and intellectual property owner of testD platform'),
  ('SWING Foundation', 'Licensee / Operator', 'Organizational deployment, field operations, service delivery', false, 'Licensed to use testD for health service operations. Not an IP owner.');

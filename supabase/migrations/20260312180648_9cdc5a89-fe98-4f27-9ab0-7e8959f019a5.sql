
-- Substance knowledge library
CREATE TABLE public.hr_substances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_th text NOT NULL,
  name_en text NOT NULL,
  category_th text NOT NULL DEFAULT 'อื่นๆ',
  category_en text NOT NULL DEFAULT 'Other',
  icon text NOT NULL DEFAULT '💊',
  overview_th text,
  overview_en text,
  routes_of_use jsonb DEFAULT '[]'::jsonb,
  duration_timeline jsonb DEFAULT '{}'::jsonb,
  short_effects_th text[] DEFAULT '{}',
  short_effects_en text[] DEFAULT '{}',
  mid_effects_th text[] DEFAULT '{}',
  mid_effects_en text[] DEFAULT '{}',
  long_effects_th text[] DEFAULT '{}',
  long_effects_en text[] DEFAULT '{}',
  withdrawal_th text[] DEFAULT '{}',
  withdrawal_en text[] DEFAULT '{}',
  harm_reduction_tips_th text[] DEFAULT '{}',
  harm_reduction_tips_en text[] DEFAULT '{}',
  emergency_signs_th text[] DEFAULT '{}',
  emergency_signs_en text[] DEFAULT '{}',
  addiction_risk integer NOT NULL DEFAULT 3,
  heart_risk integer NOT NULL DEFAULT 3,
  mental_health_risk integer NOT NULL DEFAULT 3,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Drug interaction warnings
CREATE TABLE public.hr_substance_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_a_id uuid REFERENCES public.hr_substances(id) ON DELETE CASCADE NOT NULL,
  substance_b_id uuid REFERENCES public.hr_substances(id) ON DELETE CASCADE NOT NULL,
  risk_level text NOT NULL DEFAULT 'moderate',
  description_th text,
  description_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(substance_a_id, substance_b_id)
);

-- RLS
ALTER TABLE public.hr_substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_substance_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active substances (public health info)
CREATE POLICY "Anyone can read active substances"
  ON public.hr_substances FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read interactions"
  ON public.hr_substance_interactions FOR SELECT
  USING (true);

-- Admin management
CREATE POLICY "Admins manage substances"
  ON public.hr_substances FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage interactions"
  ON public.hr_substance_interactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

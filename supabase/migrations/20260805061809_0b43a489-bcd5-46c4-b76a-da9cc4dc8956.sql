-- =========================================================
-- PHASE 1: per-question analytics for pre-service surveys
-- =========================================================

CREATE TABLE IF NOT EXISTS public.survey_question_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  source_table text NOT NULL DEFAULT 'appointment_pre_service_surveys',
  json_column text,
  label_th text NOT NULL,
  label_en text NOT NULL,
  answer_type text NOT NULL CHECK (answer_type IN ('yes_no_unsure','scale','text','choice')),
  scale_min integer,
  scale_max integer,
  group_key text,
  display_order integer NOT NULL DEFAULT 0,
  collected_from timestamptz,
  collected_to timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_key, version)
);

GRANT SELECT ON public.survey_question_registry TO authenticated;
GRANT ALL ON public.survey_question_registry TO service_role;
ALTER TABLE public.survey_question_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sqr_read_authenticated" ON public.survey_question_registry
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sqr_admin_write" ON public.survey_question_registry
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.sqr_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS sqr_touch_trg ON public.survey_question_registry;
CREATE TRIGGER sqr_touch_trg BEFORE UPDATE ON public.survey_question_registry
  FOR EACH ROW EXECUTE FUNCTION public.sqr_touch();

-- Seed the current question set. collected_from is derived from REAL data.
DO $seed$
DECLARE v_first timestamptz;
BEGIN
  SELECT min(created_at) INTO v_first FROM public.appointment_pre_service_surveys;

  INSERT INTO public.survey_question_registry
    (question_key, version, json_column, label_th, label_en, answer_type, scale_min, scale_max, group_key, display_order, collected_from)
  VALUES
    ('k_condom',      1, 'knowledge', 'ความรู้: การใช้ถุงยางอย่างถูกวิธี', 'Knowledge: correct condom use', 'yes_no_unsure', NULL, NULL, 'knowledge', 10, v_first),
    ('k_test',        1, 'knowledge', 'ความรู้: การตรวจเอชไอวี/โรคติดต่อทางเพศสัมพันธ์', 'Knowledge: HIV/STI testing', 'yes_no_unsure', NULL, NULL, 'knowledge', 20, v_first),
    ('k_clean_inject',1, 'knowledge', 'ความรู้: การใช้อุปกรณ์ฉีดที่สะอาด', 'Knowledge: clean injecting equipment', 'yes_no_unsure', NULL, NULL, 'knowledge', 30, v_first),
    ('k_water',       1, 'knowledge', 'ความรู้: การดื่มน้ำ/ดูแลร่างกายขณะใช้สาร', 'Knowledge: hydration & body care', 'yes_no_unsure', NULL, NULL, 'knowledge', 40, v_first),
    ('k_dose',        1, 'knowledge', 'ความรู้: การควบคุมปริมาณการใช้สาร', 'Knowledge: dose control', 'yes_no_unsure', NULL, NULL, 'knowledge', 50, v_first),
    ('b_condom',      1, 'behavior',  'พฤติกรรม: ใช้ถุงยางทุกครั้ง', 'Behavior: always uses condoms', 'yes_no_unsure', NULL, NULL, 'behavior', 110, v_first),
    ('b_test',        1, 'behavior',  'พฤติกรรม: ตรวจเอชไอวีสม่ำเสมอ', 'Behavior: regular HIV testing', 'yes_no_unsure', NULL, NULL, 'behavior', 120, v_first),
    ('b_clean_inject',1, 'behavior',  'พฤติกรรม: ใช้อุปกรณ์ฉีดสะอาดทุกครั้ง', 'Behavior: always clean equipment', 'yes_no_unsure', NULL, NULL, 'behavior', 130, v_first),
    ('b_water',       1, 'behavior',  'พฤติกรรม: ดื่มน้ำ/พักผ่อนขณะใช้สาร', 'Behavior: hydration & rest', 'yes_no_unsure', NULL, NULL, 'behavior', 140, v_first),
    ('b_dose',        1, 'behavior',  'พฤติกรรม: ควบคุมปริมาณการใช้สาร', 'Behavior: controls dose', 'yes_no_unsure', NULL, NULL, 'behavior', 150, v_first),
    ('b_help',        1, 'behavior',  'พฤติกรรม: ขอความช่วยเหลือเมื่อจำเป็น', 'Behavior: seeks help when needed', 'yes_no_unsure', NULL, NULL, 'behavior', 160, v_first),
    ('confidence',    1, NULL,        'ความมั่นใจในการดูแลตัวเอง (1-5)', 'Self-care confidence (1-5)', 'scale', 1, 5, 'scale', 210, v_first),
    ('safety',        1, NULL,        'ความรู้สึกปลอดภัย (1-5)', 'Perceived safety (1-5)', 'scale', 1, 5, 'scale', 220, v_first),
    ('recommend',     1, NULL,        'จะแนะนำบริการนี้ให้ผู้อื่นหรือไม่', 'Would recommend this service', 'choice', NULL, NULL, 'outcome', 230, v_first),
    ('mental_health_interest', 1, NULL, 'สนใจรับคำปรึกษาด้านสุขภาพจิต', 'Interested in mental-health support', 'choice', NULL, NULL, 'outcome', 240, v_first),
    ('suggestions',   1, NULL,        'ข้อเสนอแนะเพิ่มเติม (ปลายเปิด)', 'Open-ended suggestions', 'text', NULL, NULL, 'open', 300, v_first)
  ON CONFLICT (question_key, version) DO NOTHING;
END
$seed$;

-- ---------------------------------------------------------
-- Shared long-format base (no rows leave the DB)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pre_service_can_analyze()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'me_analyst'::app_role)
      OR EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid() AND sp.is_active)
      OR EXISTS (SELECT 1 FROM counselor_profiles cp WHERE cp.user_id = auth.uid() AND cp.is_active);
$$;

CREATE OR REPLACE VIEW public.pre_service_survey_base
WITH (security_invoker = on) AS
SELECT
  s.id,
  s.created_at,
  a.branch_id,
  s.channel,
  s.language,
  s.uic_hash,
  s.uic_display,
  s.visit_sequence,
  (a.user_id IS NULL) AS is_anonymous,
  s.confidence,
  s.safety,
  s.recommend,
  s.mental_health_interest,
  s.suggestions,
  s.knowledge,
  s.behavior,
  CASE
    WHEN s.confidence IS NOT NULL AND s.confidence <= 2 THEN 'high'
    WHEN s.mental_health_interest = 'yes' THEN 'high'
    WHEN s.safety IS NOT NULL AND s.safety <= 2 THEN 'medium'
    WHEN s.confidence = 3 THEN 'medium'
    ELSE 'low'
  END AS risk_level
FROM public.appointment_pre_service_surveys s
LEFT JOIN public.appointments a ON a.id = s.booking_id;

GRANT SELECT ON public.pre_service_survey_base TO authenticated;

-- ---------------------------------------------------------
-- 1) Per-question stats
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pre_service_question_stats(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_branch_ids uuid[] DEFAULT NULL,
  p_channels text[] DEFAULT NULL,
  p_risk text DEFAULT 'all',
  p_anon text DEFAULT 'all',
  p_visit text DEFAULT 'all'
)
RETURNS TABLE (
  question_key text,
  label_th text,
  label_en text,
  answer_type text,
  group_key text,
  display_order integer,
  collected_from timestamptz,
  collected_to timestamptz,
  total_responses bigint,
  answered bigint,
  skipped bigint,
  skip_rate numeric,
  distribution jsonb,
  mean_value numeric,
  median_value numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pre_service_can_analyze() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM public.pre_service_survey_base b
    WHERE (p_from IS NULL OR b.created_at >= p_from)
      AND (p_to IS NULL OR b.created_at < p_to)
      AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND (p_channels IS NULL OR b.channel = ANY(p_channels))
      AND (p_risk = 'all' OR b.risk_level = p_risk)
      AND (p_anon = 'all' OR (p_anon = 'anon' AND b.is_anonymous) OR (p_anon = 'user' AND NOT b.is_anonymous))
      AND (p_visit = 'all' OR (p_visit = 'first' AND b.visit_sequence <= 1) OR (p_visit = 'repeat' AND b.visit_sequence > 1))
  ),
  total AS (SELECT count(*)::bigint AS n FROM filtered),
  long AS (
    SELECT r.question_key,
           CASE
             WHEN r.json_column = 'knowledge' THEN f.knowledge ->> r.question_key
             WHEN r.json_column = 'behavior'  THEN f.behavior  ->> r.question_key
             WHEN r.question_key = 'confidence' THEN f.confidence::text
             WHEN r.question_key = 'safety' THEN f.safety::text
             WHEN r.question_key = 'recommend' THEN f.recommend
             WHEN r.question_key = 'mental_health_interest' THEN f.mental_health_interest
             WHEN r.question_key = 'suggestions' THEN nullif(btrim(coalesce(f.suggestions,'')), '')
           END AS answer_value,
           CASE
             WHEN r.answer_type = 'scale' AND r.question_key = 'confidence' THEN f.confidence::numeric
             WHEN r.answer_type = 'scale' AND r.question_key = 'safety' THEN f.safety::numeric
           END AS num_value
    FROM public.survey_question_registry r
    CROSS JOIN filtered f
    WHERE r.source_table = 'appointment_pre_service_surveys'
  ),
  agg AS (
    SELECT l.question_key,
           count(*) FILTER (WHERE l.answer_value IS NOT NULL)::bigint AS answered,
           count(*) FILTER (WHERE l.answer_value IS NULL)::bigint AS skipped,
           avg(l.num_value) AS mean_value,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY l.num_value) AS median_value
    FROM long l GROUP BY l.question_key
  ),
  dist AS (
    SELECT d.question_key, jsonb_object_agg(d.answer_value, d.c) AS distribution
    FROM (
      SELECT l.question_key, l.answer_value, count(*)::int AS c
      FROM long l
      JOIN public.survey_question_registry r
        ON r.question_key = l.question_key AND r.answer_type <> 'text'
      WHERE l.answer_value IS NOT NULL
      GROUP BY 1, 2
    ) d
    GROUP BY d.question_key
  )
  SELECT r.question_key, r.label_th, r.label_en, r.answer_type, r.group_key, r.display_order,
         r.collected_from, r.collected_to,
         (SELECT n FROM total),
         coalesce(a.answered, 0),
         coalesce(a.skipped, 0),
         CASE WHEN coalesce(a.answered,0) + coalesce(a.skipped,0) = 0 THEN 0
              ELSE round(100.0 * a.skipped / (a.answered + a.skipped), 1) END,
         coalesce(dd.distribution, '{}'::jsonb),
         round(a.mean_value, 2),
         a.median_value
  FROM public.survey_question_registry r
  LEFT JOIN agg a ON a.question_key = r.question_key
  LEFT JOIN dist dd ON dd.question_key = r.question_key
  WHERE r.source_table = 'appointment_pre_service_surveys'
  ORDER BY r.display_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_service_question_stats(timestamptz,timestamptz,uuid[],text[],text,text,text) TO authenticated;

-- ---------------------------------------------------------
-- 2) Cross-tab
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pre_service_crosstab(
  p_question_key text,
  p_dimension text,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_branch_ids uuid[] DEFAULT NULL,
  p_channels text[] DEFAULT NULL,
  p_risk text DEFAULT 'all',
  p_anon text DEFAULT 'all',
  p_visit text DEFAULT 'all'
)
RETURNS TABLE (dim_value text, answer_value text, cnt bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_json_col text; v_type text;
BEGIN
  IF NOT public.pre_service_can_analyze() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_dimension NOT IN ('branch','visit','risk','channel','month','language') THEN
    RAISE EXCEPTION 'unsupported dimension';
  END IF;

  SELECT r.json_column, r.answer_type INTO v_json_col, v_type
  FROM public.survey_question_registry r WHERE r.question_key = p_question_key LIMIT 1;
  IF v_type IS NULL THEN RAISE EXCEPTION 'unknown question_key'; END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM public.pre_service_survey_base b
    WHERE (p_from IS NULL OR b.created_at >= p_from)
      AND (p_to IS NULL OR b.created_at < p_to)
      AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND (p_channels IS NULL OR b.channel = ANY(p_channels))
      AND (p_risk = 'all' OR b.risk_level = p_risk)
      AND (p_anon = 'all' OR (p_anon = 'anon' AND b.is_anonymous) OR (p_anon = 'user' AND NOT b.is_anonymous))
      AND (p_visit = 'all' OR (p_visit = 'first' AND b.visit_sequence <= 1) OR (p_visit = 'repeat' AND b.visit_sequence > 1))
  )
  SELECT
    CASE p_dimension
      WHEN 'branch' THEN coalesce(f.branch_id::text, 'unknown')
      WHEN 'visit' THEN CASE WHEN f.visit_sequence > 1 THEN 'repeat' ELSE 'first' END
      WHEN 'risk' THEN f.risk_level
      WHEN 'channel' THEN coalesce(f.channel, 'unknown')
      WHEN 'language' THEN coalesce(f.language, 'unknown')
      ELSE to_char(f.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM')
    END AS dim_value,
    CASE
      WHEN v_json_col = 'knowledge' THEN f.knowledge ->> p_question_key
      WHEN v_json_col = 'behavior'  THEN f.behavior  ->> p_question_key
      WHEN p_question_key = 'confidence' THEN f.confidence::text
      WHEN p_question_key = 'safety' THEN f.safety::text
      WHEN p_question_key = 'recommend' THEN f.recommend
      WHEN p_question_key = 'mental_health_interest' THEN f.mental_health_interest
      ELSE NULL
    END AS answer_value,
    count(*)::bigint
  FROM filtered f
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_service_crosstab(text,text,timestamptz,timestamptz,uuid[],text[],text,text,text) TO authenticated;

-- ---------------------------------------------------------
-- 3) Open-ended keyword grouping
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pre_service_open_text(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_branch_ids uuid[] DEFAULT NULL,
  p_channels text[] DEFAULT NULL,
  p_risk text DEFAULT 'all',
  p_anon text DEFAULT 'all',
  p_visit text DEFAULT 'all',
  p_keywords text[] DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (keyword text, cnt bigint, sample text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kw text[];
BEGIN
  IF NOT public.pre_service_can_analyze() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_kw := coalesce(p_keywords, ARRAY[
    'ถุงยาง','ตรวจเลือด','เอชไอวี','HIV','PrEP','PEP','ยา','เข็ม','สาร','ยาเสพติด',
    'สุขภาพจิต','เครียด','ซึมเศร้า','ปรึกษา','เจ้าหน้าที่','บริการ','รอ','คิว','สถานที่',
    'ค่าใช้จ่าย','ฟรี','ความลับ','ปลอดภัย','ข้อมูล','เวลา','นัด','สาขา','ดี','ประทับใจ','ปรับปรุง'
  ]);

  RETURN QUERY
  WITH filtered AS (
    SELECT b.suggestions FROM public.pre_service_survey_base b
    WHERE nullif(btrim(coalesce(b.suggestions,'')), '') IS NOT NULL
      AND (p_from IS NULL OR b.created_at >= p_from)
      AND (p_to IS NULL OR b.created_at < p_to)
      AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND (p_channels IS NULL OR b.channel = ANY(p_channels))
      AND (p_risk = 'all' OR b.risk_level = p_risk)
      AND (p_anon = 'all' OR (p_anon = 'anon' AND b.is_anonymous) OR (p_anon = 'user' AND NOT b.is_anonymous))
      AND (p_visit = 'all' OR (p_visit = 'first' AND b.visit_sequence <= 1) OR (p_visit = 'repeat' AND b.visit_sequence > 1))
  )
  SELECT k.kw,
         count(f.suggestions)::bigint,
         (array_agg(f.suggestions ORDER BY length(f.suggestions)))[1]
  FROM unnest(v_kw) AS k(kw)
  LEFT JOIN filtered f ON f.suggestions ILIKE '%' || k.kw || '%'
  GROUP BY k.kw
  HAVING count(f.suggestions) > 0
  ORDER BY 2 DESC
  LIMIT greatest(1, coalesce(p_limit, 30));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_service_open_text(timestamptz,timestamptz,uuid[],text[],text,text,text,text[],integer) TO authenticated;

-- ---------------------------------------------------------
-- 4) De-identified row-level export
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pre_service_rowlevel_export(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_branch_ids uuid[] DEFAULT NULL,
  p_channels text[] DEFAULT NULL,
  p_risk text DEFAULT 'all',
  p_anon text DEFAULT 'all',
  p_visit text DEFAULT 'all',
  p_limit integer DEFAULT 5000
)
RETURNS TABLE (
  uic_hash text,
  created_at timestamptz,
  branch_id uuid,
  channel text,
  language text,
  visit_type text,
  risk_level text,
  is_anonymous boolean,
  answers jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'me_analyst'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT b.uic_hash, b.created_at, b.branch_id, b.channel, b.language,
         CASE WHEN b.visit_sequence > 1 THEN 'repeat' ELSE 'first' END,
         b.risk_level, b.is_anonymous,
         coalesce(b.knowledge, '{}'::jsonb) || coalesce(b.behavior, '{}'::jsonb)
           || jsonb_build_object(
                'confidence', b.confidence,
                'safety', b.safety,
                'recommend', b.recommend,
                'mental_health_interest', b.mental_health_interest,
                'suggestions', b.suggestions)
  FROM public.pre_service_survey_base b
  WHERE (p_from IS NULL OR b.created_at >= p_from)
    AND (p_to IS NULL OR b.created_at < p_to)
    AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
    AND (p_channels IS NULL OR b.channel = ANY(p_channels))
    AND (p_risk = 'all' OR b.risk_level = p_risk)
    AND (p_anon = 'all' OR (p_anon = 'anon' AND b.is_anonymous) OR (p_anon = 'user' AND NOT b.is_anonymous))
    AND (p_visit = 'all' OR (p_visit = 'first' AND b.visit_sequence <= 1) OR (p_visit = 'repeat' AND b.visit_sequence > 1))
  ORDER BY b.created_at DESC
  LIMIT greatest(1, coalesce(p_limit, 5000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pre_service_rowlevel_export(timestamptz,timestamptz,uuid[],text[],text,text,text,integer) TO authenticated;
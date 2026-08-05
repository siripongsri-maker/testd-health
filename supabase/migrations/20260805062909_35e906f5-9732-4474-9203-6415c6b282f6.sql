-- Phase 2: help topics + daily branch brief

ALTER TABLE public.appointment_pre_service_surveys
  ADD COLUMN IF NOT EXISTS help_topics text[] NOT NULL DEFAULT '{}';

INSERT INTO public.survey_question_registry
  (question_key, version, json_column, label_th, label_en, answer_type, group_key, display_order, collected_from, notes)
VALUES
  ('help_topics', 1, NULL,
   'ประเด็นที่ต้องการความช่วยเหลือ (เลือกได้หลายข้อ)',
   'Topics you want help with (multi-select)',
   'choice', 'support', 260, now(),
   'เริ่มเก็บตั้งแต่เฟส 2 — เคสก่อนหน้านี้ไม่ได้เก็บข้อมูลนี้')
ON CONFLICT (question_key, version) DO NOTHING;

DROP VIEW IF EXISTS public.pre_service_survey_base;
CREATE VIEW public.pre_service_survey_base
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
  s.help_topics,
  CASE
    WHEN s.mental_health_interest = 'yes' AND s.safety IS NOT NULL AND s.safety <= 2 THEN 'critical'
    WHEN s.confidence IS NOT NULL AND s.confidence <= 2 THEN 'high'
    WHEN s.mental_health_interest = 'yes' THEN 'high'
    WHEN s.safety IS NOT NULL AND s.safety <= 2 THEN 'medium'
    WHEN s.confidence = 3 THEN 'medium'
    ELSE 'low'
  END AS risk_level
FROM public.appointment_pre_service_surveys s
LEFT JOIN public.appointments a ON a.id = s.booking_id;

GRANT SELECT ON public.pre_service_survey_base TO authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_branch_brief(
  p_date date DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  p_branch_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  case_id uuid,
  survey_id uuid,
  branch_id uuid,
  submitted_at timestamptz,
  case_code text,
  is_anonymous boolean,
  visit_type text,
  risk_level text,
  help_topics text[],
  derived_topics text[],
  main_concern text,
  prep_note text,
  status text,
  assigned_counselor_id uuid,
  hours_open numeric,
  sla_hours integer,
  sla_breached boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pre_service_can_analyze() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT b.*,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN b.mental_health_interest = 'yes' THEN 'mental_health' END,
        CASE WHEN (b.behavior ->> 'b_dose') IN ('no','unsure')
               OR (b.behavior ->> 'b_clean_inject') IN ('no','unsure') THEN 'substance_use' END,
        CASE WHEN b.safety IS NOT NULL AND b.safety <= 2 THEN 'safety' END,
        CASE WHEN (b.behavior ->> 'b_test') IN ('no','unsure') THEN 'access_to_care' END
      ], NULL) AS derived
    FROM public.pre_service_survey_base b
    WHERE (b.created_at AT TIME ZONE 'Asia/Bangkok')::date = p_date
      AND (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND b.risk_level IN ('critical','high','medium')
  )
  SELECT
    n.id,
    base.id,
    base.branch_id,
    base.created_at,
    coalesce(base.uic_display, 'CASE-' || upper(substr(base.id::text, 1, 6))),
    base.is_anonymous,
    CASE WHEN base.visit_sequence > 1 THEN 'repeat' ELSE 'first' END,
    base.risk_level,
    base.help_topics,
    base.derived,
    concat_ws(' · ',
      CASE WHEN base.mental_health_interest = 'yes' THEN 'สนใจคุยเรื่องสุขภาพจิต' END,
      CASE WHEN base.safety IS NOT NULL AND base.safety <= 2 THEN 'รู้สึกไม่ปลอดภัย (' || base.safety || '/5)' END,
      CASE WHEN base.confidence IS NOT NULL AND base.confidence <= 2 THEN 'ความมั่นใจดูแลตัวเองต่ำ (' || base.confidence || '/5)' END,
      CASE WHEN (base.behavior ->> 'b_test') IN ('no','unsure') THEN 'ยังไม่ตรวจสม่ำเสมอ' END,
      CASE WHEN (base.behavior ->> 'b_condom') IN ('no','unsure') THEN 'ใช้ถุงยางไม่สม่ำเสมอ' END
    ),
    concat_ws(' · ',
      CASE WHEN base.mental_health_interest = 'yes' THEN 'เตรียมช่องทางส่งต่อสุขภาพจิต' END,
      CASE WHEN base.safety IS NOT NULL AND base.safety <= 2 THEN 'เตรียมแผนความปลอดภัย' END,
      CASE WHEN (base.behavior ->> 'b_test') IN ('no','unsure') THEN 'เสนอการตรวจ HIV/STI' END,
      CASE WHEN (base.behavior ->> 'b_clean_inject') IN ('no','unsure') THEN 'เตรียมข้อมูลอุปกรณ์สะอาด' END,
      CASE WHEN base.visit_sequence > 1 THEN 'ทบทวนประวัติครั้งก่อน' END
    ),
    coalesce(n.status, 'not_reviewed'),
    n.assigned_counselor_id,
    round(extract(epoch FROM (now() - base.created_at)) / 3600.0, 1),
    CASE base.risk_level WHEN 'critical' THEN 2 WHEN 'high' THEN 24 ELSE 72 END,
    (n.status IS NULL OR n.status NOT IN ('case_closed','counseling_completed'))
      AND extract(epoch FROM (now() - base.created_at)) / 3600.0
          > (CASE base.risk_level WHEN 'critical' THEN 2 WHEN 'high' THEN 24 ELSE 72 END)
  FROM base
  LEFT JOIN public.pre_service_counseling_notes n ON n.survey_id = base.id
  ORDER BY base.branch_id, base.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_daily_branch_brief(date, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_branch_brief(date, uuid[]) TO authenticated;
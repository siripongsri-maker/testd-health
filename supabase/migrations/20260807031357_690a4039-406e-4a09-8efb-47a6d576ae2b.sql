DROP FUNCTION IF EXISTS public.get_daily_branch_brief(date, uuid[]);

CREATE OR REPLACE FUNCTION public.get_daily_branch_brief(p_date date DEFAULT ((now() AT TIME ZONE 'Asia/Bangkok'::text))::date, p_branch_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(case_id uuid, survey_id uuid, branch_id uuid, submitted_at timestamp with time zone, appointment_date date, appointment_time text, case_code text, is_anonymous boolean, visit_type text, risk_level text, help_topics text[], derived_topics text[], main_concern text, prep_note text, status text, assigned_counselor_id uuid, hours_open numeric, sla_hours integer, sla_breached boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    a.appointment_date,
    CASE WHEN a.start_time IS NULL THEN NULL ELSE to_char(a.start_time, 'HH24:MI') END,
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
  LEFT JOIN public.appointment_pre_service_surveys s ON s.id = base.id
  LEFT JOIN public.appointments a ON a.id = s.booking_id
  ORDER BY base.branch_id, base.created_at;
END;
$function$;
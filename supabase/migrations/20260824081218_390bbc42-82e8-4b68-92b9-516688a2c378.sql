-- 1) Staff can open an urgent appointment case (creates the minimal intake row + case record)
CREATE OR REPLACE FUNCTION public.open_urgent_appointment_case(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_branch uuid;
  v_survey uuid;
BEGIN
  SELECT a.branch_id INTO v_branch FROM public.appointments a WHERE a.id = p_appointment_id;
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'appointment not found or has no branch';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.user_can_access_branch(auth.uid(), v_branch)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT s.id INTO v_survey
  FROM public.appointment_pre_service_surveys s
  WHERE s.booking_id = p_appointment_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_survey IS NULL THEN
    INSERT INTO public.appointment_pre_service_surveys (booking_id, channel, language, help_topics)
    VALUES (p_appointment_id, 'staff_urgent_intake', 'th', '{}')
    RETURNING id INTO v_survey;
  END IF;

  INSERT INTO public.pre_service_counseling_notes (survey_id, branch_id, status, updated_by)
  VALUES (v_survey, v_branch, 'not_reviewed', auth.uid())
  ON CONFLICT (survey_id) DO NOTHING;

  RETURN v_survey;
END;
$$;

REVOKE ALL ON FUNCTION public.open_urgent_appointment_case(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_urgent_appointment_case(uuid) TO authenticated;

-- 2) Daily brief: include staff-opened urgent intake cases and order by urgency
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
      CASE WHEN b.channel = 'staff_urgent_intake' AND b.risk_level = 'low' THEN 'high' ELSE b.risk_level END AS eff_risk,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN b.mental_health_interest = 'yes' THEN 'mental_health' END,
        CASE WHEN (b.behavior ->> 'b_dose') IN ('no','unsure')
               OR (b.behavior ->> 'b_clean_inject') IN ('no','unsure') THEN 'substance_use' END,
        CASE WHEN b.safety IS NOT NULL AND b.safety <= 2 THEN 'safety' END,
        CASE WHEN (b.behavior ->> 'b_test') IN ('no','unsure') THEN 'access_to_care' END
      ], NULL) AS derived
    FROM public.pre_service_survey_base b
    LEFT JOIN public.appointment_pre_service_surveys s0 ON s0.id = b.id
    LEFT JOIN public.appointments a0 ON a0.id = s0.booking_id
    WHERE (p_branch_ids IS NULL OR b.branch_id = ANY(p_branch_ids))
      AND (
        (b.created_at AT TIME ZONE 'Asia/Bangkok')::date = p_date
        OR (b.channel = 'staff_urgent_intake' AND a0.appointment_date = p_date)
      )
      AND (
        b.risk_level IN ('critical','high','medium')
        OR b.channel = 'staff_urgent_intake'
      )
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
    base.eff_risk,
    base.help_topics,
    base.derived,
    concat_ws(' · ',
      CASE WHEN base.channel = 'staff_urgent_intake' THEN 'เคสเร่งด่วนจากหน้านัดหมาย (เจ้าหน้าที่เปิดเคส)' END,
      CASE WHEN base.mental_health_interest = 'yes' THEN 'สนใจคุยเรื่องสุขภาพจิต' END,
      CASE WHEN base.safety IS NOT NULL AND base.safety <= 2 THEN 'รู้สึกไม่ปลอดภัย (' || base.safety || '/5)' END,
      CASE WHEN base.confidence IS NOT NULL AND base.confidence <= 2 THEN 'ความมั่นใจดูแลตัวเองต่ำ (' || base.confidence || '/5)' END,
      CASE WHEN (base.behavior ->> 'b_test') IN ('no','unsure') THEN 'ยังไม่ตรวจสม่ำเสมอ' END,
      CASE WHEN (base.behavior ->> 'b_condom') IN ('no','unsure') THEN 'ใช้ถุงยางไม่สม่ำเสมอ' END
    ),
    concat_ws(' · ',
      CASE WHEN base.channel = 'staff_urgent_intake' THEN 'สัมภาษณ์เพิ่มเติมและบันทึกผลให้ครบก่อนปิดเคส' END,
      CASE WHEN base.mental_health_interest = 'yes' THEN 'เตรียมช่องทางส่งต่อสุขภาพจิต' END,
      CASE WHEN base.safety IS NOT NULL AND base.safety <= 2 THEN 'เตรียมแผนความปลอดภัย' END,
      CASE WHEN (base.behavior ->> 'b_test') IN ('no','unsure') THEN 'เสนอการตรวจ HIV/STI' END,
      CASE WHEN (base.behavior ->> 'b_clean_inject') IN ('no','unsure') THEN 'เตรียมข้อมูลอุปกรณ์สะอาด' END,
      CASE WHEN base.visit_sequence > 1 THEN 'ทบทวนประวัติครั้งก่อน' END
    ),
    coalesce(n.status, 'not_reviewed'),
    n.assigned_counselor_id,
    round(extract(epoch FROM (now() - base.created_at)) / 3600.0, 1),
    CASE base.eff_risk WHEN 'critical' THEN 2 WHEN 'high' THEN 24 ELSE 72 END,
    (n.status IS NULL OR n.status NOT IN ('case_closed','counseling_completed'))
      AND extract(epoch FROM (now() - base.created_at)) / 3600.0
          > (CASE base.eff_risk WHEN 'critical' THEN 2 WHEN 'high' THEN 24 ELSE 72 END)
  FROM base
  LEFT JOIN public.pre_service_counseling_notes n ON n.survey_id = base.id
  LEFT JOIN public.appointment_pre_service_surveys s ON s.id = base.id
  LEFT JOIN public.appointments a ON a.id = s.booking_id
  ORDER BY base.branch_id,
           CASE coalesce(n.status,'not_reviewed')
             WHEN 'not_reviewed' THEN 0 WHEN 'follow_up_needed' THEN 1
             WHEN 'counseling_completed' THEN 2 ELSE 3 END,
           CASE base.eff_risk WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           a.start_time NULLS LAST,
           base.created_at;
END;
$function$;
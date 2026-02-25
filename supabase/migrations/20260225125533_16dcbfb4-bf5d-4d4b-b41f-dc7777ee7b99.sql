
CREATE OR REPLACE FUNCTION public.create_walkin_appointment(p_branch_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_code text;
BEGIN
  -- Verify caller is admin or branch staff
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM staff_branch_assignments sba
      JOIN booking_branches bb ON bb.slug = sba.branch
      WHERE sba.user_id = auth.uid() AND bb.id = p_branch_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO appointments (
    branch_id, appointment_date, start_time, status, source,
    arrived_at, notes
  ) VALUES (
    p_branch_id,
    CURRENT_DATE,
    to_char(now() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')::time,
    'waiting',
    'walkin',
    now(),
    p_notes
  )
  RETURNING id, referral_code INTO v_id, v_code;

  -- Log
  INSERT INTO appointment_logs (appointment_id, action, performed_by, details)
  VALUES (v_id, 'walkin_created', auth.uid(), 'Walk-in registered at reception');

  RETURN jsonb_build_object('id', v_id, 'referral_code', v_code);
END;
$function$;

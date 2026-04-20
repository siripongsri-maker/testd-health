CREATE OR REPLACE FUNCTION public.mark_no_show_expired(p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_apt RECORD;
BEGIN
  v_count := 0;

  FOR v_apt IN
    SELECT id, branch_id, start_time, appointment_date, status
    FROM public.appointments
    WHERE status IN ('booked', 'confirmed')
      AND (appointment_date + start_time) < (now() AT TIME ZONE 'Asia/Bangkok' - interval '30 minutes')
      AND arrived_at IS NULL
      AND started_at IS NULL
      AND completed_at IS NULL
      AND checked_out_at IS NULL
      AND auto_checked_out_at IS NULL
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.appointments
    SET status = 'no_show',
        checkout_method = 'no_show',
        updated_at = now()
    WHERE id = v_apt.id;

    INSERT INTO public.appointment_logs (appointment_id, action, performed_by, details)
    VALUES (
      v_apt.id,
      'no_show_auto',
      NULL,
      format('System auto no-show after 30 minutes. Original status=%s, scheduled=%s %s',
             v_apt.status, v_apt.appointment_date, v_apt.start_time)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
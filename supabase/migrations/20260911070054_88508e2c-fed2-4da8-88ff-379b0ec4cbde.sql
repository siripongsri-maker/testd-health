CREATE OR REPLACE FUNCTION public.enforce_selftest_user_update_whitelist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_staff boolean;
  v_role text;
BEGIN
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role'),
    ''
  );

  -- Backend jobs (service role / direct DB) manage carrier tracking columns.
  IF v_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  v_is_staff := public.has_role(auth.uid(), 'admin'::app_role)
                OR EXISTS (
                  SELECT 1 FROM public.staff_branch_assignments
                  WHERE user_id = auth.uid()
                    AND branch = OLD.assigned_branch
                );

  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  NEW.status                    := OLD.status;
  NEW.test_result               := OLD.test_result;
  NEW.staff_notes               := OLD.staff_notes;
  NEW.assigned_branch           := OLD.assigned_branch;
  NEW.abuse_flag                := OLD.abuse_flag;
  NEW.abuse_reason              := OLD.abuse_reason;
  NEW.abuse_score               := OLD.abuse_score;
  NEW.abuse_checked_at          := OLD.abuse_checked_at;
  NEW.tracking_number           := OLD.tracking_number;
  NEW.tracking_carrier          := OLD.tracking_carrier;
  NEW.last_tracking_check_at    := OLD.last_tracking_check_at;
  NEW.delivered_at              := OLD.delivered_at;
  NEW.expected_delivered_at     := OLD.expected_delivered_at;
  NEW.rejected_at               := OLD.rejected_at;
  NEW.rejected_by               := OLD.rejected_by;
  NEW.rejection_reason          := OLD.rejection_reason;
  NEW.pii_id                    := OLD.pii_id;
  NEW.thai_id                   := OLD.thai_id;
  NEW.national_id_hash          := OLD.national_id_hash;
  NEW.name_fp                   := OLD.name_fp;
  NEW.address_fp                := OLD.address_fp;
  NEW.name_address_fp           := OLD.name_address_fp;
  NEW.reactive_notified_at      := OLD.reactive_notified_at;
  NEW.reactive_notified_to      := OLD.reactive_notified_to;
  NEW.legacy_result_id          := OLD.legacy_result_id;
  NEW.legacy_source             := OLD.legacy_source;
  NEW.legacy_raw_result         := OLD.legacy_raw_result;
  NEW.legacy_hospital_confirmed := OLD.legacy_hospital_confirmed;
  NEW.legacy_hospital_name      := OLD.legacy_hospital_name;
  NEW.legacy_treatment_status   := OLD.legacy_treatment_status;
  NEW.legacy_art_status         := OLD.legacy_art_status;
  NEW.legacy_pdpa_consent       := OLD.legacy_pdpa_consent;
  NEW.user_id                   := OLD.user_id;
  NEW.created_at                := OLD.created_at;

  RETURN NEW;
END;
$function$;
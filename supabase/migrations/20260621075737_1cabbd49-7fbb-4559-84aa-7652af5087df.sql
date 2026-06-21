CREATE OR REPLACE FUNCTION public.enforce_selftest_user_update_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  v_is_staff := public.has_role(auth.uid(), 'admin'::app_role)
                OR EXISTS (
                  SELECT 1 FROM public.staff_branch_assignments
                  WHERE user_id = auth.uid()
                    AND branch = OLD.assigned_branch
                );

  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  -- Non-staff (row owner): reset staff-only columns. care_action,
  -- wants_callback and callback_phone are intentionally NOT reset — they
  -- represent the person's own care preferences captured on the public flow.
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
$$;

-- SECURITY DEFINER RPC so guests (anon role) can attach a callback phone
-- to the request they just submitted (we identify it by id; phone is the
-- only writable field). Authenticated users go through the normal UPDATE.
CREATE OR REPLACE FUNCTION public.attach_selftest_callback_phone(
  p_request_id uuid,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  v_phone := regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g');
  IF length(v_phone) < 8 OR length(v_phone) > 20 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  UPDATE public.hiv_selftest_requests
  SET wants_callback = true,
      callback_phone = v_phone,
      care_action    = 'requested_callback'
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_selftest_callback_phone(uuid, text) TO anon, authenticated;

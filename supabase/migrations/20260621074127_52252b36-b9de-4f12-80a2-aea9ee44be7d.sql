
-- 1. branch_interest_signups: tighten INSERT to prevent spoofing user_id
DROP POLICY IF EXISTS "Anyone can register interest" ON public.branch_interest_signups;
CREATE POLICY "Anyone can register interest"
ON public.branch_interest_signups
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- 2. field_notes: require staff/admin role on INSERT
DROP POLICY IF EXISTS "Authenticated users can insert field_notes" ON public.field_notes;
CREATE POLICY "Outreach staff and admins can insert field_notes"
ON public.field_notes
FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'outreach_staff'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- 3. outreach_situational_forms: require staff/admin role on INSERT
DROP POLICY IF EXISTS "Users can insert outreach_situational_forms" ON public.outreach_situational_forms;
CREATE POLICY "Outreach staff and admins can insert situational forms"
ON public.outreach_situational_forms
FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'outreach_staff'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- 4. hiv_selftest_requests: prevent users from escalating sensitive fields via UPDATE.
--    Keep the policy (clients still call .update()) but enforce a column whitelist via a BEFORE UPDATE trigger
--    that resets staff-only columns to their OLD value when the caller is not an admin or branch staff.
CREATE OR REPLACE FUNCTION public.enforce_selftest_user_update_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff boolean;
BEGIN
  -- Admins and assigned branch staff bypass the whitelist (their own UPDATE policies cover them).
  v_is_staff := public.has_role(auth.uid(), 'admin'::app_role)
                OR EXISTS (
                  SELECT 1 FROM public.staff_branch_assignments
                  WHERE user_id = auth.uid()
                    AND branch = OLD.assigned_branch
                );

  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  -- Non-staff path (the row owner). Reset every column that users must not be able to overwrite.
  NEW.status                    := OLD.status;
  NEW.test_result               := OLD.test_result;
  NEW.staff_notes               := OLD.staff_notes;
  NEW.assigned_branch           := OLD.assigned_branch;
  NEW.abuse_flag                := OLD.abuse_flag;
  NEW.abuse_reason              := OLD.abuse_reason;
  NEW.abuse_score               := OLD.abuse_score;
  NEW.abuse_checked_at          := OLD.abuse_checked_at;
  NEW.care_action               := OLD.care_action;
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

DROP TRIGGER IF EXISTS enforce_selftest_user_update_whitelist ON public.hiv_selftest_requests;
CREATE TRIGGER enforce_selftest_user_update_whitelist
BEFORE UPDATE ON public.hiv_selftest_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_selftest_user_update_whitelist();

-- Also add an explicit WITH CHECK to the user UPDATE policy so user_id cannot be reassigned.
DROP POLICY IF EXISTS "Users can update their own requests" ON public.hiv_selftest_requests;
CREATE POLICY "Users can update their own requests"
ON public.hiv_selftest_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

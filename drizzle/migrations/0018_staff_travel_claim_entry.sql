-- © 2026 Siripong Srichau — Sole Creator.
CREATE OR REPLACE FUNCTION public.can_enter_travel_claim(_branch_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (has_role(auth.uid(),'admin') OR (
 NOT has_role(auth.uid(),'me_analyst') AND NOT has_role(auth.uid(),'outreach_staff') AND
 (EXISTS(SELECT 1 FROM staff_profiles WHERE user_id=auth.uid() AND is_active AND branch_id=_branch_id)
 OR EXISTS(SELECT 1 FROM counselor_profiles WHERE user_id=auth.uid() AND is_active AND branch_id=_branch_id))));
$$;
REVOKE ALL ON FUNCTION public.can_enter_travel_claim(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_enter_travel_claim(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.staff_travel_claim_candidates() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rows jsonb; v_limit int; v_amount numeric; v_used int;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT max_claims,amount INTO v_limit,v_amount FROM counseling_payout_settings WHERE id;
 SELECT count(*) INTO v_used FROM counseling_payout_claims WHERE status<>'rejected';
 SELECT coalesce(jsonb_agg(t ORDER BY t.submitted_at DESC),'[]'::jsonb) INTO v_rows FROM (
 SELECT e.id AS evaluation_id,e.evaluation_submitted_at AS submitted_at,
 coalesce(e.counseling_completed_at,n.counseling_completed_at) AS counseling_completed_at,
 n.branch_id,b.name_th AS branch_name,a.referral_code,a.appointment_date,a.arrived_at,a.checked_out_at,
 right(regexp_replace(coalesce(a.contact_phone,''),'[^0-9]','','g'),4) AS phone_last4,
 CASE WHEN c.id IS NOT NULL THEN 'already_claimed'
 WHEN e.evaluation_submitted_at IS NULL THEN 'evaluation_incomplete'
 WHEN a.id IS NULL OR NOT coalesce(a.checked_out_at IS NOT NULL OR a.status IN ('completed','checked_out'),false) THEN 'visit_unverified'
 WHEN length(regexp_replace(coalesce(a.contact_phone,''),'[^0-9]','','g'))<9 THEN 'phone_missing'
 WHEN EXISTS(SELECT 1 FROM counseling_payout_claims p WHERE p.phone_hash=encode(extensions.digest(regexp_replace(a.contact_phone,'[^0-9]','','g'),'sha256'),'hex') AND p.status<>'rejected') THEN 'phone_claimed'
 ELSE 'ready' END AS eligibility
 FROM post_counseling_evaluations e JOIN pre_service_counseling_notes n ON n.id=e.note_id
 LEFT JOIN appointment_pre_service_surveys s ON s.id=n.survey_id
 LEFT JOIN appointments a ON a.id=s.booking_id LEFT JOIN booking_branches b ON b.id=n.branch_id
 LEFT JOIN counseling_payout_claims c ON c.evaluation_id=e.id
 WHERE public.can_enter_travel_claim(n.branch_id)
 ) t;
 RETURN jsonb_build_object('candidates',v_rows,'amount',coalesce(v_amount,200),'quota_limit',coalesce(v_limit,100),'quota_used',v_used);
END; $$;
REVOKE ALL ON FUNCTION public.staff_travel_claim_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_travel_claim_candidates() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.staff_submit_travel_claim(_evaluation_id uuid,_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_note pre_service_counseling_notes; v_eval post_counseling_evaluations; v_id uuid; v_method text; v_number text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_eval FROM post_counseling_evaluations WHERE id=_evaluation_id;
 SELECT * INTO v_note FROM pre_service_counseling_notes WHERE id=v_eval.note_id;
 IF v_note.id IS NULL OR NOT public.can_enter_travel_claim(v_note.branch_id) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF v_eval.evaluation_submitted_at IS NULL THEN RAISE EXCEPTION 'Evaluation not submitted yet' USING ERRCODE='P0003'; END IF;
 IF _payload IS NULL OR jsonb_typeof(_payload)<>'object' THEN RAISE EXCEPTION 'Invalid bank details' USING ERRCODE='P0004'; END IF;
 v_method:=_payload->>'payout_method';
 IF v_method IS NULL OR v_method NOT IN ('bank','promptpay') OR coalesce(length(btrim(_payload->>'account_holder_name')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid bank details' USING ERRCODE='P0004'; END IF;
 v_number:=CASE WHEN v_method='bank' THEN _payload->>'bank_account_no' ELSE _payload->>'promptpay_no' END;
 IF v_number IS NULL OR v_number!~'^[0-9]+$' OR (v_method='bank' AND (length(v_number) NOT BETWEEN 8 AND 20 OR coalesce(length(btrim(_payload->>'bank_name')),0) NOT BETWEEN 1 AND 80)) OR (v_method='promptpay' AND length(v_number) NOT IN (10,13)) THEN RAISE EXCEPTION 'Invalid bank details' USING ERRCODE='P0004'; END IF;
 IF coalesce(length(btrim(_payload->>'reason')),0) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Staff reason required' USING ERRCODE='P0004'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('staff_travel_claim:'||_evaluation_id::text));
 IF v_note.post_eval_token IS NULL THEN UPDATE pre_service_counseling_notes SET post_eval_token=gen_random_uuid() WHERE id=v_note.id RETURNING * INTO v_note; END IF;
 v_id:=public.submit_counseling_payout_claim(v_note.post_eval_token,jsonb_build_object('payout_method',v_method,'account_holder_name',btrim(_payload->>'account_holder_name'),'bank_name',CASE WHEN v_method='bank' THEN btrim(_payload->>'bank_name') ELSE 'พร้อมเพย์' END,'bank_account_no',CASE WHEN v_method='bank' THEN v_number ELSE NULL END,'promptpay_no',CASE WHEN v_method='promptpay' THEN v_number ELSE NULL END));
 INSERT INTO pdpa_audit_logs(actor_type,action_type,target_type,target_id,reason,metadata) VALUES('user','create','counseling_payout_claims',v_id::text,btrim(_payload->>'reason'),jsonb_build_object('evaluation_id',_evaluation_id,'source','staff_entry'));
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.staff_submit_travel_claim(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_submit_travel_claim(uuid,jsonb) TO authenticated,service_role;
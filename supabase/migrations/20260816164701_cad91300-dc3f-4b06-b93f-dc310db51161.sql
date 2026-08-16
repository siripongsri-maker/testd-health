CREATE POLICY "Users can update their own read status"
  ON public.notification_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_audit_pre_service_counseling_notes ON public.pre_service_counseling_notes;
CREATE TRIGGER trg_audit_pre_service_counseling_notes
AFTER INSERT OR UPDATE OR DELETE ON public.pre_service_counseling_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();
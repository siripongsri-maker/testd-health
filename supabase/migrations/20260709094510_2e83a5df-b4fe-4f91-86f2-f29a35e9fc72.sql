DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.appointment_pre_service_surveys REPLICA IDENTITY FULL';
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_pre_service_surveys';
  EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;
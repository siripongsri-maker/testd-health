
-- 1) Pre-service surveys: remove anon direct-insert path; require auth.uid() ownership.
--    Anonymous/guest submissions continue via the SECURITY DEFINER RPC submit_pre_service_survey.
DROP POLICY IF EXISTS "Submit pre-service survey for own booking" ON public.appointment_pre_service_surveys;
DROP POLICY IF EXISTS "Anyone can submit pre-service survey for a real booking" ON public.appointment_pre_service_surveys;

CREATE POLICY "Owners insert own pre-service survey"
ON public.appointment_pre_service_surveys
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_pre_service_surveys.booking_id
      AND a.user_id = auth.uid()
  )
);

-- 2) Fix guest selftest-results upload policy: OR/AND precedence bug let any bucket accept .jpg/.png/.heic.
DROP POLICY IF EXISTS "Guests can upload result photos under guest folder" ON storage.objects;

CREATE POLICY "Guests can upload result photos under guest folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'selftest-results'
  AND (storage.foldername(name))[1] = 'guest'
  AND (
    lower(right(name, 4)) IN ('.jpg', '.png', '.heic')
    OR lower(right(name, 5)) IN ('.jpeg', '.webp')
  )
);

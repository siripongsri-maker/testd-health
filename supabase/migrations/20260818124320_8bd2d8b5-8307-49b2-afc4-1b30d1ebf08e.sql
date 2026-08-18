
DROP POLICY IF EXISTS "Validated partner invite event insert" ON public.partner_invite_events;
CREATE POLICY "Validated partner invite event insert"
  ON public.partner_invite_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    invite_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.partner_invites pi WHERE pi.id = invite_id)
    AND length(coalesce(visitor_session_id, '')) BETWEEN 1 AND 100
    AND event_type ~ '^[a-z0-9_]{1,40}$'
  );

DROP POLICY IF EXISTS "Validated visit event insert" ON public.client_seed_visits;
CREATE POLICY "Validated visit event insert"
  ON public.client_seed_visits FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND client_seed_id ~ '^cs_[0-9]{10,16}_[a-z0-9]{1,20}$'
    AND event_type IN ('visit_started','assessment_viewed','assessment_started','assessment_submitted','assessment_completed')
    AND (page_path IS NULL OR length(page_path) <= 300)
    AND (channel IS NULL OR length(channel) <= 60)
    AND (language IS NULL OR length(language) <= 12)
    AND (uic IS NULL OR length(uic) <= 40)
    AND (metadata IS NULL OR length(metadata::text) <= 4000)
  );

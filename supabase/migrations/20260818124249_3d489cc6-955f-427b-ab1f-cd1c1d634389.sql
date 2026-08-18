
-- 1) booking_rate_logs: no direct client writes (only SECURITY DEFINER rate-limit functions)
DROP POLICY IF EXISTS "System insert rate logs" ON public.booking_rate_logs;
REVOKE INSERT, UPDATE, DELETE ON public.booking_rate_logs FROM anon, authenticated;
GRANT ALL ON public.booking_rate_logs TO service_role;

-- 2) client_seed_visits: validate self-consistency of the inserted row
DROP POLICY IF EXISTS "Anyone can insert visit events" ON public.client_seed_visits;
CREATE POLICY "Validated visit event insert"
  ON public.client_seed_visits FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND client_seed_id ~ '^cs_[0-9]{10,16}_[a-z0-9]{4,16}$'
    AND event_type IN ('visit_started','assessment_viewed','assessment_started','assessment_submitted','assessment_completed')
    AND (page_path IS NULL OR length(page_path) <= 300)
    AND (channel IS NULL OR length(channel) <= 60)
    AND (language IS NULL OR length(language) <= 12)
    AND (uic IS NULL OR length(uic) <= 40)
    AND (metadata IS NULL OR length(metadata::text) <= 4000)
  );

-- 3) audit/attribution tables: add ownership / shape validation
DROP POLICY IF EXISTS "Anyone can insert clinic link audit" ON public.clinic_link_audit;
CREATE POLICY "Validated clinic link audit insert"
  ON public.clinic_link_audit FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(coalesce(component, '')) BETWEEN 1 AND 120
    AND length(coalesce(original_link, '')) <= 500
    AND action_taken IN ('redirected','blocked','rewritten','logged')
  );

DROP POLICY IF EXISTS "Anyone can insert event" ON public.partner_invite_events;
CREATE POLICY "Validated partner invite event insert"
  ON public.partner_invite_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    invite_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.partner_invites pi WHERE pi.id = invite_id)
    AND length(coalesce(visitor_session_id, '')) BETWEEN 1 AND 100
    AND event_type IN ('visited','opened','accepted','declined','booking_started','booking_completed','selftest_requested','session_joined','relay_sent')
  );

DROP POLICY IF EXISTS "Anyone can insert visit" ON public.partner_invite_visits;
CREATE POLICY "Validated partner invite visit insert"
  ON public.partner_invite_visits FOR INSERT TO anon, authenticated
  WITH CHECK (
    invite_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.partner_invites pi WHERE pi.id = invite_id)
    AND length(coalesce(visitor_session_id, '')) BETWEEN 1 AND 100
    AND (user_agent IS NULL OR length(user_agent) <= 400)
    AND (referrer IS NULL OR length(referrer) <= 500)
  );

DROP POLICY IF EXISTS "anyone_can_insert_attribution" ON public.booking_attributions;
CREATE POLICY "Validated booking attribution insert"
  ON public.booking_attributions FOR INSERT TO anon, authenticated
  WITH CHECK (
    (invite_id IS NULL OR EXISTS (SELECT 1 FROM public.partner_invites pi WHERE pi.id = invite_id))
    AND length(coalesce(visitor_session_id, '')) BETWEEN 1 AND 100
    AND (session_id IS NULL OR length(session_id) <= 100)
    AND (booking_id IS NULL OR length(booking_id) <= 100)
    AND (attribution_type IS NULL OR length(attribution_type) <= 60)
  );

DROP POLICY IF EXISTS "Anyone can insert visitor_attribution" ON public.visitor_attribution;
CREATE POLICY "Validated visitor attribution insert"
  ON public.visitor_attribution FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND length(coalesce(anonymous_id, '')) BETWEEN 6 AND 100
  );

DROP POLICY IF EXISTS "Anyone can create story events" ON public.virtual_story_events;
CREATE POLICY "Validated story event insert"
  ON public.virtual_story_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND length(coalesce(story_id, '')) BETWEEN 1 AND 80
    AND length(coalesce(event_name, '')) BETWEEN 1 AND 80
    AND (scene_id IS NULL OR length(scene_id) <= 120)
    AND (scene_label IS NULL OR length(scene_label) <= 200)
    AND (choice_key IS NULL OR length(choice_key) <= 120)
    AND (choice_text IS NULL OR length(choice_text) <= 500)
    AND (topic IS NULL OR length(topic) <= 120)
    AND (cta_target IS NULL OR length(cta_target) <= 300)
    AND (payload IS NULL OR length(payload::text) <= 4000)
  );

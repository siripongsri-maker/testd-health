CREATE TABLE IF NOT EXISTS public.anonymous_data_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  analytics_enabled boolean NOT NULL DEFAULT true,
  raw_retention_days integer NOT NULL DEFAULT 180,
  disposal_method text NOT NULL DEFAULT 'aggregate_then_delete',
  anonymous_id_rotation_days integer NOT NULL DEFAULT 90,
  store_referrer boolean NOT NULL DEFAULT true,
  store_user_agent boolean NOT NULL DEFAULT false,
  allow_user_optout boolean NOT NULL DEFAULT true,
  privacy_note_th text,
  last_run_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anonymous_data_settings_method_chk CHECK (disposal_method IN ('delete','aggregate_then_delete','aggregate_only')),
  CONSTRAINT anonymous_data_settings_days_chk CHECK (raw_retention_days BETWEEN 7 AND 3650 AND anonymous_id_rotation_days BETWEEN 1 AND 3650)
);

GRANT SELECT, INSERT, UPDATE ON public.anonymous_data_settings TO authenticated;
GRANT ALL ON public.anonymous_data_settings TO service_role;
ALTER TABLE public.anonymous_data_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_admin_all" ON public.anonymous_data_settings;
CREATE POLICY "ads_admin_all" ON public.anonymous_data_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ads_analyst_read" ON public.anonymous_data_settings;
CREATE POLICY "ads_analyst_read" ON public.anonymous_data_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'me_analyst'));

CREATE OR REPLACE FUNCTION public.set_anonymous_data_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ads_updated_at ON public.anonymous_data_settings;
CREATE TRIGGER trg_ads_updated_at BEFORE UPDATE ON public.anonymous_data_settings
FOR EACH ROW EXECUTE FUNCTION public.set_anonymous_data_settings_updated_at();

INSERT INTO public.anonymous_data_settings (singleton, privacy_note_th)
VALUES (true, 'ระบบเก็บสถิติการใช้งานแบบไม่ระบุตัวตนเพื่อพัฒนาบริการเท่านั้น')
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_anonymous_data_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.anonymous_data_settings%ROWTYPE;
  v_cutoff timestamptz;
  v_job_id uuid;
  v_processed integer := 0;
  v_deleted integer := 0;
  v_anonymized integer := 0;
  v_days_summarized integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_settings FROM public.anonymous_data_settings WHERE singleton = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'settings not configured';
  END IF;

  v_cutoff := now() - make_interval(days => v_settings.raw_retention_days);

  INSERT INTO public.anonymization_jobs (target_table, status, started_at, triggered_by)
  VALUES ('analytics_events', 'running', now(), auth.uid())
  RETURNING id INTO v_job_id;

  SELECT count(*) INTO v_processed FROM public.analytics_events WHERE created_at < v_cutoff;

  IF v_settings.disposal_method IN ('aggregate_then_delete','aggregate_only') THEN
    WITH agg AS (
      SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS d,
             count(DISTINCT coalesce(anonymous_id, session_id, id::text)) AS visitors,
             count(*) FILTER (WHERE event_type = 'page_view') AS pageviews,
             count(DISTINCT session_id) AS sessions
      FROM public.analytics_events
      WHERE created_at < v_cutoff
      GROUP BY 1
    ), up AS (
      INSERT INTO public.analytics_daily_summary (date, total_visitors, total_pageviews, unique_sessions)
      SELECT d, visitors, pageviews, sessions FROM agg
      ON CONFLICT (date) DO UPDATE
        SET total_visitors = GREATEST(public.analytics_daily_summary.total_visitors, EXCLUDED.total_visitors),
            total_pageviews = GREATEST(public.analytics_daily_summary.total_pageviews, EXCLUDED.total_pageviews),
            unique_sessions = GREATEST(public.analytics_daily_summary.unique_sessions, EXCLUDED.unique_sessions),
            updated_at = now()
      RETURNING 1
    )
    SELECT count(*) INTO v_days_summarized FROM up;
  END IF;

  IF v_settings.disposal_method IN ('delete','aggregate_then_delete') THEN
    DELETE FROM public.analytics_events WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    UPDATE public.analytics_events
       SET anonymous_id = NULL, session_id = NULL, user_agent = NULL, referrer = NULL, user_id = NULL
     WHERE created_at < v_cutoff
       AND (anonymous_id IS NOT NULL OR session_id IS NOT NULL OR user_agent IS NOT NULL OR referrer IS NOT NULL OR user_id IS NOT NULL);
    GET DIAGNOSTICS v_anonymized = ROW_COUNT;
  END IF;

  UPDATE public.anonymization_jobs
     SET status = 'completed', completed_at = now(),
         records_processed = v_processed, records_deleted = v_deleted, records_anonymized = v_anonymized
   WHERE id = v_job_id;

  UPDATE public.anonymous_data_settings SET last_run_at = now() WHERE singleton = true;

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'cutoff', v_cutoff,
    'method', v_settings.disposal_method,
    'processed', v_processed,
    'deleted', v_deleted,
    'anonymized', v_anonymized,
    'days_summarized', v_days_summarized
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_anonymous_data_retention() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_anonymous_data_retention() TO authenticated;
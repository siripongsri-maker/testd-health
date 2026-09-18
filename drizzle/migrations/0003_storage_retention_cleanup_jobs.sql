-- Keep cron run history and high-volume event tables bounded so Cloud storage cost stops growing.
CREATE OR REPLACE FUNCTION public.cleanup_operational_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  LOOP
    DELETE FROM cron.job_run_details
    WHERE runid IN (
      SELECT runid FROM cron.job_run_details
      WHERE start_time < now() - interval '7 days'
      LIMIT 20000
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    EXIT WHEN v_deleted = 0;
  END LOOP;

  BEGIN
    DELETE FROM public.cache_reset_events WHERE created_at < now() - interval '30 days';
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    LOOP
      DELETE FROM public.analytics_events
      WHERE id IN (
        SELECT id FROM public.analytics_events
        WHERE created_at < now() - interval '120 days'
        LIMIT 20000
      );
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      EXIT WHEN v_deleted = 0;
    END LOOP;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    DELETE FROM public.visitor_attribution WHERE created_at < now() - interval '180 days';
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_operational_history() FROM public, anon, authenticated;

SELECT cron.schedule('cleanup-operational-history', '20 3 * * *', $$SELECT public.cleanup_operational_history();$$);
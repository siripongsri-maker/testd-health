ALTER TABLE public.hiv_selftest_requests
  ADD COLUMN IF NOT EXISTS tracking_stage TEXT,
  ADD COLUMN IF NOT EXISTS tracking_stage_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_selftest_tracking_event
  ON public.selftest_tracking_events (request_id, tracking_number, event_code, event_at);

CREATE INDEX IF NOT EXISTS idx_selftest_requests_tracking_poll
  ON public.hiv_selftest_requests (status, last_tracking_check_at)
  WHERE tracking_number IS NOT NULL;

SELECT cron.unschedule('selftest-poll-thailand-post')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'selftest-poll-thailand-post');

SELECT cron.schedule(
  'selftest-poll-thailand-post',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tzerhfvlrssrashrcbeg.supabase.co/functions/v1/poll-thailand-post',
    headers := '{"Content-Type":"application/json","x-cron-secret":"66c0fe088f0e2ecf3c202322666043012115d363abc271d6"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
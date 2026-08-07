SELECT cron.unschedule('process-post-eval-sms-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-post-eval-sms-queue');
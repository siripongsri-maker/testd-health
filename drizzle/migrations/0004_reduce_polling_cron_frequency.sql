-- lovable-cron-fallback-reviewed: 48 runs/day (route health), 96 runs/day (auto-checkout), 144 runs/day (client notifications); these replace existing 288/day and 144/day polling jobs and are pure cost reduction.
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'route-health-smoke-5min'), schedule := '*/30 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'auto-checkout-appointments'), schedule := '*/15 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'process-client-notifications'), schedule := '*/10 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'auto-no-show-cleanup'), schedule := '*/30 * * * *');
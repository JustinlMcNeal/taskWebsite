create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'daily-task-notifications',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://gdxzerylaifqamraloqc.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeHplcnlsYWlmcWFtcmFsb3FjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0NzE0NSwiZXhwIjoyMDkwMTIzMTQ1fQ.Lvm2hHnUWbF1jW-2x0TFDAnldhg18khbc14WeI5KlQI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Auto-sync cron: pull new emails from all connected integrations every 5 minutes.
-- Requires pg_net (enable via Dashboard → Database → Extensions → pg_net if not active).
--
-- SETUP (run once in Supabase SQL Editor after applying this migration):
--   ALTER DATABASE postgres
--     SET "app.settings.service_role_key" = '<your-service-role-key>',
--     "app.settings.supabase_url" = 'https://hngwmzvwelzwbldeotbq.supabase.co';
--   SELECT pg_reload_conf();

-- Remove any previous schedule
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-sync-email') THEN
    PERFORM cron.unschedule('auto-sync-email');
  END IF;
END $$;

-- sync-imap without integration_id syncs ALL connected integrations.
-- New INBOX emails trigger execute-ai-job automatically (fire-and-forget in sync-imap).
SELECT cron.schedule(
  'auto-sync-email',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url', true) || '/functions/v1/sync-imap',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $job$
);

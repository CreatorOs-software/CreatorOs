-- Add token + oauth state columns to email_integrations
ALTER TABLE public.email_integrations
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS history_id text,
  ADD COLUMN IF NOT EXISTS oauth_state text,
  ADD COLUMN IF NOT EXISTS oauth_state_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS email_integrations_oauth_state_idx
  ON public.email_integrations(oauth_state) WHERE oauth_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_threads_gmail_thread_idx
  ON public.email_threads(agency_id, gmail_thread_id);

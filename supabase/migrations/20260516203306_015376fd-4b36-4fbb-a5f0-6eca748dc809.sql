
ALTER TABLE public.calendar_integrations
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS external_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_state TEXT,
  ADD COLUMN IF NOT EXISTS oauth_state_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS calendar_integrations_oauth_state_idx
  ON public.calendar_integrations (oauth_state)
  WHERE oauth_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_external_idx
  ON public.events (external_provider, external_id);

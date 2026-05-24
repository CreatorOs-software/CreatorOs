
ALTER TABLE public.creator_social_accounts
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS oauth_state text,
  ADD COLUMN IF NOT EXISTS oauth_state_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_social_accounts_state ON public.creator_social_accounts(oauth_state) WHERE oauth_state IS NOT NULL;

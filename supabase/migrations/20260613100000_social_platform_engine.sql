-- ============================================================
-- Social Platform Engine
-- ============================================================
-- Replaces the monolithic creator_social_accounts table with a
-- clean three-layer model:
--   1. creator_accounts        — public profile (readable by all agency members)
--   2. platform_connections    — OAuth tokens  (service role only, never exposed via SDK)
--   3. integration_invites     — One-time invite links sent to creators
-- Plus:
--   4. creator_account_metrics_current — Denormalised snapshot for fast UI reads
--   5. creator_account_metrics_daily   — Historical time-series
--   6. sync_jobs                       — Lightweight queue for the sync engine
-- ============================================================

-- 1. creator_accounts -------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES public.creators(id)  ON DELETE CASCADE,

  platform         TEXT NOT NULL,   -- 'youtube' | 'instagram' | 'tiktok' | ...
  external_id      TEXT NOT NULL,   -- Platform-assigned ID (channel ID, user ID)
  username         TEXT NOT NULL,
  display_name     TEXT,
  avatar_url       TEXT,
  profile_url      TEXT,
  is_verified      BOOLEAN NOT NULL DEFAULT false,

  -- Sync bookkeeping
  sync_status      TEXT NOT NULL DEFAULT 'pending',  -- pending | active | error | disconnected
  sync_priority    INTEGER NOT NULL DEFAULT 2,        -- 1=6h  2=24h  3=7d
  last_sync_at     TIMESTAMPTZ,
  last_sync_error  TEXT,
  next_sync_at     TIMESTAMPTZ,

  connected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_creator_platform_account UNIQUE (creator_id, platform, external_id)
);

-- 2. platform_connections (sensitive — no direct client access) --
-- RLS blocks ALL client reads. Tokens are read only by Edge Functions
-- via the service role key (never the anon/user key).
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            UUID NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  creator_account_id   UUID NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,

  platform             TEXT NOT NULL,
  -- Tokens are encrypted at rest via Supabase Vault (pgsodium).
  -- Until Vault is configured, they are stored as plaintext.
  -- TODO: wrap with vault.create_secret() once Vault is enabled.
  access_token         TEXT,
  refresh_token        TEXT,
  token_expires_at     TIMESTAMPTZ,
  scopes               TEXT[] NOT NULL DEFAULT '{}',

  status               TEXT NOT NULL DEFAULT 'active',  -- active | revoked | expired
  connected_by         UUID REFERENCES public.profiles(id),
  connected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at           TIMESTAMPTZ,

  CONSTRAINT uq_connection_per_account UNIQUE (creator_account_id)
);

-- 3. integration_invites -----------------------------------------
-- Raw token is sent in the invite link.
-- Only the SHA-256 hash is stored so a DB leak can't replay tokens.
CREATE TABLE IF NOT EXISTS public.integration_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  creator_id   UUID NOT NULL REFERENCES public.creators(id)  ON DELETE CASCADE,
  platform     TEXT NOT NULL,

  token_hash   TEXT NOT NULL UNIQUE,  -- encode(sha256(raw_token::bytea), 'hex')

  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | connected | expired | revoked

  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_by   UUID REFERENCES public.profiles(id),
  accepted_at  TIMESTAMPTZ,

  -- Filled once creator completes OAuth
  creator_account_id UUID REFERENCES public.creator_accounts(id),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. creator_account_metrics_current ----------------------------
CREATE TABLE IF NOT EXISTS public.creator_account_metrics_current (
  creator_account_id  UUID PRIMARY KEY REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL,

  audience            BIGINT  NOT NULL DEFAULT 0,
  engagement_rate     NUMERIC(6, 3) NOT NULL DEFAULT 0,
  views_30d           BIGINT  NOT NULL DEFAULT 0,
  audience_growth_7d  INTEGER NOT NULL DEFAULT 0,
  audience_growth_30d INTEGER NOT NULL DEFAULT 0,
  monthly_revenue     NUMERIC(10, 2),

  -- Platform-specific extras that don't map to a normalised column
  raw                 JSONB NOT NULL DEFAULT '{}',

  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. creator_account_metrics_daily ------------------------------
CREATE TABLE IF NOT EXISTS public.creator_account_metrics_daily (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_account_id  UUID NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL,
  platform            TEXT NOT NULL,
  date                DATE NOT NULL,

  audience            BIGINT,
  engagement_rate     NUMERIC(6, 3),
  views               BIGINT,
  likes               BIGINT,
  comments            BIGINT,
  shares              BIGINT,
  audience_delta      INTEGER,  -- delta vs previous day's snapshot

  raw_data            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_daily_metric UNIQUE (creator_account_id, date)
);

-- 6. sync_jobs --------------------------------------------------
-- pg_cron inserts rows here; the Edge Function picks them up.
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_account_id  UUID NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL,
  platform            TEXT NOT NULL,
  priority            INTEGER NOT NULL DEFAULT 2,

  status              TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  attempts            INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 3,

  scheduled_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  error               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_creator_accounts_creator  ON public.creator_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_accounts_agency   ON public.creator_accounts(agency_id);
CREATE INDEX IF NOT EXISTS idx_creator_accounts_platform ON public.creator_accounts(platform);
-- Partial index for the sync scheduler — only active accounts that are due
CREATE INDEX IF NOT EXISTS idx_creator_accounts_due_sync
  ON public.creator_accounts(next_sync_at)
  WHERE sync_status = 'active';

CREATE INDEX IF NOT EXISTS idx_platform_connections_account
  ON public.platform_connections(creator_account_id);

CREATE INDEX IF NOT EXISTS idx_integration_invites_token
  ON public.integration_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_integration_invites_creator
  ON public.integration_invites(creator_id);

CREATE INDEX IF NOT EXISTS idx_metrics_daily_account_date
  ON public.creator_account_metrics_daily(creator_account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending
  ON public.sync_jobs(scheduled_at, priority)
  WHERE status = 'pending';

-- ============================================================
-- Row-Level Security
-- ============================================================

-- creator_accounts: any agency member can read
ALTER TABLE public.creator_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_accounts_agency"
  ON public.creator_accounts FOR ALL
  USING (agency_id = public.current_agency_id());

-- platform_connections: BLOCKED for all app users.
-- Tokens are only read by Edge Functions using the service role key.
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_connections_no_client_access"
  ON public.platform_connections FOR ALL
  USING (false);

-- integration_invites: agency can manage their own; public can SELECT by token
-- (server validates token_hash server-side, never trusts client-supplied hash)
ALTER TABLE public.integration_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_invites_agency"
  ON public.integration_invites FOR ALL
  USING (agency_id = public.current_agency_id());
CREATE POLICY "integration_invites_public_read"
  ON public.integration_invites FOR SELECT
  USING (true);

-- metrics: agency-scoped reads only
ALTER TABLE public.creator_account_metrics_current ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_current_agency"
  ON public.creator_account_metrics_current FOR ALL
  USING (agency_id = public.current_agency_id());

ALTER TABLE public.creator_account_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_daily_agency"
  ON public.creator_account_metrics_daily FOR ALL
  USING (agency_id = public.current_agency_id());

-- sync_jobs: agency can read (not write — only service role writes)
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_jobs_agency_read"
  ON public.sync_jobs FOR SELECT
  USING (agency_id = public.current_agency_id());

-- ============================================================
-- updated_at trigger for creator_accounts
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_accounts_updated ON public.creator_accounts;
CREATE TRIGGER trg_creator_accounts_updated
  BEFORE UPDATE ON public.creator_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- pg_cron sync scheduler (requires pg_cron extension)
-- Runs every hour; inserts pending jobs for all active accounts
-- that are due, then notifies the Edge Function via pg_net.
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> with real values
-- before applying, or configure via app.settings:
--   ALTER DATABASE postgres SET app.edge_base_url = 'https://xyz.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
-- ============================================================

-- SELECT cron.schedule(
--   'enqueue-platform-sync',
--   '0 * * * *',
--   $$
--     INSERT INTO public.sync_jobs (creator_account_id, agency_id, platform, priority)
--     SELECT id, agency_id, platform, sync_priority
--     FROM   public.creator_accounts
--     WHERE  sync_status = 'active'
--       AND  (next_sync_at IS NULL OR next_sync_at <= now())
--     ON CONFLICT DO NOTHING;

--     PERFORM net.http_post(
--       url     := current_setting('app.edge_base_url') || '/functions/v1/sync-platform',
--       body    := '{}',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type',  'application/json'
--       )
--     );
--   $$
-- );

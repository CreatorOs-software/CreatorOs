ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS campaign_start   DATE,
  ADD COLUMN IF NOT EXISTS campaign_end     DATE,
  ADD COLUMN IF NOT EXISTS contract_status  TEXT NOT NULL DEFAULT 'offen',
  ADD COLUMN IF NOT EXISTS contract_date    DATE,
  ADD COLUMN IF NOT EXISTS contract_url     TEXT,
  ADD COLUMN IF NOT EXISTS rights           JSONB,
  ADD COLUMN IF NOT EXISTS approval_info    JSONB,
  ADD COLUMN IF NOT EXISTS delivery_info    JSONB,
  ADD COLUMN IF NOT EXISTS guidelines       JSONB,
  ADD COLUMN IF NOT EXISTS tracking_assets  JSONB,
  ADD COLUMN IF NOT EXISTS exclusivity_info JSONB,
  ADD COLUMN IF NOT EXISTS embargo          JSONB,
  ADD COLUMN IF NOT EXISTS whitelisting     JSONB;

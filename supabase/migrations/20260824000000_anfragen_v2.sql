-- Anfragen v2: extend to match full Deal schema
-- Adds deliverables (JSONB array), payment_items, fee, product, title, campaign dates, guidelines, tracking

ALTER TABLE public.anfragen
  ADD COLUMN IF NOT EXISTS title           TEXT,
  ADD COLUMN IF NOT EXISTS product         TEXT,
  ADD COLUMN IF NOT EXISTS campaign_start  TEXT,
  ADD COLUMN IF NOT EXISTS campaign_end    TEXT,
  ADD COLUMN IF NOT EXISTS deliverables    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS payment_items   JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fee             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS guidelines      JSONB,
  ADD COLUMN IF NOT EXISTS tracking_assets JSONB;

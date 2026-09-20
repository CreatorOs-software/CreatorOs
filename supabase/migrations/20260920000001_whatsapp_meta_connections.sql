-- ============================================================
-- WhatsApp: migrate connections from Twilio to Meta Cloud API
-- ============================================================
-- Adds Meta-specific columns to the existing per-agency connection row.
-- Twilio columns are kept as-is (historical record, see the file header
-- in 20260831000001_whatsapp_connections.sql) — they are no longer read
-- by the active send path after this migration.
--
-- `provider` distinguishes how a row should be interpreted; new
-- connections are always 'meta'. Existing 'connected' Twilio rows are
-- demoted to 'needs_reconnect' below — a real Embedded Signup run is
-- required, tokens are never carried over.
--
-- The two partial unique indexes are the tenant-isolation guarantee for
-- point 2 of the migration: the same WABA or the same phone number can
-- never be attached to two agencies' rows at once.
-- ============================================================

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS provider                TEXT NOT NULL DEFAULT 'twilio'
    CHECK (provider IN ('twilio', 'meta')),

  -- Meta identifiers
  ADD COLUMN IF NOT EXISTS waba_id                  TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_id          TEXT,
  ADD COLUMN IF NOT EXISTS business_id              TEXT,
  ADD COLUMN IF NOT EXISTS display_phone_number     TEXT,
  ADD COLUMN IF NOT EXISTS verified_name            TEXT,

  -- Encrypted System User access token (see lib/secret-box.server.ts) —
  -- "<iv_b64>.<tag_b64>.<ciphertext_b64>", never the raw token.
  ADD COLUMN IF NOT EXISTS access_token_encrypted    TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_subscribed_at     TIMESTAMPTZ;

-- One agency per WABA / per phone number, enforced at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_connections_waba_id
  ON public.whatsapp_connections (waba_id) WHERE waba_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_connections_phone_number_id
  ON public.whatsapp_connections (phone_number_id) WHERE phone_number_id IS NOT NULL;

-- Demote existing live Twilio connections — they can no longer send
-- (the service now refuses any provider = 'twilio' row), and the UI
-- must show "Erneut verbinden erforderlich" rather than "Verbunden".
UPDATE public.whatsapp_connections
SET status = 'needs_reconnect'
WHERE provider = 'twilio' AND status = 'connected';

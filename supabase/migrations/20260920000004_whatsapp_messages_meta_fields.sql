-- ============================================================
-- WhatsApp messages — Meta fields, direction, delivery lifecycle
-- ============================================================
-- Extends the existing send-log/audit table (previously Twilio-only,
-- outbound-only) to also cover:
--   - provider: which API handled this row ('twilio' rows are frozen
--     history; new rows are always 'meta').
--   - direction: 'outbound' (unchanged default, matches all historical
--     rows) or 'inbound' (written by the webhook handler).
--   - wa_message_id: Meta's `wamid...` id. Unique when present — this
--     is the idempotency key for both inbound insert-dedup
--     (ON CONFLICT DO NOTHING) and outbound status-update lookups.
--   - delivered_at / read_at / failed_at: set once, by the webhook
--     handler, as status events arrive (sent is implied by the row
--     existing at all).
-- `twilio_sid` and `content_sid` are kept for historical rows.
-- ============================================================

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider        TEXT NOT NULL DEFAULT 'twilio'
    CHECK (provider IN ('twilio', 'meta')),
  ADD COLUMN IF NOT EXISTS direction       TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS wa_message_id   TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at       TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_wa_message_id
  ON public.whatsapp_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_agency_direction
  ON public.whatsapp_messages (agency_id, direction, created_at DESC);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_connections TO service_role;

-- ============================================================
-- Creator phone + WhatsApp opt-in
-- ============================================================
-- Adds a contact phone number (E.164) plus a documented opt-in flag
-- for business-initiated WhatsApp template messaging. Meta / Twilio
-- require a recorded opt-in before a template message may be sent.
-- ============================================================

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS phone              TEXT,          -- E.164, e.g. +4915112345678
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;

-- No new RLS: inherits the existing public.creators policies.

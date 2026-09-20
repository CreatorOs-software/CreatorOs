-- ============================================================
-- WhatsApp: add 'needs_reconnect' connection status
-- ============================================================
-- Used to flag legacy Twilio connections after the Meta Cloud API
-- migration — they must NOT read as "connected" (that would let the
-- app believe it can still send), but "disconnected" undersells that
-- action is required. Kept in its own migration: enum values added
-- with ALTER TYPE cannot be referenced by statements in the same
-- transaction that adds them.
-- ============================================================

ALTER TYPE public.whatsapp_connection_status ADD VALUE IF NOT EXISTS 'needs_reconnect';

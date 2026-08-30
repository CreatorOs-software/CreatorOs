-- ============================================================
-- WhatsApp connection (per agency) — Twilio credentials
-- ============================================================
-- One row per agency. Holds the Twilio credentials used to send
-- outbound WhatsApp template messages on the agency's behalf.
--
-- SENSITIVE — no direct client access. The auth token is read only
-- by server routes using the service role key, never the anon/user
-- key. The settings UI reads a redacted status view through the
-- domain service.
--
-- Mirrors the platform_connections pattern from the social engine.
-- ============================================================

CREATE TYPE public.whatsapp_connection_status AS ENUM (
  'connected', 'disconnected', 'error', 'pending'
);

CREATE TABLE public.whatsapp_connections (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id              UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  status                 public.whatsapp_connection_status NOT NULL DEFAULT 'pending',
  from_number            TEXT,   -- E.164, the agency WhatsApp Business sender

  -- Twilio credentials. Plaintext until Supabase Vault (pgsodium) is wired up.
  -- TODO: wrap twilio_auth_token with vault.create_secret() once Vault is enabled.
  twilio_account_sid     TEXT,
  twilio_auth_token      TEXT,
  messaging_service_sid  TEXT,   -- optional alternative to from_number

  content_sid            TEXT,   -- approved Twilio Content template SID (HX...)
  template_name          TEXT,

  last_error             TEXT,
  created_by             UUID REFERENCES public.profiles(id),
  connected_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_whatsapp_connection_per_agency UNIQUE (agency_id)
);

DROP TRIGGER IF EXISTS trg_whatsapp_connections_updated ON public.whatsapp_connections;
CREATE TRIGGER trg_whatsapp_connections_updated
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BLOCKED for all app users. Read/written only via the service role key.
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_connections_no_client_access"
  ON public.whatsapp_connections FOR ALL
  USING (false);

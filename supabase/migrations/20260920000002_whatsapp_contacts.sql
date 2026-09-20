-- ============================================================
-- WhatsApp contacts — per-agency counterparty state
-- ============================================================
-- Tracks, per agency, the last time a WhatsApp user messaged in —
-- the basis for the 24h customer service window (freeform text is
-- only allowed while that window is open; otherwise an approved
-- template is required). Written by the webhook handler (service
-- role) on every inbound message; read by the send service.
-- ============================================================

CREATE TABLE public.whatsapp_contacts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  wa_id                    TEXT NOT NULL,  -- Meta contact id (phone digits, no "+")
  creator_id               UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  display_name             TEXT,

  last_inbound_at          TIMESTAMPTZ,
  last_inbound_message_id  TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_whatsapp_contacts_agency_wa_id UNIQUE (agency_id, wa_id)
);

DROP TRIGGER IF EXISTS trg_whatsapp_contacts_updated ON public.whatsapp_contacts;
CREATE TRIGGER trg_whatsapp_contacts_updated
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_whatsapp_contacts_creator ON public.whatsapp_contacts(creator_id);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.whatsapp_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_contacts TO service_role;
CREATE POLICY "whatsapp_contacts_agency_read"
  ON public.whatsapp_contacts FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
-- INSERT / UPDATE: service role only (webhook handler, unauthenticated route).

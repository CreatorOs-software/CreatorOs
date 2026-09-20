-- ============================================================
-- WhatsApp templates — per-agency Meta-approved message templates
-- ============================================================
-- A local cache of each agency's approved templates from
-- WABA/message_templates, synced on demand from the integrations page.
-- Used to (a) let the sender pick a real, approved template instead of
-- free text once the 24h service window is closed, and (b) know each
-- template's body-parameter count for the UI.
-- ============================================================

CREATE TABLE public.whatsapp_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  meta_template_id  TEXT NOT NULL,
  name              TEXT NOT NULL,
  language          TEXT NOT NULL,
  category          TEXT NOT NULL,
  status            TEXT NOT NULL,   -- APPROVED | PENDING | REJECTED | ...
  components        JSONB NOT NULL DEFAULT '[]',

  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_whatsapp_templates_agency_name_lang UNIQUE (agency_id, name, language)
);

CREATE INDEX idx_whatsapp_templates_agency ON public.whatsapp_templates(agency_id);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.whatsapp_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO service_role;
CREATE POLICY "whatsapp_templates_agency_read"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
-- INSERT / UPDATE / DELETE: service role only (sync route, uses service role key).

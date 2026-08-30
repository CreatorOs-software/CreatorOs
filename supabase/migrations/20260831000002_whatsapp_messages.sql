-- ============================================================
-- WhatsApp messages — outbound send log / audit trail
-- ============================================================
-- One row per send attempt (from the Work-Panel dialog or a
-- connection test). Also the seam for a later delivery-status
-- webhook: match on twilio_sid and update `status`.
--
-- Agency members may read their own rows. INSERT / UPDATE happen
-- only through the service role (no client write policy).
-- ============================================================

CREATE TABLE public.whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES public.agencies(id)       ON DELETE CASCADE,
  creator_id    UUID          REFERENCES public.creators(id)       ON DELETE SET NULL,
  thread_id     UUID          REFERENCES public.email_threads(id)  ON DELETE SET NULL,

  to_number     TEXT NOT NULL,
  body          TEXT NOT NULL,
  content_sid   TEXT,
  twilio_sid    TEXT,   -- Twilio Message SID (SM...); null if the API call failed

  status        TEXT NOT NULL DEFAULT 'queued',  -- queued | sent | failed  (+ delivered/read later)
  error         TEXT,

  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_agency ON public.whatsapp_messages(agency_id, created_at DESC);
CREATE INDEX idx_whatsapp_messages_thread ON public.whatsapp_messages(thread_id);
CREATE INDEX idx_whatsapp_messages_twilio ON public.whatsapp_messages(twilio_sid);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_messages_agency_read"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
-- INSERT / UPDATE: service role only (no client policy).

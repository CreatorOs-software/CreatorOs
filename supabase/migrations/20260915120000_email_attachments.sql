-- Email attachments: metadata captured eagerly at sync time, bytes fetched
-- lazily into Storage on first WorkPanel "Analysieren" click.
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email_thread_id            UUID NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  filename                   TEXT NOT NULL,
  mime_type                  TEXT NOT NULL,
  size_bytes                 INTEGER NOT NULL,
  gmail_attachment_id        TEXT,
  is_classifiable            BOOLEAN NOT NULL DEFAULT false,
  storage_path               TEXT,
  classification              TEXT CHECK (classification IN ('RECHNUNG','VERTRAG_BRIEFING','ANDERES')),
  classification_confidence   INT,
  extracted                   JSONB,
  analysed_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_attachments_thread_id_idx ON public.email_attachments(email_thread_id);
CREATE INDEX IF NOT EXISTS email_attachments_agency_id_idx ON public.email_attachments(agency_id);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "email_attachments agency read"   ON public.email_attachments FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_attachments agency insert" ON public.email_attachments FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_attachments agency update" ON public.email_attachments FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_attachments agency delete" ON public.email_attachments FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Files are stored at: {agencyId}/{emailThreadId}/{attachmentRowId}-{sanitizedFilename}
-- All storage access goes through the sync-gmail edge function / API routes using the service client.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('email-attachments', 'email-attachments', false, 15728640, null) -- 15 MB, all mime types allowed
ON CONFLICT (id) DO NOTHING;

-- Needed to call Gmail's messages/{messageId}/attachments/{attachmentId} endpoint;
-- gmail_thread_id/message_id (RFC822) alone aren't the Gmail-internal message id.
ALTER TABLE public.email_threads ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

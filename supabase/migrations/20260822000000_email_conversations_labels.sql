-- conversations: groups related email_threads (one per Gmail thread / reply-chain)
CREATE TABLE IF NOT EXISTS public.conversations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          UUID        NOT NULL REFERENCES public.agencies(id)         ON DELETE CASCADE,
  integration_id     UUID        NOT NULL REFERENCES public.email_integrations(id) ON DELETE CASCADE,
  provider_thread_id TEXT,                   -- Gmail thread ID (nullable for SMTP)
  subject_canonical  TEXT,                   -- subject stripped of Re:/Fwd: prefixes
  anfrage_id         UUID        REFERENCES public.anfragen(id) ON DELETE SET NULL,
  first_email_at     TIMESTAMPTZ,
  last_email_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_agency_provider_thread_idx
  ON public.conversations(agency_id, provider_thread_id)
  WHERE provider_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_agency_subject_idx
  ON public.conversations(agency_id, integration_id, subject_canonical);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "conversations agency select" ON public.conversations
    FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "conversations agency insert" ON public.conversations
    FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "conversations agency update" ON public.conversations
    FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role needs unrestricted access for edge functions
DO $$ BEGIN
  CREATE POLICY "conversations service role all" ON public.conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── New columns on email_threads ────────────────────────────────────────────

ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS system_labels     TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS label_status      TEXT    NOT NULL DEFAULT 'pending'
    CHECK (label_status IN ('pending','processing','completed','skipped','failed','manual','low_confidence')),
  ADD COLUMN IF NOT EXISTS conversation_id   UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_id        TEXT,
  ADD COLUMN IF NOT EXISTS in_reply_to       TEXT,
  ADD COLUMN IF NOT EXISTS references_header TEXT;

CREATE INDEX IF NOT EXISTS email_threads_conversation_id_idx
  ON public.email_threads(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_threads_message_id_idx
  ON public.email_threads(message_id)
  WHERE message_id IS NOT NULL;

-- Backfill: threads already AI-processed → mark completed
UPDATE public.email_threads
  SET label_status = 'completed'
  WHERE ai_processed = true AND label_status = 'pending';

CREATE INDEX IF NOT EXISTS email_threads_system_labels_idx
  ON public.email_threads USING GIN (system_labels)
  WHERE array_length(system_labels, 1) > 0;

-- ─── AUTO_LABEL flag on email_integrations ────────────────────────────────────

ALTER TABLE public.email_integrations
  ADD COLUMN IF NOT EXISTS auto_label BOOLEAN NOT NULL DEFAULT false;

-- Service role policy on email_threads for edge function writes
DO $$ BEGIN
  CREATE POLICY "email_threads service role all" ON public.email_threads
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

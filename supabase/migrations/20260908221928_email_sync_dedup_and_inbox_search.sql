-- One provider message may only exist once per connected mailbox. This makes
-- concurrent/replayed syncs safe at the database boundary.
CREATE UNIQUE INDEX IF NOT EXISTS email_threads_integration_message_unique
  ON public.email_threads (integration_id, gmail_thread_id);

-- Search the complete mailbox without returning body/body_html to list views.
ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(sender_name, '') || ' ' ||
      coalesce(sender_email, '') || ' ' ||
      coalesce(recipient_email, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(preview, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS email_threads_search_vector_idx
  ON public.email_threads USING GIN (search_vector);

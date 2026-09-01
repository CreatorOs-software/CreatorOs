-- ============================================================
-- Email integration sync resilience
-- ============================================================
-- A single flaky IMAP/Gmail sync run used to flip status straight to
-- 'error', which hides the mailbox from the Inbox entirely. Track a
-- consecutive-failure counter so transient network errors (connection
-- refused, timeouts) only escalate to 'error' after several failures
-- in a row. A successful sync resets it to 0.
-- ============================================================

ALTER TABLE public.email_integrations
  ADD COLUMN IF NOT EXISTS sync_failure_count integer NOT NULL DEFAULT 0;

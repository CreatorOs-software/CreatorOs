-- Backfill email_threads rows that were synced before folder tracking was added.
-- These were all pulled from INBOX (the only folder synced at the time).
UPDATE email_threads
SET folder = 'INBOX'
WHERE folder IS NULL OR folder = '';

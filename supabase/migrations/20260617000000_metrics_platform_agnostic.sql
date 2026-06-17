-- Make creator_account_metrics_current platform-agnostic.
-- The 4 YouTube-specific columns are dropped; their data moves into the raw JSONB field.
-- All platform-specific metrics live in raw — only cross-platform fields stay as columns.
--
-- Deploy order:
--   1. supabase functions deploy sync-youtube   (writes to raw instead of columns)
--   2. supabase db push                          (drops the columns)

ALTER TABLE public.creator_account_metrics_current
  DROP COLUMN IF EXISTS subscribers_gained_30d,
  DROP COLUMN IF EXISTS subscribers_lost_30d,
  DROP COLUMN IF EXISTS avg_view_duration_secs,
  DROP COLUMN IF EXISTS watch_time_hours_30d;

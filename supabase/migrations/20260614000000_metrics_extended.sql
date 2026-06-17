-- Extend creator_account_metrics_current with new YouTube-specific columns
-- collected by the updated sync-youtube edge function.

ALTER TABLE public.creator_account_metrics_current
  ADD COLUMN IF NOT EXISTS subscribers_gained_30d  INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscribers_lost_30d    INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_view_duration_secs  NUMERIC(8,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watch_time_hours_30d    NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendee_ids UUID[] NOT NULL DEFAULT '{}';

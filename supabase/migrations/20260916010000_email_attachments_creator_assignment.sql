-- Lets a classified RECHNUNG attachment be filed under a Creator's document
-- area (creator-documents bucket) instead of extracting deal fields from it.
ALTER TABLE public.email_attachments
  ADD COLUMN IF NOT EXISTS assigned_creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

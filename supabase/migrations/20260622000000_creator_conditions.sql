-- Creator conditions: rates, dream brands, wish themes, no-go
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS rates         JSONB     NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS dream_brands  TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wish_themes   TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS no_go         TEXT[]    NOT NULL DEFAULT '{}';

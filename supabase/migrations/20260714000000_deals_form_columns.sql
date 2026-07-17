-- Add columns required by the deal creation form (Steps 1–3)

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS product        TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS usage_rights   TEXT,
  ADD COLUMN IF NOT EXISTS exclusivity    TEXT,
  ADD COLUMN IF NOT EXISTS payment_items  JSONB NOT NULL DEFAULT '[]'::jsonb;

-- deliverables was TEXT[] (legacy free-text); new form stores structured objects
-- {count: number, content_type: string, platform: string}
-- Must drop the TEXT[] default before changing the type, then set a JSONB default.
ALTER TABLE public.deals
  ALTER COLUMN deliverables DROP DEFAULT;

ALTER TABLE public.deals
  ALTER COLUMN deliverables TYPE JSONB USING '[]'::jsonb;

ALTER TABLE public.deals
  ALTER COLUMN deliverables SET DEFAULT '[]'::jsonb;

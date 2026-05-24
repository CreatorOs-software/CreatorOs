ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_etag text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS events_external_idx ON public.events (external_provider, external_id);

DROP TRIGGER IF EXISTS events_touch_updated_at ON public.events;
CREATE TRIGGER events_touch_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
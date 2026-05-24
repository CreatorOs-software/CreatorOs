
DO $$ BEGIN
  CREATE TYPE public.calendar_provider AS ENUM ('google','outlook','icloud','caldav');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  provider public.calendar_provider NOT NULL,
  email text NOT NULL,
  display_name text,
  status public.integration_status NOT NULL DEFAULT 'pending',
  connected_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, provider, email)
);

ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read cal integrations" ON public.calendar_integrations
  FOR SELECT TO authenticated USING (agency_id = current_agency_id());
CREATE POLICY "members insert cal integrations" ON public.calendar_integrations
  FOR INSERT TO authenticated WITH CHECK (agency_id = current_agency_id());
CREATE POLICY "members update cal integrations" ON public.calendar_integrations
  FOR UPDATE TO authenticated USING (agency_id = current_agency_id()) WITH CHECK (agency_id = current_agency_id());
CREATE POLICY "members delete cal integrations" ON public.calendar_integrations
  FOR DELETE TO authenticated USING (agency_id = current_agency_id());

CREATE TRIGGER calendar_integrations_touch
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

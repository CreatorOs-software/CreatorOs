CREATE TYPE public.email_provider AS ENUM ('gmail','outlook','imap','custom');
CREATE TYPE public.integration_status AS ENUM ('connected','disconnected','error','pending');

CREATE TABLE public.email_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider public.email_provider NOT NULL,
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

CREATE TRIGGER touch_email_integrations
BEFORE UPDATE ON public.email_integrations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read integrations"
ON public.email_integrations FOR SELECT TO authenticated
USING (agency_id = public.current_agency_id());

CREATE POLICY "members insert integrations"
ON public.email_integrations FOR INSERT TO authenticated
WITH CHECK (agency_id = public.current_agency_id());

CREATE POLICY "members update integrations"
ON public.email_integrations FOR UPDATE TO authenticated
USING (agency_id = public.current_agency_id())
WITH CHECK (agency_id = public.current_agency_id());

CREATE POLICY "members delete integrations"
ON public.email_integrations FOR DELETE TO authenticated
USING (agency_id = public.current_agency_id());
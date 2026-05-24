
CREATE TABLE IF NOT EXISTS public.agency_oauth_apps (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  provider TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, provider)
);

ALTER TABLE public.agency_oauth_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth apps agency read" ON public.agency_oauth_apps
  FOR SELECT TO authenticated
  USING (agency_id = current_agency_id());

CREATE POLICY "oauth apps agency insert" ON public.agency_oauth_apps
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "oauth apps agency update" ON public.agency_oauth_apps
  FOR UPDATE TO authenticated
  USING (agency_id = current_agency_id())
  WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "oauth apps agency delete" ON public.agency_oauth_apps
  FOR DELETE TO authenticated
  USING (agency_id = current_agency_id());

CREATE TRIGGER agency_oauth_apps_touch
  BEFORE UPDATE ON public.agency_oauth_apps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

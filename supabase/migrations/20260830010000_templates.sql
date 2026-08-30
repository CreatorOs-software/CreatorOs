-- Agency-wide message templates (email + WhatsApp) with variable placeholders
-- resolved at render time (see lib/templates/resolve.ts).
CREATE TABLE IF NOT EXISTS public.templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'general' CHECK (channel IN ('email', 'whatsapp', 'general')),
  subject    TEXT,
  body       TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);

CREATE TRIGGER templates_touch BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "templates agency read" ON public.templates FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "templates agency insert" ON public.templates FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "templates agency update" ON public.templates FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "templates agency delete" ON public.templates FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

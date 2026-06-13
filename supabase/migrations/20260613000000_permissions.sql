-- 1. Add permissions JSONB to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';

-- 2. Migrate all existing profiles to admin role with full permissions
UPDATE public.profiles SET
  role = 'admin',
  permissions = '{
    "read_creators": true, "edit_creators": true,
    "read_brands": true, "edit_brands": true,
    "read_deals": true, "edit_deals": true,
    "read_events": true, "edit_events": true,
    "read_communication": true, "edit_communication": true,
    "read_integrations": true, "edit_integrations": true
  }'::jsonb;

-- 3. Update signup trigger: first user of an agency gets role='admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name      TEXT;
  v_initials  TEXT;
  v_agency_id UUID;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  v_initials := upper(
    substring(regexp_replace(v_name, '[^a-zA-Z ]', '', 'g'), 1, 1)
    || COALESCE(substring(split_part(v_name, ' ', 2), 1, 1), '')
  );
  IF length(v_initials) = 0 THEN v_initials := 'AK'; END IF;

  INSERT INTO public.agencies (name, plan)
  VALUES (v_name || '''s Agency', 'Pro')
  RETURNING id INTO v_agency_id;

  INSERT INTO public.profiles (id, agency_id, display_name, initials, role, permissions)
  VALUES (
    NEW.id,
    v_agency_id,
    v_name,
    v_initials,
    'admin',
    '{
      "read_creators": true, "edit_creators": true,
      "read_brands": true, "edit_brands": true,
      "read_deals": true, "edit_deals": true,
      "read_events": true, "edit_events": true,
      "read_communication": true, "edit_communication": true,
      "read_integrations": true, "edit_integrations": true
    }'::jsonb
  );

  RETURN NEW;
END $$;

-- 4. Create invitations table
CREATE TABLE IF NOT EXISTS public.agency_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '{}',
  invited_by  UUID REFERENCES public.profiles(id),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations within their agency
CREATE POLICY "agency_invitations_agency_access"
  ON public.agency_invitations
  FOR ALL
  USING (agency_id = public.current_agency_id());

-- Public read by token (for join page, unauthenticated)
CREATE POLICY "agency_invitations_token_read"
  ON public.agency_invitations
  FOR SELECT
  USING (true);

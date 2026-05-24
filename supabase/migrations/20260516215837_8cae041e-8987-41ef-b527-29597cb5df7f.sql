
-- Platform enum for social accounts
DO $$ BEGIN
  CREATE TYPE public.social_platform AS ENUM ('youtube','instagram','tiktok','onlyfans');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  handle text NOT NULL,
  external_id text,
  followers bigint,
  engagement_rate numeric,
  total_views bigint,
  recent_posts jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform, handle)
);

ALTER TABLE public.creator_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_accounts agency read" ON public.creator_social_accounts
  FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "social_accounts agency insert" ON public.creator_social_accounts
  FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "social_accounts agency update" ON public.creator_social_accounts
  FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "social_accounts agency delete" ON public.creator_social_accounts
  FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());

CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON public.creator_social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_social_accounts_creator ON public.creator_social_accounts(creator_id);

-- Snapshots for sparkline history
CREATE TABLE IF NOT EXISTS public.creator_social_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.creator_social_accounts(id) ON DELETE CASCADE,
  followers bigint,
  engagement_rate numeric,
  taken_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_social_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_snapshots agency read" ON public.creator_social_snapshots
  FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
CREATE POLICY "social_snapshots agency insert" ON public.creator_social_snapshots
  FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "social_snapshots agency delete" ON public.creator_social_snapshots
  FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());

CREATE INDEX IF NOT EXISTS idx_social_snapshots_account ON public.creator_social_snapshots(account_id, taken_at DESC);

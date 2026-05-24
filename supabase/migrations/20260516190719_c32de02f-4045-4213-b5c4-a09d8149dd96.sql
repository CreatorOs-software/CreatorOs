
-- Enums
CREATE TYPE public.deal_status AS ENUM ('incoming','evaluating','negotiation','confirmed','production','approval','scheduled','posted','invoiced','paid');
CREATE TYPE public.deal_priority AS ENUM ('low','med','high');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','overdue','paid');
CREATE TYPE public.event_type AS ENUM ('shoot','travel','deadline','brand','internal','posting');
CREATE TYPE public.creator_status AS ENUM ('active','on-break','inactive');
CREATE TYPE public.contract_status AS ENUM ('draft','in-review','pending-signature','active','expired');

-- Agencies
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'Pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (managers)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT 'AK',
  color TEXT NOT NULL DEFAULT 'oklch(0.55 0.17 270)',
  role TEXT NOT NULL DEFAULT 'Manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Creators
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  handle TEXT,
  niche TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  followers TEXT,
  monthly_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rate_card_url TEXT,
  media_kit_url TEXT,
  status public.creator_status NOT NULL DEFAULT 'active',
  initials TEXT NOT NULL DEFAULT '??',
  color TEXT NOT NULL DEFAULT 'oklch(0.55 0.17 270)',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.creators(agency_id);

-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  short_code TEXT NOT NULL DEFAULT '??',
  color TEXT NOT NULL DEFAULT 'oklch(0.5 0.1 260)',
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  relationship_score INT NOT NULL DEFAULT 70,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.brands(agency_id);

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.deal_status NOT NULL DEFAULT 'incoming',
  priority public.deal_priority NOT NULL DEFAULT 'med',
  platform TEXT,
  deadline DATE,
  campaign_type TEXT,
  deliverables TEXT[] NOT NULL DEFAULT '{}',
  assigned_manager UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual',
  blocker TEXT,
  email_thread_id UUID,
  sort_index NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.deals(agency_id, status);

-- Email threads
CREATE TABLE public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  gmail_thread_id TEXT,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT NOT NULL,
  preview TEXT,
  body TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread BOOLEAN NOT NULL DEFAULT true,
  starred BOOLEAN NOT NULL DEFAULT false,
  priority public.deal_priority NOT NULL DEFAULT 'med',
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  suggested_creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  ai_processed BOOLEAN NOT NULL DEFAULT false,
  confidence TEXT,
  confidence_score INT,
  extracted JSONB,
  linked_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.email_threads(agency_id, received_at DESC);

ALTER TABLE public.deals ADD CONSTRAINT deals_email_thread_fk FOREIGN KEY (email_thread_id) REFERENCES public.email_threads(id) ON DELETE SET NULL;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type public.event_type NOT NULL DEFAULT 'internal',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.events(agency_id, start_at);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issued_at DATE,
  due_date DATE,
  paid_at DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.invoices(agency_id, status);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  creator_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  agency_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  contract_type TEXT,
  status public.contract_status NOT NULL DEFAULT 'draft',
  file_url TEXT,
  expires_at DATE,
  exclusivity TEXT,
  extracted_terms JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger for deals
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER deals_touch BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Demo agency (single row used by all signups in Phase 1)
INSERT INTO public.agencies (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Lumen Talent', 'Pro');

-- Profile autocreate: assign new users to the demo agency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_initials TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1));
  v_initials := upper(substring(regexp_replace(v_name,'[^a-zA-Z ]','','g'),1,1)
                || COALESCE(substring(split_part(v_name,' ',2),1,1),''));
  IF length(v_initials) = 0 THEN v_initials := 'AK'; END IF;
  INSERT INTO public.profiles (id, agency_id, display_name, initials)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', v_name, v_initials);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: agency-scoped access. Anyone in the same agency can read/write all agency data.
ALTER TABLE public.agencies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts      ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "agency self" ON public.agencies FOR SELECT TO authenticated
  USING (id = public.current_agency_id());

CREATE POLICY "profiles same agency" ON public.profiles FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
CREATE POLICY "profile self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Helper macro: for each agency-scoped table, allow all CRUD where agency matches
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['creators','brands','deals','email_threads','events','invoices','payments','contracts']
  LOOP
    EXECUTE format('CREATE POLICY "%1$s agency read" ON public.%1$s FOR SELECT TO authenticated USING (agency_id = public.current_agency_id())', t);
    EXECUTE format('CREATE POLICY "%1$s agency insert" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id())', t);
    EXECUTE format('CREATE POLICY "%1$s agency update" ON public.%1$s FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id())', t);
    EXECUTE format('CREATE POLICY "%1$s agency delete" ON public.%1$s FOR DELETE TO authenticated USING (agency_id = public.current_agency_id())', t);
  END LOOP;
END $$;

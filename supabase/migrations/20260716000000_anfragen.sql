-- Anfragen: Incoming deal inquiries (pre-pipeline)
-- Separate from deals — these are inquiries/leads, not confirmed deals

CREATE TABLE IF NOT EXISTS public.anfragen (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID        NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  creator_id       UUID        NOT NULL REFERENCES public.creators(id)  ON DELETE CASCADE,
  brand_id         UUID                    REFERENCES public.brands(id) ON DELETE SET NULL,
  brand_name       TEXT,          -- manual entry if no brand record yet
  contact_person   TEXT,
  format           TEXT,          -- e.g. "YouTube Video", "Instagram Reel"
  budget_requested NUMERIC(10,2),
  budget_offer     NUMERIC(10,2),
  source           TEXT        NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('email','ig_dm','whatsapp','manual')),
  status           TEXT        NOT NULL DEFAULT 'neu'
                   CHECK (status IN ('neu','pruefung','angebot','verhandlung','zugesagt','gewonnen','abgelehnt')),
  rejection_reason TEXT,
  notes            TEXT,
  linked_deal_id   UUID                    REFERENCES public.deals(id)  ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- auto-update updated_at
CREATE OR REPLACE TRIGGER anfragen_updated_at
  BEFORE UPDATE ON public.anfragen
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.anfragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage anfragen"
  ON public.anfragen
  FOR ALL
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

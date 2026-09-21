-- Lets a mail thread be linked directly to a Deal, not just transitively via
-- its Anfrage (anfragen.linked_deal_id) — needed for Deals created manually
-- without ever going through an Anfrage.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_deal_id_idx
  ON public.conversations(deal_id)
  WHERE deal_id IS NOT NULL;

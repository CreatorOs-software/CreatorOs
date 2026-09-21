-- Notification lifecycle and stable identities for JSON-based deal items.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS rule_key TEXT,
  ADD COLUMN IF NOT EXISTS entity_key TEXT,
  ADD COLUMN IF NOT EXISTS stage INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_condition BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('OPEN', 'DISMISSED', 'CONVERTED', 'RESOLVED'));

CREATE INDEX IF NOT EXISTS notifications_condition_idx
  ON public.notifications(recipient_id, rule_key, entity_key, status)
  WHERE is_condition = true;

-- JSON array positions are not stable identifiers. Add IDs once and preserve
-- them on every subsequent deal write so notification entity keys stay valid.
CREATE OR REPLACE FUNCTION public.ensure_deal_item_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_result JSONB;
BEGIN
  v_result := '[]'::jsonb;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.payment_items, '[]'::jsonb))
  LOOP
    v_result := v_result || jsonb_build_array(
      CASE WHEN jsonb_typeof(v_item) = 'object' AND NOT (v_item ? 'id')
        THEN v_item || jsonb_build_object('id', gen_random_uuid()::text)
        ELSE v_item END
    );
  END LOOP;
  NEW.payment_items := v_result;

  v_result := '[]'::jsonb;
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.deliverables, '[]'::jsonb))
  LOOP
    v_result := v_result || jsonb_build_array(
      CASE WHEN jsonb_typeof(v_item) = 'object' AND NOT (v_item ? 'id')
        THEN v_item || jsonb_build_object('id', gen_random_uuid()::text)
        ELSE v_item END
    );
  END LOOP;
  NEW.deliverables := v_result;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_ensure_item_ids ON public.deals;
CREATE TRIGGER deals_ensure_item_ids
  BEFORE INSERT OR UPDATE OF payment_items, deliverables ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.ensure_deal_item_ids();

-- Backfill existing objects. The trigger assigns IDs during this update.
UPDATE public.deals
SET payment_items = payment_items,
    deliverables = deliverables
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(COALESCE(payment_items, '[]'::jsonb)) item
  WHERE jsonb_typeof(item) = 'object' AND NOT (item ? 'id')
)
OR EXISTS (
  SELECT 1 FROM jsonb_array_elements(COALESCE(deliverables, '[]'::jsonb)) item
  WHERE jsonb_typeof(item) = 'object' AND NOT (item ? 'id')
);

CREATE TABLE public.notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT '',
  content     TEXT        NOT NULL DEFAULT '',
  creator_id  UUID        REFERENCES public.creators(id) ON DELETE SET NULL,
  brand_id    UUID        REFERENCES public.brands(id)   ON DELETE SET NULL,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage notes"
  ON public.notes
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

CREATE INDEX notes_agency_id_idx ON public.notes(agency_id);

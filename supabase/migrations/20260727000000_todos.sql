CREATE TABLE public.todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES public.agencies(id)  ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  done        BOOLEAN     NOT NULL DEFAULT false,
  due_date    DATE,
  assignee_id UUID        REFERENCES public.creators(id) ON DELETE SET NULL,
  priority    TEXT        CHECK (priority IN ('niedrig', 'mittel', 'hoch')),
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage todos"
  ON public.todos
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

CREATE INDEX todos_agency_id_idx ON public.todos(agency_id);

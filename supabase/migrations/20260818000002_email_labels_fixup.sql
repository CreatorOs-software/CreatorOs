-- Idempotent fixup: ensure email_labels and email_thread_labels are complete.
-- email_labels may already exist from a previous attempt.

CREATE TABLE IF NOT EXISTS public.email_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#006FFE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);

CREATE TABLE IF NOT EXISTS public.email_thread_labels (
  thread_id UUID NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES public.email_labels(id)  ON DELETE CASCADE,
  PRIMARY KEY (thread_id, label_id)
);

CREATE INDEX IF NOT EXISTS email_thread_labels_label_id_idx ON public.email_thread_labels(label_id);

ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_thread_labels ENABLE ROW LEVEL SECURITY;

-- Policies for email_labels (safe to re-run with exception handling)
DO $$ BEGIN
  CREATE POLICY "email_labels agency read"   ON public.email_labels FOR SELECT TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_labels agency insert" ON public.email_labels FOR INSERT TO authenticated WITH CHECK (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_labels agency update" ON public.email_labels FOR UPDATE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_labels agency delete" ON public.email_labels FOR DELETE TO authenticated USING (agency_id = public.current_agency_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for email_thread_labels
DO $$ BEGIN
  CREATE POLICY "email_thread_labels agency read" ON public.email_thread_labels
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.email_threads t
      WHERE t.id = thread_id AND t.agency_id = public.current_agency_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_thread_labels agency insert" ON public.email_thread_labels
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.email_threads t
      WHERE t.id = thread_id AND t.agency_id = public.current_agency_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "email_thread_labels agency delete" ON public.email_thread_labels
    FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.email_threads t
      WHERE t.id = thread_id AND t.agency_id = public.current_agency_id()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

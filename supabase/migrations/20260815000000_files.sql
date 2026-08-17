-- Files table: tracks all files and folders per agency
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,            -- user-visible path, e.g. "/Documents/report.pdf"
  is_directory BOOLEAN NOT NULL DEFAULT false,
  size BIGINT,                   -- null for directories
  storage_path TEXT,             -- Supabase Storage path, null for directories
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, path)
);

CREATE INDEX IF NOT EXISTS files_agency_path_idx ON public.files(agency_id, path);

-- Pins table: which files are pinned by which user
CREATE TABLE IF NOT EXISTS public.file_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id, file_path)
);

-- Storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-files',
  'agency-files',
  false,
  52428800,
  null
)
ON CONFLICT (id) DO NOTHING;

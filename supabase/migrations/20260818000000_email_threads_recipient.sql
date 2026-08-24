ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;

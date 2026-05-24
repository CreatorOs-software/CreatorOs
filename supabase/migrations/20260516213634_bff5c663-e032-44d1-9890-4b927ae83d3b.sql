ALTER TABLE public.email_integrations
  ADD COLUMN IF NOT EXISTS imap_host text,
  ADD COLUMN IF NOT EXISTS imap_port integer,
  ADD COLUMN IF NOT EXISTS imap_secure boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS imap_username text,
  ADD COLUMN IF NOT EXISTS imap_password text,
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_port integer,
  ADD COLUMN IF NOT EXISTS smtp_secure boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_uid integer;

-- Allow 'imap' as provider type if enum doesn't already include it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'email_provider' AND e.enumlabel = 'imap'
  ) THEN
    BEGIN
      ALTER TYPE public.email_provider ADD VALUE IF NOT EXISTS 'imap';
    EXCEPTION WHEN undefined_object THEN
      -- enum type may have different name; ignore
      NULL;
    END;
  END IF;
END$$;
-- ─── Notification-System · Fundament (Phase 1) ──────────────────────────────
-- Glocke als Eingang für Bewegungs- und Nicht-Bewegungs-Signale.
-- Erzeugung ausschliesslich über public.emit_notification() (Dedup + Bundle + Mute).

-- ─── notifications ──────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  recipient_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  severity      TEXT        NOT NULL CHECK (severity IN ('LAUT', 'NORMAL', 'LEISE')),
  subject_type  TEXT        NOT NULL CHECK (subject_type IN ('ANFRAGE', 'DEAL', 'INVOICE', 'EMAIL_THREAD', 'EVENT')),
  subject_id    UUID,
  vorgang_key   TEXT        NOT NULL,
  creator_id    UUID        REFERENCES public.creators(id) ON DELETE SET NULL,
  dedup_key     TEXT        NOT NULL,
  bundle_key    TEXT,
  title         TEXT        NOT NULL,
  reason        TEXT,
  href          TEXT,
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT        NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISMISSED', 'CONVERTED')),
  todo_id       UUID        REFERENCES public.todos(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at       TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ
);

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX notifications_recipient_status_idx
  ON public.notifications(recipient_id, status, created_at DESC);

-- Dedup: max. eine OFFENE Benachrichtigung pro Vorgang
CREATE UNIQUE INDEX notifications_dedup_open_uidx
  ON public.notifications(dedup_key)
  WHERE status = 'OPEN';

-- Bündelung: eine OFFENE Rollup-Row pro bundle_key
CREATE UNIQUE INDEX notifications_bundle_open_uidx
  ON public.notifications(bundle_key)
  WHERE status = 'OPEN' AND bundle_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Nur der Empfänger sieht / bearbeitet seine Benachrichtigungen.
CREATE POLICY "notifications recipient select" ON public.notifications
  FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id() AND recipient_id = auth.uid());

CREATE POLICY "notifications recipient update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id() AND recipient_id = auth.uid())
  WITH CHECK (agency_id = public.current_agency_id() AND recipient_id = auth.uid());

-- Erzeugung läuft über emit_notification() (SECURITY DEFINER) – kein direktes INSERT.
CREATE POLICY "notifications service role all" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── notification_mutes ─────────────────────────────────────────────────────
CREATE TABLE public.notification_mutes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_type  TEXT        NOT NULL CHECK (scope_type IN ('VORGANG', 'CREATOR')),
  scope_key   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_type, scope_key)
);

CREATE INDEX notification_mutes_user_idx ON public.notification_mutes(user_id);

ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_mutes owner all" ON public.notification_mutes
  FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id() AND user_id = auth.uid())
  WITH CHECK (agency_id = public.current_agency_id() AND user_id = auth.uid());

CREATE POLICY "notification_mutes service role all" ON public.notification_mutes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Severity-Ranking (LEISE < NORMAL < LAUT) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.notif_severity_rank(p_severity TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_severity WHEN 'LAUT' THEN 3 WHEN 'NORMAL' THEN 2 WHEN 'LEISE' THEN 1 ELSE 0 END
$$;

-- ─── emit_notification: einziger Erzeugungs-Pfad ───────────────────────────
-- 1. Mute-Check (pro Empfänger, pro Vorgang / pro Creator)
-- 2. Bundle-Pfad: bestehende OFFENE Rollup-Row aktualisieren, sonst neu anlegen
-- 3. Dedup-Pfad: bestehende OFFENE Vorgangs-Row ersetzen (Severity = max(alt, neu)),
--    sonst neu anlegen
CREATE OR REPLACE FUNCTION public.emit_notification(
  p_agency_id    UUID,
  p_recipient_id UUID,
  p_type         TEXT,
  p_severity     TEXT,
  p_subject_type TEXT,
  p_subject_id   UUID,
  p_vorgang_key  TEXT,
  p_creator_id   UUID,
  p_title        TEXT,
  p_reason       TEXT,
  p_href         TEXT,
  p_payload      JSONB DEFAULT '{}'::jsonb,
  p_bundle_key   TEXT  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id            UUID;
  v_existing_rank INT;
BEGIN
  -- App-Aufrufer dürfen nur für die eigene Agentur schreiben; service_role ist frei.
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
     AND p_agency_id IS DISTINCT FROM public.current_agency_id() THEN
    RAISE EXCEPTION 'notification agency mismatch';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notification_mutes m
    WHERE m.user_id = p_recipient_id
      AND (
        (m.scope_type = 'VORGANG' AND m.scope_key = p_vorgang_key)
        OR (m.scope_type = 'CREATOR' AND p_creator_id IS NOT NULL
            AND m.scope_key = 'creator:' || p_creator_id::text)
      )
  ) THEN
    RETURN NULL;
  END IF;

  IF p_bundle_key IS NOT NULL THEN
    UPDATE public.notifications
       SET type = p_type, severity = p_severity, subject_type = p_subject_type,
           subject_id = p_subject_id, creator_id = p_creator_id,
           title = p_title, reason = p_reason, href = p_href,
           payload = p_payload, updated_at = now(), read_at = NULL
     WHERE bundle_key = p_bundle_key AND status = 'OPEN'
     RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  SELECT id, public.notif_severity_rank(severity)
    INTO v_id, v_existing_rank
    FROM public.notifications
   WHERE dedup_key = p_vorgang_key AND status = 'OPEN'
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.notifications
       SET type = p_type,
           severity = CASE
             WHEN public.notif_severity_rank(p_severity) >= v_existing_rank
               THEN p_severity ELSE severity END,
           subject_type = p_subject_type, subject_id = p_subject_id,
           creator_id = p_creator_id, title = p_title, reason = p_reason,
           href = p_href, payload = p_payload, bundle_key = p_bundle_key,
           updated_at = now(), read_at = NULL
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.notifications (
    agency_id, recipient_id, type, severity, subject_type, subject_id,
    vorgang_key, creator_id, dedup_key, bundle_key, title, reason, href, payload
  ) VALUES (
    p_agency_id, p_recipient_id, p_type, p_severity, p_subject_type, p_subject_id,
    p_vorgang_key, p_creator_id, p_vorgang_key, p_bundle_key, p_title, p_reason, p_href, p_payload
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.emit_notification(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_notification(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT
) TO authenticated, service_role;

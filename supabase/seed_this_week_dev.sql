-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Termine (Events + Deal-Deadlines + Todos) für die aktuelle Woche –
-- Lumen Talent
-- Agency-ID: 00000000-0000-0000-0000-000000000001
-- Alle Zeitpunkte sind relativ zu now(), daher jederzeit ohne Anpassung erneut
-- ausführbar, um "diese Woche" für die TermineCard (Dashboard + Creator-
-- Übersicht) mit frischen Testdaten zu befüllen.
-- Run: psql $DATABASE_URL -f supabase/seed_this_week_dev.sql
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_agency uuid := '00000000-0000-0000-0000-000000000001';

  v_aisha  uuid;
  v_ana    uuid;
  v_anya   uuid;
  v_lena   uuid;
  v_samuel uuid;

  v_rarebeauty uuid;
  v_hm         uuid;
  v_gymshark   uuid;
  v_lufthansa  uuid;

  -- Montag dieser Woche, 00:00
  v_monday timestamptz := date_trunc('week', now());
BEGIN

  SELECT id INTO v_aisha  FROM public.creators WHERE agency_id = v_agency AND full_name = 'Aisha Laurent' LIMIT 1;
  SELECT id INTO v_ana    FROM public.creators WHERE agency_id = v_agency AND full_name = 'Ana Vidal'     LIMIT 1;
  SELECT id INTO v_anya   FROM public.creators WHERE agency_id = v_agency AND full_name = 'Anya Klein'    LIMIT 1;
  SELECT id INTO v_lena   FROM public.creators WHERE agency_id = v_agency AND full_name = 'Lena'          LIMIT 1;
  SELECT id INTO v_samuel FROM public.creators WHERE agency_id = v_agency AND full_name = 'Samuel Reinholz' LIMIT 1;

  SELECT id INTO v_rarebeauty FROM public.brands WHERE agency_id = v_agency AND short_code = 'RBY' LIMIT 1;
  SELECT id INTO v_hm         FROM public.brands WHERE agency_id = v_agency AND short_code = 'HM'  LIMIT 1;
  SELECT id INTO v_gymshark   FROM public.brands WHERE agency_id = v_agency AND short_code = 'GYM' LIMIT 1;
  SELECT id INTO v_lufthansa  FROM public.brands WHERE agency_id = v_agency AND short_code = 'LFH' LIMIT 1;

  -- Cleanup vorheriger Läufe dieses Seeds
  DELETE FROM public.events WHERE agency_id = v_agency AND title LIKE '[DEV-WEEK]%';
  DELETE FROM public.deals  WHERE agency_id = v_agency AND title LIKE '[DEV-WEEK]%';
  DELETE FROM public.todos  WHERE agency_id = v_agency AND title LIKE '[DEV-WEEK]%';

  -- ── Events ───────────────────────────────────────────────────────────────
  INSERT INTO public.events
    (agency_id, creator_id, title, type, start_at, end_at, location, notes, attendee_ids)
  VALUES
    (v_agency, v_aisha,
     '[DEV-WEEK] Rare Beauty – Spring Shoot', 'shoot'::public.event_type,
     v_monday + interval '10 hours', v_monday + interval '15 hours',
     'Studio Berlin Mitte', 'Produktfotos + Reel-Content.', '{}'::uuid[]),

    (v_agency, NULL,
     '[DEV-WEEK] Weekly Team-Sync', 'internal'::public.event_type,
     v_monday + interval '9 hours', v_monday + interval '9 hours 30 minutes',
     NULL, 'Dealstatus & offene Anfragen.', '{}'::uuid[]),

    (v_agency, v_ana,
     '[DEV-WEEK] Briefing Call H&M', 'brand'::public.event_type,
     v_monday + interval '1 day 14 hours', v_monday + interval '1 day 15 hours',
     'Zoom', 'Technisches Briefing für die Herbstkollektion.', '{}'::uuid[]),

    (v_agency, v_anya,
     '[DEV-WEEK] Reel Launch Zalando', 'posting'::public.event_type,
     v_monday + interval '2 days 17 hours', NULL,
     NULL, 'Reel + Stories gleichzeitig live schalten.', '{}'::uuid[]),

    (v_agency, v_lena,
     '[DEV-WEEK] Anreise Lissabon – Booking.com', 'travel'::public.event_type,
     v_monday + interval '3 days 8 hours', v_monday + interval '3 days 20 hours',
     'Lissabon, Portugal', 'Flug + 2 Nächte Hotel.', '{}'::uuid[]),

    (v_agency, v_samuel,
     '[DEV-WEEK] Nike – Video Freigabe', 'deadline'::public.event_type,
     v_monday + interval '4 days 18 hours', NULL,
     NULL, 'Letzter Tag für Brand-Feedback.', '{}'::uuid[]);

  -- ── Deal-Deadlines ───────────────────────────────────────────────────────
  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, deadline, campaign_type, deliverables)
  VALUES
    (v_agency, v_aisha, v_rarebeauty,
     '[DEV-WEEK] Story-Serie Herbst', 3500, 'production', 'med', 'instagram',
     (v_monday + interval '2 days')::date, 'Brand Awareness', '["Story-Serie", "3 Frames"]'::jsonb),

    (v_agency, v_ana, v_gymshark,
     '[DEV-WEEK] Spring Drop Reel', 2500, 'approval', 'high', 'instagram',
     (v_monday + interval '4 days')::date, 'Product Launch', '["1x Reel", "3x Stories"]'::jsonb),

    (v_agency, v_anya, v_lufthansa,
     '[DEV-WEEK] Travel Campaign Q4', 2500, 'production', 'med', 'youtube',
     (v_monday + interval '5 days')::date, 'Travel Content', '["1x YouTube Video"]'::jsonb);

  -- ── Todos ────────────────────────────────────────────────────────────────
  INSERT INTO public.todos
    (agency_id, title, due_date, assignee_id, priority)
  VALUES
    (v_agency, '[DEV-WEEK] Vertragsentwurf gegenlesen', (v_monday + interval '1 day')::date, v_aisha, 'hoch'),
    (v_agency, '[DEV-WEEK] Rechnungsfreigabe Gymshark', (v_monday + interval '3 days')::date, v_ana, 'mittel'),
    (v_agency, '[DEV-WEEK] Moodboard an Lufthansa senden', (v_monday + interval '4 days')::date, v_anya, 'niedrig'),
    (v_agency, '[DEV-WEEK] Reisekosten einreichen', (v_monday + interval '5 days')::date, v_lena, 'mittel');

  RAISE NOTICE 'Seed abgeschlossen: 6 Events + 3 Deal-Deadlines + 4 Todos für diese Woche (Lumen Talent).';
END $$;

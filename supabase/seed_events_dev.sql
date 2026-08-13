-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Events – Spark Creative Agency
-- Agency-ID: aaaaaaaa-0000-0000-0000-000000000003
-- Run: psql $DATABASE_URL -f supabase/seed_events_dev.sql
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_agency uuid := 'aaaaaaaa-0000-0000-0000-000000000003';

  v_mia   uuid;
  v_felix uuid;
  v_sara  uuid;
  v_noah  uuid;

  v_now   timestamptz := date_trunc('day', now());
BEGIN

  -- Creator-IDs anhand Handle nachschlagen
  SELECT id INTO v_mia   FROM public.creators WHERE agency_id = v_agency AND handle = '@miaschreiber'    LIMIT 1;
  SELECT id INTO v_felix FROM public.creators WHERE agency_id = v_agency AND handle = '@felixrunner'     LIMIT 1;
  SELECT id INTO v_sara  FROM public.creators WHERE agency_id = v_agency AND handle = '@saraontheroadd'  LIMIT 1;
  SELECT id INTO v_noah  FROM public.creators WHERE agency_id = v_agency AND handle = '@noahtechreviews' LIMIT 1;

  -- Cleanup
  DELETE FROM public.events WHERE agency_id = v_agency;

  INSERT INTO public.events
    (agency_id, creator_id, title, type, start_at, end_at, location, notes, attendee_ids)
  VALUES

    -- ── Diese Woche ──────────────────────────────────────────────────────────

    (v_agency, v_mia,
     'Glossy Lab – Summer Glow Shoot',
     'shoot'::public.event_type,
     v_now + interval '1 day 10 hours',
     v_now + interval '1 day 17 hours',
     'Studio Berlin Mitte',
     'Produktfotos + Reel-Content für Summer Glow Kampagne. Stylist vor Ort.',
     '{}'::uuid[]),

    (v_agency, NULL,
     'Weekly Team-Sync',
     'internal'::public.event_type,
     v_now + interval '2 days 9 hours',
     v_now + interval '2 days 10 hours',
     NULL,
     'Dealstatus, offene Anfragen, Q3-Planung besprechen.',
     '{}'::uuid[]),

    (v_agency, v_sara,
     'Briefing-Call Arca Tech',
     'brand'::public.event_type,
     v_now + interval '2 days 14 hours',
     v_now + interval '2 days 15 hours',
     'Zoom',
     'Technisches Briefing für den Travel-Setup-Vlog. Lara König nimmt teil.',
     '{}'::uuid[]),

    (v_agency, v_felix,
     'Volt Energy – Video Freigabe Deadline',
     'deadline'::public.event_type,
     v_now + interval '3 days 18 hours',
     NULL,
     NULL,
     'Letzter Tag für Brand-Feedback auf das finale Video.',
     '{}'::uuid[]),

    (v_agency, v_noah,
     'Arca Hub Pro – Unboxing Shoot',
     'shoot'::public.event_type,
     v_now + interval '4 days 11 hours',
     v_now + interval '4 days 15 hours',
     'Home-Studio Köln',
     'Unboxing + 2 TikTok-Clips + ein YouTube Short.',
     '{}'::uuid[]),

    (v_agency, v_mia,
     'Glossy Lab – Draft Einreichung',
     'deadline'::public.event_type,
     v_now + interval '6 days 23 hours',
     NULL,
     NULL,
     'Reel-Entwurf bis Mitternacht an Nina Roth senden zur ersten Freigabe.',
     '{}'::uuid[]),

    -- ── Nächste Woche ─────────────────────────────────────────────────────────

    (v_agency, v_mia,
     'Solis Skincare – Content Day',
     'shoot'::public.event_type,
     v_now + interval '8 days 9 hours',
     v_now + interval '8 days 16 hours',
     'Studio Hamburg',
     'Morning-Routine Reel + 3 Story-Formate. Make-up Artist und Fotograf dabei.',
     '{}'::uuid[]),

    (v_agency, v_sara,
     'Anreise Lissabon – Arca Shooting',
     'travel'::public.event_type,
     v_now + interval '10 days 6 hours',
     v_now + interval '12 days 22 hours',
     'Lissabon, Portugal',
     'Flug LH435 + 2 Nächte Hotel Bairro Alto. Kosten vollständig von Arca übernommen.',
     '{}'::uuid[]),

    (v_agency, v_sara,
     'Arca Shooting – Lissabon',
     'shoot'::public.event_type,
     v_now + interval '11 days 9 hours',
     v_now + interval '11 days 18 hours',
     'Lissabon, Portugal',
     'Outdoor-Shoot für den Travel-Setup-Vlog. 2 Stunden Drohnenaufnahmen geplant.',
     '{}'::uuid[]),

    (v_agency, v_felix,
     'Forma Sport – Launch Event',
     'brand'::public.event_type,
     v_now + interval '9 days 18 hours',
     v_now + interval '9 days 21 hours',
     'Forma Flagship Store München',
     'Produktlaunch neue Laufschuh-Kollektion. Felix hält Live-Session für Follower.',
     '{}'::uuid[]),

    -- ── Übernächste Woche / darüber hinaus ───────────────────────────────────

    (v_agency, v_mia,
     'Solis Skincare – Posting Tag',
     'posting'::public.event_type,
     v_now + interval '14 days 12 hours',
     NULL,
     NULL,
     'Reel + 4 Stories gleichzeitig live schalten. Swipe-Up-Link zu solis.de/summer.',
     '{}'::uuid[]),

    (v_agency, v_noah,
     'Arca Hub Pro – YouTube Review live',
     'posting'::public.event_type,
     v_now + interval '15 days 17 hours',
     NULL,
     NULL,
     'Video live schalten um 17 Uhr. Premiere-Format aktivieren.',
     '{}'::uuid[]),

    (v_agency, NULL,
     'Q3 Performance Review',
     'internal'::public.event_type,
     v_now + interval '18 days 10 hours',
     v_now + interval '18 days 12 hours',
     NULL,
     'Quartals-Review mit allen Deal-KPIs, Umsatzübersicht und Creator-Ratings.',
     '{}'::uuid[]),

    (v_agency, v_felix,
     'Verde Foods – Rezept-Shooting',
     'shoot'::public.event_type,
     v_now + interval '20 days 10 hours',
     v_now + interval '20 days 15 hours',
     'Food-Studio Frankfurt',
     '3 Sommer-Rezepte mit Verde-Produkten. Professioneller Koch vor Ort.',
     '{}'::uuid[]),

    (v_agency, v_sara,
     'Arca – Finaler Cut Deadline',
     'deadline'::public.event_type,
     v_now + interval '22 days 20 hours',
     NULL,
     NULL,
     'Finaler Videoschnitt + Thumbnail an Arca zur Abnahme einreichen.',
     '{}'::uuid[]),

    -- ── Vergangene Events (für die Listenansicht) ─────────────────────────────

    (v_agency, v_sara,
     'Verde Kampagne – Live auf Instagram',
     'posting'::public.event_type,
     v_now - interval '8 days 12 hours',
     NULL,
     NULL,
     'Reel + Stories gleichzeitig veröffentlicht. Reach: 142k in 24h.',
     '{}'::uuid[]),

    (v_agency, v_mia,
     'Glossy Lab – Kick-off Call',
     'brand'::public.event_type,
     v_now - interval '14 days 15 hours',
     v_now - interval '14 days 16 hours',
     'Zoom',
     'Erstes Briefing mit Nina Roth. Kampagnenstruktur und Deadlines festgelegt.',
     '{}'::uuid[]),

    (v_agency, v_noah,
     'Arca – Produkt-Briefing',
     'brand'::public.event_type,
     v_now - interval '10 days 11 hours',
     v_now - interval '10 days 12 hours',
     'Zoom',
     'Technische Deep-Dive Session zu Hub Pro Features mit Lara König.',
     '{}'::uuid[]);

END $$;

-- ─────────────────────────────────────────────────────────────
-- Dev Seed: Fake Events für Samuel Reinholz
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_creator_id  uuid;
  v_agency_id   uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Creator ID aus dem bekannten Account holen
  SELECT creator_id INTO v_creator_id
  FROM public.creator_accounts
  WHERE id = '59f903c1-1c40-4a14-81e2-83d90ae1b5bc';

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'Samuel Reinholz creator_id nicht gefunden – Events werden übersprungen.';
    RETURN;
  END IF;

  -- Alte Dev-Events für Samuel löschen
  DELETE FROM public.events
  WHERE creator_id = v_creator_id
    AND agency_id  = v_agency_id
    AND title LIKE '[DEV]%';

  -- Events einfügen
  INSERT INTO public.events (agency_id, creator_id, title, type, start_at, end_at, location) VALUES

  -- Vergangene Events
  (v_agency_id, v_creator_id, '[DEV] Shoot – Adidas Kampagne',     'shoot',    now() - interval '18 days',                    now() - interval '18 days' + interval '3 hours', 'Studio Berlin Mitte'),
  (v_agency_id, v_creator_id, '[DEV] Posting Deadline – Nike Reel', 'deadline', now() - interval '10 days',                    now() - interval '10 days' + interval '1 hour',  NULL),
  (v_agency_id, v_creator_id, '[DEV] Brand Call – Red Bull',        'brand',    now() - interval '5 days' + interval '14 hours',now() - interval '5 days' + interval '15 hours', 'Zoom'),

  -- Diese Woche
  (v_agency_id, v_creator_id, '[DEV] Content Review – Q3 Plan',     'internal', now() + interval '1 day'  + interval '10 hours',now() + interval '1 day'  + interval '11 hours', 'Büro Hamburg'),
  (v_agency_id, v_creator_id, '[DEV] Shoot – Samsung Galaxy S25',   'shoot',    now() + interval '3 days' + interval '9 hours', now() + interval '3 days' + interval '17 hours','Studio München'),

  -- Nächste Woche
  (v_agency_id, v_creator_id, '[DEV] Reise – Creator Summit Wien',  'travel',   now() + interval '8 days' + interval '7 hours', now() + interval '10 days' + interval '20 hours','Wien, Austria'),
  (v_agency_id, v_creator_id, '[DEV] Posting – Dyson Collab',       'posting',  now() + interval '9 days' + interval '12 hours',now() + interval '9 days' + interval '13 hours', NULL),
  (v_agency_id, v_creator_id, '[DEV] Brand Meeting – Spotify',      'brand',    now() + interval '11 days'+ interval '15 hours',now() + interval '11 days'+ interval '16 hours','Spotify HQ Berlin'),

  -- Übernächste Woche
  (v_agency_id, v_creator_id, '[DEV] Shoot – H&M Winter Kollektion','shoot',    now() + interval '15 days'+ interval '9 hours', now() + interval '15 days'+ interval '18 hours','Location TBD'),
  (v_agency_id, v_creator_id, '[DEV] Posting Deadline – H&M Reel',  'deadline', now() + interval '17 days'+ interval '23 hours',now() + interval '17 days'+ interval '23 hours', NULL);

  RAISE NOTICE 'Events für creator_id=% eingefügt.', v_creator_id;
END $$;


-- ─────────────────────────────────────────────────────────────
-- Dev Seed: Fake YouTube Metrics für UI-Entwicklung
-- Account: 59f903c1-1c40-4a14-81e2-83d90ae1b5bc (Samuel Reinholz / YouTube)
-- ─────────────────────────────────────────────────────────────

-- 1. Current Metrics überschreiben
INSERT INTO public.creator_account_metrics_current (
  creator_account_id,
  agency_id,
  audience,
  engagement_rate,
  views_30d,
  audience_growth_7d,
  audience_growth_30d,
  monthly_revenue,
  subscribers_gained_30d,
  subscribers_lost_30d,
  avg_view_duration_secs,
  watch_time_hours_30d,
  raw,
  synced_at
)
VALUES (
  '59f903c1-1c40-4a14-81e2-83d90ae1b5bc',
  '00000000-0000-0000-0000-000000000001',
  52400,           -- Abonnenten gesamt
  4.8,             -- Engagement Rate %
  487200,          -- Views letzte 30 Tage
  620,             -- Abo-Wachstum 7 Tage
  2100,            -- Abo-Wachstum 30 Tage
  3800,            -- MTD Revenue (in Cent oder €, je nach App-Logik)
  2400,            -- Abonnenten gewonnen (30d)
  300,             -- Abonnenten verloren (30d)
  248.5,           -- Durchschnittliche Viewdauer in Sekunden (4:08)
  2030.0,          -- Watch Time Stunden (30d)
  '{"totalViews": 3820000}'::jsonb,
  now()
)
ON CONFLICT (creator_account_id)
DO UPDATE SET
  audience               = EXCLUDED.audience,
  engagement_rate        = EXCLUDED.engagement_rate,
  views_30d              = EXCLUDED.views_30d,
  audience_growth_7d     = EXCLUDED.audience_growth_7d,
  audience_growth_30d    = EXCLUDED.audience_growth_30d,
  monthly_revenue        = EXCLUDED.monthly_revenue,
  subscribers_gained_30d = EXCLUDED.subscribers_gained_30d,
  subscribers_lost_30d   = EXCLUDED.subscribers_lost_30d,
  avg_view_duration_secs = EXCLUDED.avg_view_duration_secs,
  watch_time_hours_30d   = EXCLUDED.watch_time_hours_30d,
  raw                    = EXCLUDED.raw,
  synced_at              = EXCLUDED.synced_at;


-- 2. Daily Metrics: 30 Tage mit realistischer Kurve
-- Erst alte Dev-Daten löschen
DELETE FROM public.creator_account_metrics_daily
WHERE creator_account_id = '59f903c1-1c40-4a14-81e2-83d90ae1b5bc'
  AND date >= current_date - interval '35 days';

INSERT INTO public.creator_account_metrics_daily (
  creator_account_id,
  agency_id,
  platform,
  date,
  audience,
  engagement_rate,
  views,
  likes,
  comments,
  shares,
  audience_delta,
  raw_data
)
SELECT
  '59f903c1-1c40-4a14-81e2-83d90ae1b5bc',
  '00000000-0000-0000-0000-000000000001',
  'youtube',
  (current_date - interval '1 day' * s.i)::date AS date,

  -- Abonnenten: wächst von ~50300 auf ~52400 über 30 Tage
  (50300 + (30 - s.i) * 70 + (random() * 40 - 20)::int)::int AS audience,

  -- Engagement Rate: 3.8 – 6.2% mit Schwankungen
  round((3.8 + random() * 2.4)::numeric, 2) AS engagement_rate,

  -- Views: Wochenmuster (Wochenende schwächer), ca. 12k-22k/Tag
  CASE
    WHEN extract(dow FROM (current_date - interval '1 day' * s.i)) IN (0, 6)
    THEN (11000 + (random() * 5000)::int)
    ELSE (14000 + (random() * 8000)::int)
  END AS views,

  -- Likes: ~4% der Views
  ((14000 + (random() * 6000)::int) * 0.04)::int AS likes,

  -- Comments: ~0.6% der Views
  ((14000 + (random() * 6000)::int) * 0.006)::int AS comments,

  -- Shares: ~0.8% der Views
  ((14000 + (random() * 6000)::int) * 0.008)::int AS shares,

  -- Tägliches Abo-Delta: +50 bis +120, gelegentlich negativ
  (60 + (random() * 60 - 10)::int)::int AS audience_delta,

  '{}'::jsonb AS raw_data

FROM generate_series(0, 29) AS s(i);

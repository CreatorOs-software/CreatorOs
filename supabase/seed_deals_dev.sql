-- ─────────────────────────────────────────────────────────────
-- Dev Seed: Brands + Deals + Invoices für Samuel Reinholz
-- Spiegelt das Deals-Tab-Design wider (Laufend / Pipeline / Alt)
-- Ausführen via: supabase db reset (oder manuell im SQL-Editor)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_creator_id  uuid;
  v_agency_id   uuid := '00000000-0000-0000-0000-000000000001';

  -- Brands
  v_loreal      uuid;
  v_garnier     uuid;
  v_booking     uuid;
  v_nike        uuid;
  v_rarebeauty  uuid;
  v_zalando     uuid;
  v_ordinary    uuid;
  v_lufthansa   uuid;
  v_hm          uuid;
  v_gymshark    uuid;
  v_nespresso   uuid;
  v_adidas      uuid;
  v_samsung     uuid;
  v_redbull     uuid;
  v_puma        uuid;

  -- Deal IDs (für Invoice-FK)
  v_deal_travel uuid;
  v_deal_sommer uuid;

BEGIN
  -- ── Creator-ID via bekannten Account holen ─────────────────
  SELECT creator_id INTO v_creator_id
  FROM public.creator_accounts
  WHERE id = '59f903c1-1c40-4a14-81e2-83d90ae1b5bc';

  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'Creator nicht gefunden – Seed wird übersprungen.';
    RETURN;
  END IF;

  RAISE NOTICE 'Creator-ID: %', v_creator_id;

  -- ── Alte Dev-Daten löschen ─────────────────────────────────
  DELETE FROM public.invoices
  WHERE agency_id = v_agency_id
    AND number LIKE '[DEV]%';

  DELETE FROM public.deals
  WHERE creator_id = v_creator_id
    AND agency_id  = v_agency_id
    AND title LIKE '[DEV]%';

  -- ── Brands upsert ──────────────────────────────────────────
  INSERT INTO public.brands (agency_id, company_name, short_code, color, industry, contact_name, contact_email)
  VALUES
    (v_agency_id, 'L''Oreal Paris',  'LOR', 'oklch(0.60 0.18 340)', 'Beauty',   'Marie Dupont',    'marie@loreal.com'),
    (v_agency_id, 'Garnier',         'GRN', 'oklch(0.60 0.18 145)', 'Beauty',   'Thomas Müller',   'thomas@garnier.com'),
    (v_agency_id, 'Booking.com',     'BKG', 'oklch(0.55 0.18 245)', 'Travel',   'Sarah Klein',     'sarah@booking.com'),
    (v_agency_id, 'Nike',            'NKE', 'oklch(0.50 0.00 0)',   'Sports',   'Alex Johnson',    'alex@nike.com'),
    (v_agency_id, 'Rare Beauty',     'RBY', 'oklch(0.65 0.16 350)', 'Beauty',   'Emma Wilson',     'emma@rarebeauty.com'),
    (v_agency_id, 'Zalando',         'ZAL', 'oklch(0.62 0.18 25)',  'Fashion',  'Lisa Schneider',  'lisa@zalando.com'),
    (v_agency_id, 'The Ordinary',    'TOR', 'oklch(0.50 0.02 0)',   'Skincare', 'Dr. Kim Park',    'kim@theordinary.com'),
    (v_agency_id, 'Lufthansa',       'LFH', 'oklch(0.55 0.18 230)', 'Travel',   'Hans Weber',      'hans@lufthansa.com'),
    (v_agency_id, 'H&M',             'HM',  'oklch(0.55 0.18 25)',  'Fashion',  'Anna Berg',       'anna@hm.com'),
    (v_agency_id, 'Gymshark',        'GYM', 'oklch(0.40 0.00 0)',   'Sports',   'Ben Clark',       'ben@gymshark.com'),
    (v_agency_id, 'Nespresso',       'NSP', 'oklch(0.45 0.08 60)',  'Food',     'Claude Martin',   'claude@nespresso.com'),
    (v_agency_id, 'Adidas',          'ADS', 'oklch(0.30 0.00 0)',   'Sports',   'Kai Fischer',     'kai@adidas.com'),
    (v_agency_id, 'Samsung',         'SAM', 'oklch(0.50 0.18 230)', 'Tech',     'Jin-ho Lee',      'jinho@samsung.com'),
    (v_agency_id, 'Red Bull',        'RBL', 'oklch(0.50 0.20 30)',  'Beverages','Marco Rossi',     'marco@redbull.com'),
    (v_agency_id, 'Puma',            'PMA', 'oklch(0.45 0.00 0)',   'Sports',   'Julia Braun',     'julia@puma.com')
  ON CONFLICT DO NOTHING;

  -- IDs laden
  SELECT id INTO v_loreal     FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'LOR' LIMIT 1;
  SELECT id INTO v_garnier    FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'GRN' LIMIT 1;
  SELECT id INTO v_booking    FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'BKG' LIMIT 1;
  SELECT id INTO v_nike       FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'NKE' LIMIT 1;
  SELECT id INTO v_rarebeauty FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'RBY' LIMIT 1;
  SELECT id INTO v_zalando    FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'ZAL' LIMIT 1;
  SELECT id INTO v_ordinary   FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'TOR' LIMIT 1;
  SELECT id INTO v_lufthansa  FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'LFH' LIMIT 1;
  SELECT id INTO v_hm         FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'HM'  LIMIT 1;
  SELECT id INTO v_gymshark   FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'GYM' LIMIT 1;
  SELECT id INTO v_nespresso  FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'NSP' LIMIT 1;
  SELECT id INTO v_adidas     FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'ADS' LIMIT 1;
  SELECT id INTO v_samsung    FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'SAM' LIMIT 1;
  SELECT id INTO v_redbull    FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'RBL' LIMIT 1;
  SELECT id INTO v_puma       FROM public.brands WHERE agency_id = v_agency_id AND short_code = 'PMA' LIMIT 1;

  -- ══════════════════════════════════════════════════════════════
  -- LAUFENDE DEALS (status: confirmed / production / approval / scheduled / posted)
  -- Ziel: 3 Deals · €13.500 Volumen
  -- ══════════════════════════════════════════════════════════════

  -- 1. Sommerkampagne – L'Oreal Paris – Instagram – approval – €4.500
  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, deadline, campaign_type, deliverables)
  VALUES
    (v_agency_id, v_creator_id, v_loreal,   '[DEV] Sommerkampagne',     4500, 'approval',    'high', 'instagram', current_date + 6,  'Brand Campaign',   ARRAY['1x Reel', '3x Stories', '1x Feed Post'])
  RETURNING id INTO v_deal_sommer;

  -- 2. Produktlaunch Serum – Garnier – TikTok – production – €2.800
  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, deadline, campaign_type, deliverables)
  VALUES
    (v_agency_id, v_creator_id, v_garnier,  '[DEV] Produktlaunch Serum', 2800, 'production',  'high', 'tiktok',    current_date + 2,  'Product Launch',   ARRAY['2x TikTok Videos', '5x Stories']);

  -- 3. Travel Feature – Booking.com – YouTube – production – €6.200
  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, deadline, campaign_type, deliverables)
  VALUES
    (v_agency_id, v_creator_id, v_booking,  '[DEV] Travel Feature',      6200, 'production',  'med',  'youtube',   current_date + 5,  'Travel Content',   ARRAY['1x YouTube Video', '2x YouTube Shorts'])
  RETURNING id INTO v_deal_travel;

  -- ══════════════════════════════════════════════════════════════
  -- PIPELINE (status: incoming / evaluating / negotiation)
  -- Ziel: 5 Deals · €22.500 · 2 in Verhandlung
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, campaign_type, deliverables, created_at)
  VALUES
    -- incoming
    (v_agency_id, v_creator_id, v_nike,      '[DEV] Running Series',       6000, 'incoming',    'high', 'youtube',   'Product Review',   ARRAY['1 Reel (Running)'],             now() - interval '4 days'),
    (v_agency_id, v_creator_id, v_rarebeauty,'[DEV] Story-Serie Herbst',   3500, 'incoming',    'med',  'instagram', 'Brand Awareness',  ARRAY['Story-Serie', '3 Frames'],      now() - interval '2 hours'),
    -- negotiation (2)
    (v_agency_id, v_creator_id, v_zalando,   '[DEV] Herbstkollektion',     8000, 'negotiation', 'high', 'instagram', 'Fashion Campaign', ARRAY['Herbstkollektion', '2 Reels'],  now() - interval '1 day'),
    (v_agency_id, v_creator_id, v_lufthansa, '[DEV] Travel Campaign Q4',   2500, 'negotiation', 'med',  'youtube',   'Travel Content',   ARRAY['1x YouTube Video'],             now() - interval '5 days'),
    -- evaluating
    (v_agency_id, v_creator_id, v_ordinary,  '[DEV] AHA BHA Toner Launch', 2500, 'evaluating',  'low',  'tiktok',    'Product Launch',   ARRAY['3x TikTok', 'Reviews'],         now() - interval '3 days');

  -- ══════════════════════════════════════════════════════════════
  -- ABGESCHLOSSEN (status: invoiced / paid)
  -- Ziel: 12 Deals · €38.400 · ab Jan 2026
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.deals
    (agency_id, creator_id, brand_id, title, budget, status, priority, platform, deadline, campaign_type, deliverables, created_at)
  VALUES
    (v_agency_id, v_creator_id, v_hm,       '[DEV] H&M Winter Kollektion',    3200, 'paid',     'med',  'instagram', '2026-03-10', 'Fashion Campaign',  ARRAY['2x Reels', '4x Stories'],    '2026-01-15 10:00:00+00'),
    (v_agency_id, v_creator_id, v_gymshark, '[DEV] Gymshark Spring Drop',      2500, 'paid',     'med',  'instagram', '2026-03-25', 'Product Launch',    ARRAY['1x Reel', '3x Stories'],     '2026-01-28 10:00:00+00'),
    (v_agency_id, v_creator_id, v_nespresso,'[DEV] Nespresso Morning Ritual',  1800, 'paid',     'low',  'youtube',   '2026-02-14', 'Integration',       ARRAY['1x YouTube Video'],          '2026-02-01 10:00:00+00'),
    (v_agency_id, v_creator_id, v_adidas,   '[DEV] Adidas Q1 Campaign',        4500, 'paid',     'high', 'youtube',   '2026-03-01', 'Brand Campaign',    ARRAY['1x YouTube Video', '2x Shorts'],'2026-02-10 10:00:00+00'),
    (v_agency_id, v_creator_id, v_samsung,  '[DEV] Samsung Galaxy S25 Review', 6200, 'paid',     'high', 'youtube',   '2026-03-15', 'Tech Review',       ARRAY['1x YouTube Video'],          '2026-02-20 10:00:00+00'),
    (v_agency_id, v_creator_id, v_redbull,  '[DEV] Red Bull Creator Camp',     3800, 'paid',     'med',  'youtube',   '2026-04-10', 'Event Coverage',    ARRAY['2x Vlogs', '5x Stories'],    '2026-03-05 10:00:00+00'),
    (v_agency_id, v_creator_id, v_loreal,   '[DEV] L''Oreal Spring Look',      1800, 'paid',     'med',  'instagram', '2026-04-20', 'Beauty Campaign',   ARRAY['1x Reel', '2x Stories'],     '2026-03-18 10:00:00+00'),
    (v_agency_id, v_creator_id, v_puma,     '[DEV] Puma Streetwear Drop',      3000, 'paid',     'med',  'tiktok',    '2026-05-05', 'Fashion Campaign',  ARRAY['2x TikTok'],                 '2026-04-01 10:00:00+00'),
    (v_agency_id, v_creator_id, v_zalando,  '[DEV] Zalando Summer Sale',       2800, 'paid',     'low',  'instagram', '2026-05-20', 'Fashion Campaign',  ARRAY['1x Reel', '2x Stories'],     '2026-04-15 10:00:00+00'),
    (v_agency_id, v_creator_id, v_nike,     '[DEV] Nike Running Q2',           4500, 'paid',     'high', 'youtube',   '2026-06-10', 'Product Campaign',  ARRAY['1x YouTube Video', '1x Short'],'2026-05-01 10:00:00+00'),
    (v_agency_id, v_creator_id, v_garnier,  '[DEV] Garnier Fructis Launch',    1800, 'invoiced', 'med',  'tiktok',    '2026-06-25', 'Product Launch',    ARRAY['3x TikTok'],                 '2026-05-20 10:00:00+00'),
    (v_agency_id, v_creator_id, v_ordinary, '[DEV] The Ordinary Retinol',      2500, 'invoiced', 'low',  'youtube',   '2026-07-05', 'Skincare Review',   ARRAY['1x YouTube Video'],          '2026-06-01 10:00:00+00');

  -- ══════════════════════════════════════════════════════════════
  -- INVOICES
  -- ══════════════════════════════════════════════════════════════

  -- Überfällige Rechnung (€4.500 – Sommerkampagne L'Oreal) → Warning-Banner
  INSERT INTO public.invoices (agency_id, creator_id, brand_id, deal_id, number, amount, status, issued_at, due_date)
  VALUES
    (v_agency_id, v_creator_id, v_loreal,  v_deal_sommer, '[DEV]#2026-048', 4500, 'overdue',
     (current_date - interval '35 days')::date, (current_date - interval '5 days')::date);

  -- Erkannte Rechnung (€3.100 – Travel Feature Booking.com) → erkannt aber noch nicht bestätigt
  INSERT INTO public.invoices (agency_id, creator_id, brand_id, deal_id, number, amount, status, issued_at, due_date)
  VALUES
    (v_agency_id, v_creator_id, v_booking, v_deal_travel, '[DEV]#2026-052', 3100, 'sent',
     (current_date - interval '5 days')::date, (current_date + interval '25 days')::date);

  RAISE NOTICE 'Seed abgeschlossen für creator_id=%', v_creator_id;
  RAISE NOTICE 'Laufende Deals: 3 (€13.500), Pipeline: 5 (€22.500), Abgeschlossen: 12 (€38.400)';
END $$;
